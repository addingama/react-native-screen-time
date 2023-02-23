import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-screen-time' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const ScreenTime = NativeModules.ScreenTime
  ? NativeModules.ScreenTime
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * UsageData type that represent app usages
 */
export type UsageData = {
  packageName: string;
  totalTimeInForeground: number;
  totalTimeVisible?: number;
  lastTimeUsed?: number;
  duration?: string;
};

type GetUsageStatsParams = {
  startTime: number;
  endTime: number;
};

/**
 * [Android] Function to open Usage Settings screen on the device so that user can enable the permission for the app.
 *
 * @returns void
 */
export function openUsageSettings(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return ScreenTime.openUsageSettings();
  }

  return new Promise((resolve) => resolve(false));
}

/**
 * [Android] Function to get Usage Settings grant status.
 *
 * @returns void
 */
export function getGrantStatus(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return ScreenTime.getGrantStatus();
  }

  return new Promise((resolve) => resolve(false));
}

/**
 * [Android] Function to get Usage Settings grant status.
 *
 * The data is sorted by totalTimeInForeground descending
 * @param {GetUsageStatsParams} params
 * @param {number} params.startTime - Start time in miliseconds
 * @param {number} params.endTime - End time in miliseconds
 * @returns {Promise<UsageData[]>} - Array of usage data
 */
export async function getUsageStats(
  params: GetUsageStatsParams
): Promise<UsageData[]> {
  if (Platform.OS === 'android') {
    const result: UsageData[] = await ScreenTime.getUsageStats(params);

    // There are possibility for the duplicate package name, so it's better to combine the usage time
    const packageNames = [...new Set(result.map((item) => item.packageName))];

    const combinedTimes: UsageData[] = [];
    packageNames.forEach((packageName) => {
      const filtered = result.filter(
        (item) => item.packageName === packageName
      );
      let sum = 0;
      filtered.forEach((item) => (sum += item.totalTimeInForeground));
      combinedTimes.push({
        packageName,
        totalTimeInForeground: sum,
      });
    });
    // sort the data so that most used app will be the first
    combinedTimes.sort(
      (a, b) => b.totalTimeInForeground - a.totalTimeInForeground
    );
    return new Promise((resolve) => resolve(combinedTimes));
  }

  return new Promise((resolve) => resolve([]));
}
