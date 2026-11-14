import type { BirthProfile } from '@/utils/birth-profile';
import { getVietnameseLunarDate } from '@/utils/vietnamese-lunar';

const branches = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const stems = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const officers = ['Kiến', 'Trừ', 'Mãn', 'Bình', 'Định', 'Chấp', 'Phá', 'Nguy', 'Thành', 'Thu', 'Khai', 'Bế'];
const hourRanges = [
  '23:00–01:00', '01:00–03:00', '03:00–05:00', '05:00–07:00',
  '07:00–09:00', '09:00–11:00', '11:00–13:00', '13:00–15:00',
  '15:00–17:00', '17:00–19:00', '19:00–21:00', '21:00–23:00',
];
const hoangDaoDaysByMonth = [
  ['Tý', 'Sửu', 'Tỵ', 'Mùi'],
  ['Dần', 'Mão', 'Mùi', 'Dậu'],
  ['Thìn', 'Tỵ', 'Dậu', 'Hợi'],
  ['Ngọ', 'Mùi', 'Sửu', 'Dậu'],
  ['Thân', 'Dậu', 'Sửu', 'Mão'],
  ['Tuất', 'Hợi', 'Mão', 'Tỵ'],
];
const hoangDaoHoursByDayPair = [
  ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'],
  ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'],
  ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'],
  ['Tý', 'Dần', 'Mão', 'Ngọ', 'Mùi', 'Dậu'],
  ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'],
  ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi'],
];
const hourPairByDayBranch = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5];
const auspiciousOfficersByIntention: Record<string, string[]> = {
  'Khai trương': ['Kiến', 'Định', 'Thành', 'Khai'],
  'Ký hợp đồng': ['Định', 'Chấp', 'Thành', 'Khai'],
  'Mua xe': ['Định', 'Thành', 'Khai'],
  'Động thổ': ['Định', 'Chấp', 'Thành'],
  'Cắt tóc': ['Trừ', 'Định', 'Thành'],
  'Xuất hành': ['Định', 'Thành', 'Khai'],
};
const directionsByStem = [
  ['Đông', 'Đông Nam'], ['Đông', 'Nam'], ['Nam', 'Đông Nam'], ['Nam', 'Tây Nam'],
  ['Đông Bắc', 'Tây Nam'], ['Đông Bắc', 'Tây Nam'], ['Tây', 'Tây Bắc'], ['Tây', 'Tây Nam'],
  ['Bắc', 'Đông Bắc'], ['Bắc', 'Tây Bắc'],
];
const clashPairs = [
  ['Tý', 'Ngọ'], ['Sửu', 'Mùi'], ['Dần', 'Thân'],
  ['Mão', 'Dậu'], ['Thìn', 'Tuất'], ['Tỵ', 'Hợi'],
];
const harmonyGroups = [
  ['Thân', 'Tý', 'Thìn'],
  ['Hợi', 'Mão', 'Mùi'],
  ['Dần', 'Ngọ', 'Tuất'],
  ['Tỵ', 'Dậu', 'Sửu'],
];

export type DailyAlmanac = {
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  isLeapMonth: boolean;
  dayCanChi: string;
  monthCanChi: string;
  yearCanChi: string;
  officer: string;
  isHoangDao: boolean;
  personalCompatibility: string;
  warnings: string[];
  hoangDaoHours: string[];
  rating: 'Thuận lợi' | 'Cân nhắc' | 'Bình hòa';
  travelRating: 'Thuận lợi' | 'Cần thận trọng' | 'Bình hòa';
  favorableDirections: string[];
  unfavorableDirections: string[];
  activitySuitable: boolean;
};

