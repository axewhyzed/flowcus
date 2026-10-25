package com.flowcus

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class AlarmReceiver : BroadcastReceiver() {

    companion object {
        const val CHANNEL_ID = "flowcus_timetable_channel"
        const val CHANNEL_NAME = "FlowCus Timetable Reminders"
        const val FOCUS_CHANNEL_ID = "flowcus_focus_channel"
        const val FOCUS_CHANNEL_NAME = "FlowCus Focus Reminders"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.getBooleanExtra("isFocusSession", false)) {
            handleFocusAlarm(context, intent)
            return
        }

        val blockId = intent.getIntExtra("blockId", 0)
        val alarm = AlarmScheduler.find(context, blockId) ?: return

        // Weekly blocks schedule their next occurrence. A dated one-off is
        // consumed permanently so time changes or reboot recovery cannot
        // turn it into a weekly reminder.
        if (alarm.specificDate != null) {
            AlarmScheduler.markOneOffFired(context, blockId)
        } else {
            runCatching { AlarmScheduler.schedule(context, alarm) }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Reminders before scheduled focus blocks begin"
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            blockId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0),
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(alarm.title)
            .setContentText(alarm.message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .build()

        notificationManager.notify(blockId, notification)
    }

    private fun handleFocusAlarm(context: Context, intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(FOCUS_CHANNEL_ID, FOCUS_CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Alerts and sound when a focus session timer completes"
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val title = intent.getStringExtra("title") ?: "Focus Session Complete!"
        val message = intent.getStringExtra("message") ?: "Great job! Your focus session has ended."

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            AlarmScheduler.FOCUS_SESSION_ALARM_ID,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0),
        )

        val notification = NotificationCompat.Builder(context, FOCUS_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .build()

        notificationManager.notify(AlarmScheduler.FOCUS_SESSION_ALARM_ID, notification)
    }
}
