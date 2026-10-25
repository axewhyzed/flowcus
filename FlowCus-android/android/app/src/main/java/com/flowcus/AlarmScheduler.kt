package com.flowcus

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

internal fun normalizeAlarmSpecificDate(value: String?): String? =
    value?.takeIf { it.isNotBlank() && it != "null" }?.take(10)

data class TimetableAlarm(
    val id: Int,
    val title: String,
    val message: String,
    val dayOfWeek: Int,
    val startTime: String,
    val reminderMinutes: Int = 5,
    val specificDate: String? = null,
) {
    fun toJson() = JSONObject().apply {
        put("id", id)
        put("title", title)
        put("message", message)
        put("dayOfWeek", dayOfWeek)
        put("startTime", startTime)
        put("reminderMinutes", reminderMinutes)
        if (!specificDate.isNullOrBlank()) put("specificDate", specificDate.take(10))
    }

    companion object {
        fun fromJson(json: JSONObject) = TimetableAlarm(
            id = json.getInt("id"),
            title = json.optString("title", "Upcoming Timetable Block"),
            message = json.optString("message", "Your scheduled focus block starts soon."),
            dayOfWeek = json.getInt("dayOfWeek"),
            startTime = json.getString("startTime"),
            reminderMinutes = json.optInt("reminderMinutes", 5),
            specificDate = normalizeAlarmSpecificDate(json.optString("specificDate", "")),
        )
    }

    fun oneOffKey(): String = "${id}|${specificDate?.take(10)}|${startTime.take(5)}|${reminderMinutes.coerceIn(0, 24 * 60)}"
}

