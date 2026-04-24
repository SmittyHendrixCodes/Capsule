import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Request Permission ─────────────────────────────────
export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// ── Schedule Weekly Digest ─────────────────────────────
export const scheduleWeeklyDigest = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Weekly Capsule Digest',
      body: "Don't forget to review and export your receipts for the week!",
      data: { screen: 'Ledger' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2, // Monday
      hour: 9,
      minute: 0,
    },
  });
};

// ── Schedule Monthly Export Reminder ──────────────────
export const scheduleMonthlyReminder = async (): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📄 Time to Export!',
      body: "A new month is starting — export last month's expenses before you forget!",
      data: { screen: 'Ledger' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: 1,
      hour: 9,
      minute: 0,
    },
  });
};

// ── Session Reminder ───────────────────────────────────
export const scheduleSessionReminder = async (count: number): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📋 Unsaved Receipt Session',
      body: `You have ${count} receipt${count > 1 ? 's' : ''} waiting in your capture session.`,
      data: { screen: 'Capture' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3600, // 1 hour
      repeats: false,
    },
  });
};

// ── Cancel Session Reminder ────────────────────────────
export const cancelSessionReminder = async (): Promise<void> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.screen === 'Capture') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
};

// ── Setup All Notifications ────────────────────────────
export const setupNotifications = async (enabled: boolean): Promise<void> => {
  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  await scheduleWeeklyDigest();
  await scheduleMonthlyReminder();
};