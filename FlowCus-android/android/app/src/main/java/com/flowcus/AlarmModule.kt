package com.flowcus

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlarmModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AlarmModule"

    @ReactMethod
    fun reconcileBlockAlarms(blocks: ReadableArray, promise: Promise) {
        try {
            val alarms = (0 until blocks.size()).map { index ->
                val item = blocks.getMap(index) ?: throw IllegalArgumentException("Invalid timetable reminder at index $index")
                TimetableAlarm(
                    id = item.getInt("id"),
                    title = item.getString("title") ?: "Upcoming Timetable Block",
                    message = item.getString("message") ?: "Your scheduled focus block starts soon.",
                    dayOfWeek = item.getInt("dayOfWeek"),
                    startTime = item.getString("startTime") ?: throw IllegalArgumentException("Missing startTime"),
                    reminderMinutes = if (item.hasKey("reminderMinutes")) item.getInt("reminderMinutes") else 5,
                    specificDate = if (item.hasKey("specificDate") && !item.isNull("specificDate")) item.getString("specificDate") else null,
                )
            }
            AlarmScheduler.reconcile(reactContext, alarms)
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("ALARM_RECONCILE_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        promise.resolve(AlarmScheduler.canScheduleExactAlarms(reactContext))
    }

    @ReactMethod
    fun openExactAlarmSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || AlarmScheduler.canScheduleExactAlarms(reactContext)) {
                promise.resolve(true)
                return
            }
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(false)
        } catch (error: Exception) {
            promise.reject("EXACT_ALARM_SETTINGS_ERROR", error.message, error)
        }
    }
}
