package com.flowcus

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.app.usage.UsageStatsManager
import android.app.usage.UsageStats
import com.facebook.react.bridge.*

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
    fun getScreenTime(promise: Promise) {
        if (!hasUsageStatsPermission(reactContext)) {
            promise.reject("PERMISSION_DENIED", "Usage access permission not granted")
            return
        }

        // Your screen time reading logic here...
        val usageStatsManager = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val endTime = System.currentTimeMillis()
        val startTime = endTime - 1000 * 60 * 60 * 24 // Last 24 hours

        val usageStatsList: List<UsageStats> = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY, startTime, endTime
        )

        val usageMap = usageStatsList
            .filter { it.totalTimeInForeground > 0 }
            .associate {
                it.packageName to it.totalTimeInForeground / 1000  // in seconds
            }

        promise.resolve(Arguments.makeNativeMap(usageMap.mapValues { it.value.toDouble() }))
    }
}