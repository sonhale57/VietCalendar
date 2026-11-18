import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

import type { CalendarEvent } from '@/services/account-api';
import { getNextCalendarEventOccurrence } from '@/utils/calendar-events';

const EVENT_NOTIFICATION_LIMIT = 60;
let reconciliationQueue: Promise<void> = Promise.resolve();

export async function requestCalendarNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('calendar-events', {
      name: 'Sự kiện và lời nhắc',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function reconcileCalendarNotifications(events: CalendarEvent[]): Promise<number> {
  const task = reconciliationQueue.then(() => reconcile(events));
  reconciliationQueue = task.then(() => undefined, () => undefined);
  return task;
}

async function reconcile(events: CalendarEvent[]): Promise<number> {
  if (Platform.OS === 'web') return 0;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return 0;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((request) => request.content.data?.calendarEventNotification === true)
    .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));

  const now = new Date();
  const candidates = events.flatMap((event) => {
    const occurrence = getNextCalendarEventOccurrence(event, now);
    if (!occurrence) return [];

    return [
      { event, daysBefore: 30, message: 'Còn 1 tháng' },
      { event, daysBefore: 7, message: 'Còn 7 ngày' },
      { event, daysBefore: 1, message: 'Ngày mai' },
      { event, daysBefore: 0, message: 'Hôm nay' },
    ].flatMap((reminder) => {
      const fireDate = atLocalNine(subtractDays(occurrence, reminder.daysBefore));
      return fireDate > now ? [{ ...reminder, fireDate }] : [];
    });
  }).sort((left, right) => left.fireDate.getTime() - right.fireDate.getTime());

  const selected = candidates.slice(0, EVENT_NOTIFICATION_LIMIT);
  for (const reminder of selected) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.event.title,
        body: reminder.event.label
          ? `${reminder.message} · ${reminder.event.label}`
          : reminder.message,
        data: {
          calendarEventNotification: true,
          calendarEventId: reminder.event.id,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireDate,
      },
    });
  }

  return candidates.length - selected.length;
}

function subtractDays(date: Date, days: number): Date {
  if (days === 30) {
    const month = date.getMonth() - 1;
    const year = date.getFullYear() + Math.floor(month / 12);
    const normalizedMonth = ((month % 12) + 12) % 12;
    const lastDay = new Date(year, normalizedMonth + 1, 0).getDate();
    return new Date(year, normalizedMonth, Math.min(date.getDate(), lastDay));
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);
}

function atLocalNine(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0);
}
