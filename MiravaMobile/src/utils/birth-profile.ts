import { getVietnameseLunarDate } from '@/utils/vietnamese-lunar';

const elements = [
  'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc',
  'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy', 'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim',
  'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy',
] as const;
const heavenlyStems = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const earthlyBranches = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const cungByNumber = {
  1: { name: 'Khảm', element: 'Thủy' },
  2: { name: 'Khôn', element: 'Thổ' },
  3: { name: 'Chấn', element: 'Mộc' },
  4: { name: 'Tốn', element: 'Mộc' },
  6: { name: 'Càn', element: 'Kim' },
  7: { name: 'Đoài', element: 'Kim' },
  8: { name: 'Cấn', element: 'Thổ' },
  9: { name: 'Ly', element: 'Hỏa' },
} as const;

const elementDetails = {
  Kim: {
    colors: ['Trắng', 'Xám', 'Bạc', 'Vàng đất'],
    avoid: 'Đỏ, hồng, tím',
    note: 'Màu đỏ, hồng, tím thuộc Hỏa, thường được xem là không tương hợp với Kim.',
  },
  Mộc: {
    colors: ['Xanh lá', 'Đen', 'Xanh dương'],
    avoid: 'Trắng, xám, bạc',
    note: 'Màu trắng, xám, bạc thuộc Kim, thường được xem là không tương hợp với Mộc.',
  },
  Thủy: {
    colors: ['Đen', 'Xanh dương', 'Trắng', 'Bạc'],
    avoid: 'Vàng đất, nâu',
    note: 'Màu vàng đất, nâu thuộc Thổ, thường được xem là không tương hợp với Thủy.',
  },
  Hỏa: {
    colors: ['Đỏ', 'Hồng', 'Tím', 'Xanh lá'],
    avoid: 'Đen, xanh dương',
    note: 'Màu đen, xanh dương thuộc Thủy, thường được xem là không tương hợp với Hỏa.',
  },
  Thổ: {
    colors: ['Vàng đất', 'Nâu', 'Đỏ', 'Hồng', 'Tím'],
    avoid: 'Xanh lá',
    note: 'Màu xanh lá thuộc Mộc, thường được xem là không tương hợp với Thổ.',
  },
} as const;

export type BirthProfile = {
  year: number;
  lunarYear: number;
  yearCanChi: string;
  zodiac: string;
  element: keyof typeof elementDetails;
  cung: string | null;
  cungElement: string | null;
  compatibleColors: readonly string[];
  avoidColors: string;
  guidance: string;
};

export function getBirthProfile(
  dateOfBirth: string,
  calendarType: string,
  gender: string,
): BirthProfile | null {
  const parsed = parseDate(dateOfBirth, calendarType);
  if (!parsed) return null;

  const lunarYear = calendarType === 'Âm lịch'
    ? parsed.year
    : getVietnameseLunarDate(new Date(parsed.year, parsed.month - 1, parsed.day)).year;
  const cycleIndex = positiveModulo(lunarYear - 1984, 60);
  const element = elements[Math.floor(cycleIndex / 2)] as keyof typeof elementDetails;
  const cung = getCung(lunarYear, gender);
  const details = elementDetails[element];
  const zodiac = earthlyBranches[positiveModulo(lunarYear - 4, 12)];

  return {
    year: parsed.year,
    lunarYear,
    yearCanChi: `${heavenlyStems[positiveModulo(lunarYear + 6, 10)]} ${zodiac}`,
    zodiac,
    element,
    cung: cung?.name ?? null,
    cungElement: cung?.element ?? null,
    compatibleColors: details.colors,
    avoidColors: details.avoid,
    guidance: details.note,
  };
}

function getCung(year: number, gender: string) {
  if (gender !== 'Nam' && gender !== 'Nữ') return null;
  const digitSum = String(year).split('').reduce((sum, digit) => sum + Number(digit), 0);
  const reduced = reduceToDigit(digitSum);
  let number = positiveModulo(
    gender === 'Nam'
      ? (year < 2000 ? 10 - reduced : 9 - reduced)
      : (year < 2000 ? reduced + 5 : reduced + 6),
    9,
  );
  if (number === 0) number = 9;
  if (number === 5) number = gender === 'Nam' ? 2 : 8;
  return cungByNumber[number as keyof typeof cungByNumber] ?? null;
}

function parseDate(value: string, calendarType: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return null;
  const maxDay = calendarType === 'Âm lịch'
    ? 30
    : month === 2
    ? (isLeapYear(year) ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30 : 31;
  if (day < 1 || day > maxDay) return null;
  return { year, month, day };
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function reduceToDigit(value: number) {
  let result = value;
  while (result > 9) {
    result = String(result).split('').reduce((sum, digit) => sum + Number(digit), 0);
  }
  return result;
}

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}
