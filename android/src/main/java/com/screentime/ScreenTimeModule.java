package com.screentime;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.module.annotations.ReactModule;

import static android.app.AppOpsManager.MODE_ALLOWED;
import static android.app.AppOpsManager.OPSTR_GET_USAGE_STATS;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;

@ReactModule(name = ScreenTimeModule.NAME)
public class ScreenTimeModule extends ReactContextBaseJavaModule {
  public static final String NAME = "ScreenTime";
  public Context context;

  public ScreenTimeModule(ReactApplicationContext reactContext) {
    super(reactContext);
    context = reactContext;
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }

  /**
   * check if the application info is still existing in the device / otherwise it's not possible to show app detail
   * @return true if application info is available
   */
  private boolean isAppInfoAvailable(UsageStats usageStats) {
    try {
      getReactApplicationContext().getPackageManager().getApplicationInfo(usageStats.getPackageName(), 0);
      return true;
    } catch (PackageManager.NameNotFoundException e) {
      return false;
    }
  }

  /**
   * check if PACKAGE_USAGE_STATS permission is allowed for this application
   * @return true if permission granted
   */
  private boolean getGrantStatus() {
    AppOpsManager appOps = (AppOpsManager) getReactApplicationContext()
      .getSystemService(Context.APP_OPS_SERVICE);

    int mode = appOps.checkOpNoThrow(OPSTR_GET_USAGE_STATS,
      android.os.Process.myUid(), getReactApplicationContext().getPackageName());

    if (mode == AppOpsManager.MODE_DEFAULT) {
      return (getReactApplicationContext().checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED);
    } else {
      return (mode == MODE_ALLOWED);
    }
  }

  /**
   * helper method to get string in format hh:mm:ss from miliseconds
   *
   * @param millis (application time in foreground)
   * @return string in format hh:mm:ss from miliseconds
   */
  private String getDurationBreakdown(long millis) {
    if (millis < 0) {
      throw new IllegalArgumentException("Duration must be greater than zero!");
    }

    long hours = TimeUnit.MILLISECONDS.toHours(millis);
    millis -= TimeUnit.HOURS.toMillis(hours);
    long minutes = TimeUnit.MILLISECONDS.toMinutes(millis);
    millis -= TimeUnit.MINUTES.toMillis(minutes);
    long seconds = TimeUnit.MILLISECONDS.toSeconds(millis);

    return (hours + " h " +  minutes + " m " + seconds + " s");
  }

  @ReactMethod
  public void getUsageStats(ReadableMap timeRange, Promise promise) {
    double startTime = timeRange.getDouble("startTime");
    double endTime = timeRange.getDouble("endTime");

    UsageStatsManager usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
    List<UsageStats> usageStatsList = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, (long) startTime, (long) endTime);

    WritableArray usageStatsArray = new WritableNativeArray();

    for (UsageStats usageStats : usageStatsList) {
      WritableMap appUsage = new WritableNativeMap();
      if (usageStats.getTotalTimeInForeground() > 0) {
        appUsage.putString("packageName", usageStats.getPackageName());
        appUsage.putDouble("totalTimeInForeground", usageStats.getTotalTimeInForeground());
        appUsage.putDouble("lastTimeUsed", usageStats.getLastTimeUsed());
        appUsage.putString("duration", getDurationBreakdown(usageStats.getTotalTimeInForeground()));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          appUsage.putDouble("totalTimeVisible", usageStats.getTotalTimeVisible());
        }
        usageStatsArray.pushMap(appUsage);
      }

    }

    promise.resolve(usageStatsArray);
  }



  @ReactMethod
  public void openUsageSettings(Promise promise) {
    Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    i.addFlags(Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT);
    context.startActivity(i);
    promise.resolve(true);
  }

  @ReactMethod
  public void getGrantStatus(Promise promise) {
    promise.resolve(getGrantStatus());
  }
}
