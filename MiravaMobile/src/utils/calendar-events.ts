import type { CalendarEvent } from '@/services/account-api';
import { getVietnameseLunarDate } from '@/utils/vietnamese-lunar';

export function getEventsOnCalendarDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((event) => {
    if (event.calendarType === 'solar') {
      return event.month === date.getMonth() + 1 &&
        event.day === date.getDate() &&
        (event.recurrence === 'yearly' || event.year === date.getFullYear());
    }

    const lunar = getVietnameseLunarDate(date);
    return !lunar.isLeapMonth &&
      lunar.month === event.month &&
      lunar.day === event.day &&
      (event.recurrence === 'yearly' || lunar.year === event.year);
  });
}

export function getSolarDateFromLunar(year: number, month: number, day: number): Date | null {
  const date = new Date(year, 0, 1);
  const end = new Date(year + 2, 0, 1);
  for (; date < end; date.setDate(date.getDate() + 1)) {
    const lunar = getVietnameseLunarDate(date);
    if (lunar.year === year && !lunar.isLeapMonth && lunar.month === month && lunar.day === day) {
      return new Date(date);
    }
  }
  return null;
}

export function getNextCalendarEventOccurrence(
  event: CalendarEvent,
  fromDate = new Date(),
): Date | null {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());

  if (event.recurrence === 'once' && event.calendarType === 'solar') {
    const date = new Date(event.year, event.month - 1, event.day);
    return date >= start ? date : null;
  }

  if (event.recurrence === 'once') {
    const date = getSolarDateFromLunar(event.year, event.month, event.day);
    return date && date >= start ? date : null;
  }

  for (let offset = 0; offset <= 8 * 366; offset += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    if (event.calendarType === 'solar') {
      if (date.getMonth() + 1 === event.month && date.getDate() === event.day) return date;
    } else {
      const lunar = getVietnameseLunarDate(date);
      if (!lunar.isLeapMonth && lunar.month === event.month && lunar.day === event.day) return date;
    }
  }

  return null;
}

export function getNextLunarNewYearOccurrence(fromDate = new Date()): Date | null {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const lunarYear = getVietnameseLunarDate(start).year;
  const thisLunarNewYear = getSolarDateFromLunar(lunarYear, 1, 1);
  if (thisLunarNewYear && thisLunarNewYear >= start) return thisLunarNewYear;
  return getSolarDateFromLunar(lunarYear + 1, 1, 1);
}

export function getDaysUntilDate(targetDate: Date, fromDate = new Date()): number {
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  return Math.max(0, Math.round((target.getTime() - start.getTime()) / 86_400_000));
}
