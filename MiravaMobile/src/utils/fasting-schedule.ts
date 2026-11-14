import { getVietnameseLunarDate } from './vietnamese-lunar';

const fastingDays: Record<string, number[]> = {
  'Nhị trai': [1, 15],
  'Tứ trai': [1, 14, 15, 30],
  'Lục trai': [8, 14, 15, 23, 29, 30],
  'Thập trai': [1, 8, 14, 15, 18, 23, 24, 28, 29, 30],
};

export function isFastingDay(date: Date, mode: string): boolean {
  if (mode === 'Chay trường') return true;
  return fastingDays[mode]?.includes(getVietnameseLunarDate(date).day) ?? false;
}

export function getNextFastingDate(from: Date, mode: string): Date | null {
  if (mode === 'Tắt') return null;
  for (let offset = 0; offset < 32; offset += 1) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
    if (isFastingDay(date, mode)) return date;
  }
  return null;
}

export function isTraditionalVitalityDay(date: Date): boolean {
  const lunar = getVietnameseLunarDate(date);
  if ([1, 8, 15, 23].includes(lunar.day)) return true;
  return lunar.month === 5 && [5, 6, 7, 15, 16, 17, 25, 26, 27].includes(lunar.day);
}
