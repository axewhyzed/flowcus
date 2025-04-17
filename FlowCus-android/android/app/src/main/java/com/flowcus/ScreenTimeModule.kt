package com.flowcus

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Build
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.util.*

class ScreenTimeModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ScreenTime"
    }

    private fun hasUsageStatsPermission(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(), context.packageName
            )
        } else {
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(), context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    @ReactMethod
    fun requestUsagePermission(promise: Promise) {
        if (!hasUsageStatsPermission(reactContext)) {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve("Permission requested")
        } else {
            promise.resolve("Permission already granted")
        }
    }

    @ReactMethod
    fun getDeviceTimezone(promise: Promise) {
        try {
            val timezoneId = java.util.TimeZone.getDefault().id
            promise.resolve(timezoneId)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get timezone: ${e.message}")
        }
    }

    @ReactMethod
    fun getScreenTime(promise: Promise) {
    if (!hasUsageStatsPermission(reactContext)) {
        promise.reject("PERMISSION_DENIED", "Usage access permission not granted")
        return
    }

    try {
        val usageStatsManager = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val packageManager = reactContext.packageManager

        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val startTime = calendar.timeInMillis
        val endTime = System.currentTimeMillis()

        // Get aggregated usage stats
        val usageStatsMap = usageStatsManager.queryAndAggregateUsageStats(startTime, endTime)
        val usageStatsList = usageStatsMap.values.toList()

        val result = Arguments.createArray()

        usageStatsList
            .filter { it.totalTimeInForeground > 0 }
            .sortedByDescending { it.totalTimeInForeground }
            .forEach { stats ->
                try {
                    val appData = Arguments.createMap()
                    appData.putString("packageName", stats.packageName)
                    appData.putDouble("usageTime", stats.totalTimeInForeground / 1000.0)
                    appData.putDouble("lastUsed", stats.lastTimeUsed.toDouble())
                    try {
                        val appInfo = packageManager.getApplicationInfo(stats.packageName, 0)
                        val appName = packageManager.getApplicationLabel(appInfo).toString()
                        val icon = packageManager.getApplicationIcon(stats.packageName)
                        val iconBase64 = drawableToBase64(icon)

                        appData.putString("appName", appName)
                        appData.putString("icon", iconBase64)
                    } catch (e: PackageManager.NameNotFoundException) {
                        // Leave appName and icon as null or set to "Unknown"
                        appData.putString("appName", stats.packageName)
                        appData.putString("icon", "") // or some placeholder
                    }
                    result.pushMap(appData)
                } catch (e: PackageManager.NameNotFoundException) {
                    // Skip apps that can't be found
                }
            }

        promise.resolve(result)
    } catch (e: Exception) {
        promise.reject("ERROR", "Failed to get screen time: ${e.message}")
    }
}

    private fun drawableToBase64(drawable: Drawable): String {
        val bitmap = if (drawable is android.graphics.drawable.BitmapDrawable) {
            drawable.bitmap
        } else {
            val width = drawable.intrinsicWidth.takeIf { it > 0 } ?: 1
            val height = drawable.intrinsicHeight.takeIf { it > 0 } ?: 1
            val bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888)
            val canvas = android.graphics.Canvas(bitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bitmap
        }

        val byteArrayOutputStream = ByteArrayOutputStream()
        bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream)
        val byteArray = byteArrayOutputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.NO_WRAP)
    }
}