object AlarmScheduler {
    const val FOCUS_SESSION_ALARM_ID = 900000
    private const val PREFS = "flowcus_timetable_alarms"
    private const val SCHEDULES_KEY = "weekly_schedules"
    private const val CONSUMED_ONE_OFFS_KEY = "consumed_one_offs"

    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return manager.canScheduleExactAlarms()
    }

    fun scheduleFocusAlarm(context: Context, triggerAtMillis: Long, title: String): Boolean {
        if (!canScheduleExactAlarms(context)) return false
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("isFocusSession", true)
            putExtra("title", "Focus Session Complete!")
            putExtra("message", "Great job! Your focus on \"$title\" has completed.")
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            FOCUS_SESSION_ALARM_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag(),
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } else {
            manager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
        return true
    }

    fun cancelFocusAlarm(context: Context) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("isFocusSession", true)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            FOCUS_SESSION_ALARM_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag(),
        )
        manager.cancel(pendingIntent)
        pendingIntent.cancel()
    }

    fun schedule(context: Context, alarm: TimetableAlarm): Boolean {
        if (!canScheduleExactAlarms(context)) return false
        val triggerAt = nextTriggerTime(alarm, System.currentTimeMillis()) ?: return true
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = pendingIntent(context, alarm)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        } else {
            manager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        }
        return true
    }

    fun reconcile(context: Context, alarms: List<TimetableAlarm>) {
        if (alarms.isNotEmpty() && !canScheduleExactAlarms(context)) {
            throw SecurityException("Allow FlowCus to schedule exact alarms in Android Settings.")
        }
        val previous = load(context)
        previous.forEach { cancelAlarm(context, it.id) }

        val encoded = JSONArray()
        alarms.forEach { encoded.put(it.toJson()) }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(SCHEDULES_KEY, encoded.toString())
            .apply()

        alarms.forEach { alarm ->
            if (alarm.specificDate != null) {
                val consumed = loadConsumedOneOffs(context)
                val now = System.currentTimeMillis()
                if (!shouldScheduleOneOff(alarm, now, consumed)) {
                    if (alarm.oneOffKey() !in consumed) markOneOffConsumed(context, alarm)
                    return@forEach
                }
            }
            if (!schedule(context, alarm)) {
                throw SecurityException("Allow FlowCus to schedule exact alarms in Android Settings.")
            }
        }
    }

    fun find(context: Context, blockId: Int): TimetableAlarm? = load(context).firstOrNull { it.id == blockId }

    fun rescheduleSaved(context: Context) {
        if (!canScheduleExactAlarms(context)) return
        load(context).forEach { alarm ->
            if (alarm.specificDate != null) {
                val consumed = loadConsumedOneOffs(context)
                val now = System.currentTimeMillis()
                if (!shouldScheduleOneOff(alarm, now, consumed)) {
                    if (alarm.oneOffKey() !in consumed) markOneOffConsumed(context, alarm)
                    cancelAlarm(context, alarm.id)
                    return@forEach
                }
            }
            schedule(context, alarm)
        }
    }

    fun nextTriggerTime(alarm: TimetableAlarm, nowMillis: Long): Long? {
        val timeParts = alarm.startTime.split(":")
        require(timeParts.size >= 2) { "startTime must use HH:mm format" }
        val hour = timeParts[0].toInt()
        val minute = timeParts[1].toInt()
        require(hour in 0..23 && minute in 0..59)

        if (!alarm.specificDate.isNullOrBlank()) {
            val dateParts = alarm.specificDate.take(10).split("-")
            require(dateParts.size == 3) { "specificDate must use yyyy-MM-dd format" }
            val year = dateParts[0].toInt()
            val month = dateParts[1].toInt()
            val day = dateParts[2].toInt()
            val target = Calendar.getInstance().apply {
                timeInMillis = nowMillis
                set(Calendar.YEAR, year)
                set(Calendar.MONTH, month - 1)
                set(Calendar.DAY_OF_MONTH, day)
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                add(Calendar.MINUTE, -alarm.reminderMinutes.coerceIn(0, 24 * 60))
            }
            return target.timeInMillis.takeIf { it > nowMillis }
        }

        require(alarm.dayOfWeek in 0..6)

        val target = Calendar.getInstance().apply {
            timeInMillis = nowMillis
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            val requestedDay = alarm.dayOfWeek + 1 // Calendar uses Sunday=1; API uses Sunday=0.
            val offset = (requestedDay - get(Calendar.DAY_OF_WEEK) + 7) % 7
            add(Calendar.DAY_OF_YEAR, offset)
            add(Calendar.MINUTE, -alarm.reminderMinutes.coerceIn(0, 24 * 60))
            if (timeInMillis <= nowMillis) add(Calendar.DAY_OF_YEAR, 7)
        }
        return target.timeInMillis
    }

    fun shouldScheduleOneOff(alarm: TimetableAlarm, nowMillis: Long, consumedKeys: Set<String>): Boolean {
        return alarm.specificDate != null && alarm.oneOffKey() !in consumedKeys && nextTriggerTime(alarm, nowMillis) != null
    }

    fun markOneOffFired(context: Context, blockId: Int) {
        val alarm = find(context, blockId) ?: return
        if (alarm.specificDate != null) markOneOffConsumed(context, alarm)
    }

    private fun loadConsumedOneOffs(context: Context): Set<String> =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getStringSet(CONSUMED_ONE_OFFS_KEY, emptySet())
            ?.toSet() ?: emptySet()

    private fun markOneOffConsumed(context: Context, alarm: TimetableAlarm) {
        val consumed = loadConsumedOneOffs(context).toMutableSet()
        consumed.add(alarm.oneOffKey())
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(CONSUMED_ONE_OFFS_KEY, consumed)
            .apply()
    }

    private fun load(context: Context): List<TimetableAlarm> {
        val serialized = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(SCHEDULES_KEY, "[]") ?: "[]"
        return try {
            val array = JSONArray(serialized)
            (0 until array.length()).mapNotNull { index ->
                try { TimetableAlarm.fromJson(array.getJSONObject(index)) } catch (_: Exception) { null }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun cancelAlarm(context: Context, blockId: Int) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            blockId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag(),
        )
        manager.cancel(pendingIntent)
        pendingIntent.cancel()
    }

    private fun pendingIntent(context: Context, alarm: TimetableAlarm): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("blockId", alarm.id)
        }
        return PendingIntent.getBroadcast(
            context,
            alarm.id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag(),
        )
    }

    private fun immutableFlag(): Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
}