export function getDailyAlmanac(date: Date, intention: string, profile: BirthProfile | null): DailyAlmanac {
  const lunar = getVietnameseLunarDate(date);
  const [dayStem = '', dayBranch = ''] = lunar.dayCanChi.split(' ');
  const dayBranchIndex = branches.indexOf(dayBranch);
  const monthStartBranchIndex = positiveModulo(lunar.month + 1, 12);
  const officer = officers[positiveModulo(dayBranchIndex - monthStartBranchIndex, 12)];
  const isHoangDao = (hoangDaoDaysByMonth[(lunar.month - 1) % 6] ?? []).includes(dayBranch);
  const goodHourBranches = hoangDaoHoursByDayPair[hourPairByDayBranch[dayBranchIndex] ?? 0];
  const hoangDaoHours = branches
    .filter((branch) => goodHourBranches.includes(branch))
    .map((branch) => `${branch} ${hourRanges[branches.indexOf(branch)]}`);
  const warnings: string[] = [];

  if ([3, 7, 13, 18, 22, 27].includes(lunar.day)) warnings.push('Ngày Tam Nương');
  if ([5, 14, 23].includes(lunar.day)) warnings.push('Ngày Nguyệt Kỵ');

  const activitySuitable = (auspiciousOfficersByIntention[intention] ?? ['Định', 'Thành', 'Khai']).includes(officer);
  const { compatibility, score: compatibilityScore } = getCompatibility(profile, dayBranch);
  const score =
    (isHoangDao ? 2 : 0) +
    (activitySuitable ? 2 : -1) +
    Math.max(-4, -2 * warnings.length) +
    compatibilityScore;
  const rating: DailyAlmanac['rating'] = score >= 4 ? 'Thuận lợi' : score >= 1 ? 'Cân nhắc' : 'Bình hòa';
  const directionStemIndex = stems.indexOf(dayStem);
  const favorableDirections = directionsByStem[directionStemIndex] ?? ['Đông', 'Nam'];
  const unfavorableDirections = branches[dayBranchIndex] === 'Tý' || branches[dayBranchIndex] === 'Ngọ'
    ? ['Tây']
    : ['Tây Bắc'];

  return {
    lunarDay: lunar.day,
    lunarMonth: lunar.month,
    lunarYear: lunar.year,
    isLeapMonth: lunar.isLeapMonth,
    dayCanChi: lunar.dayCanChi,
    monthCanChi: lunar.monthCanChi,
    yearCanChi: lunar.yearCanChi,
    officer,
    isHoangDao,
    personalCompatibility: compatibility,
    warnings,
    hoangDaoHours,
    rating,
    travelRating: rating === 'Thuận lợi' ? 'Thuận lợi' : score < 0 ? 'Cần thận trọng' : 'Bình hòa',
    favorableDirections,
    unfavorableDirections,
    activitySuitable,
  };
}

export function getRecommendedDates(
  from: Date,
  to: Date,
  intention: string,
  profile: BirthProfile | null,
): { date: Date; almanac: DailyAlmanac }[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  if (start > end || (end.getTime() - start.getTime()) / 86400000 > 365) return [];

  const candidates: { date: Date; almanac: DailyAlmanac; score: number }[] = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const almanac = getDailyAlmanac(date, intention, profile);
    candidates.push({ date: new Date(date), almanac, score: getRankingScore(almanac, profile) });
  }

  return candidates
    .sort((left, right) => right.score - left.score || left.date.getTime() - right.date.getTime())
    .slice(0, 8)
    .map(({ date, almanac }) => ({ date, almanac }));
}

function getRankingScore(almanac: DailyAlmanac, profile: BirthProfile | null) {
  const ratingScore = almanac.rating === 'Thuận lợi' ? 3 : almanac.rating === 'Cân nhắc' ? 1 : 0;
  const personalScore = profile && (
    almanac.personalCompatibility.includes('Hợp tuổi') ||
    almanac.personalCompatibility.includes('đồng chi')
  )
    ? 2
    : almanac.personalCompatibility.includes('xung tuổi') ? -3 : 0;
  return ratingScore + personalScore - almanac.warnings.length * 2;
}

function getCompatibility(profile: BirthProfile | null, dayBranch: string) {
  if (!profile) return { compatibility: 'Thông tin chung · không xét tuổi cá nhân', score: 0 };
  if (profile.zodiac === dayBranch) return { compatibility: 'Ngày đồng chi với tuổi', score: 1 };
  if (clashPairs.some(([first, second]) =>
    (first === profile.zodiac && second === dayBranch) || (second === profile.zodiac && first === dayBranch),
  )) {
    return { compatibility: 'Ngày xung tuổi', score: -3 };
  }
  if (harmonyGroups.some((group) => group.includes(profile.zodiac) && group.includes(dayBranch))) {
    return { compatibility: 'Hợp tuổi theo tam hợp', score: 2 };
  }
  return { compatibility: 'Tuổi không xung trực tiếp', score: 0 };
}

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}
