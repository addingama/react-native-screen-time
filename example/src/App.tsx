import React, { useEffect, useRef, useState } from 'react';
import { startOfDay, endOfDay, intervalToDuration } from 'date-fns';

import {
  StyleSheet,
  View,
  Text,
  Button,
  AppState,
  Alert,
  FlatList,
} from 'react-native';
import {
  getGrantStatus,
  openUsageSettings,
  getUsageStats,
  UsageData,
} from 'react-native-screen-time';

export default function App() {
  const [granted, setGranted] = useState(false);
  const [usages, setUsages] = useState<UsageData[]>([]);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Re-check permission status when app on foreground again
        load();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    load();
    return () => {};
  }, []);

  const load = async () => {
    const result = await getGrantStatus();
    setGranted(result);
  };

  const requestPermission = () => {
    Alert.alert(
      'Grant Permission',
      'This action will open Usage Access Setting screen on your device. Please allow usage permission for this app.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: openUsageSettings,
        },
      ]
    );
  };

  const loadStats = async () => {
    const result = await getUsageStats({
      startTime: startOfDay(new Date()).getTime(),
      endTime: endOfDay(new Date()).getTime(),
    });

    setUsages(result);
  };

  const renderItem = ({ item }: { item: UsageData }) => {
    const duration = intervalToDuration({
      start: 0,
      end: item.totalTimeInForeground,
    });
    return (
      <View>
        <Text>{item.packageName}</Text>
        <Text>
          {`${duration.hours}h ${duration.minutes}m ${duration.seconds}s`}
        </Text>
      </View>
    );
  };

  return (
    <FlatList<UsageData>
      data={usages.splice(0, 10)}
      keyExtractor={(item) => item.packageName}
      renderItem={renderItem}
      ListHeaderComponent={
        <View style={styles.container}>
          <Text>Granted: {granted ? 'Yes' : 'No'}</Text>
          <Button title="Request permission" onPress={requestPermission} />
          {granted && <Button title="Get Usage Stats" onPress={loadStats} />}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
