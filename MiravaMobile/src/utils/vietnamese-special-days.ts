import { getVietnameseLunarDate } from '@/utils/vietnamese-lunar';

const solarHolidays = new Map([
  ['1-1', 'Tết Dương lịch'],
  ['4-30', 'Ngày Giải phóng miền Nam'],
  ['5-1', 'Quốc tế Lao động'],
  ['9-2', 'Quốc khánh'],
]);

const lunarHolidays = new Map([
  ['1-1', 'Tết Nguyên Đán'],
  ['1-2', 'Tết Nguyên Đán'],
  ['1-3', 'Tết Nguyên Đán'],
  ['1-15', 'Tết Nguyên Tiêu'],
  ['3-10', 'Giỗ Tổ Hùng Vương'],
  ['8-15', 'Tết Trung Thu'],
]);

export function getVietnameseSpecialDays(date: Date): string[] {
  const specialDays: string[] = [];
  const solarHoliday = solarHolidays.get(`${date.getMonth() + 1}-${date.getDate()}`);
  if (solarHoliday) specialDays.push(solarHoliday);

  const lunar = getVietnameseLunarDate(date);
  if (!lunar.isLeapMonth) {
    const lunarHoliday = lunarHolidays.get(`${lunar.month}-${lunar.day}`);
    if (lunarHoliday) specialDays.push(lunarHoliday);
  }

  return specialDays;
}
