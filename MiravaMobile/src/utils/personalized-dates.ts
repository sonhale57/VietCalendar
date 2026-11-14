import type { BirthProfile } from '@/utils/birth-profile';
import { getVietnameseLunarDate } from '@/utils/vietnamese-lunar';

const zodiacBranches = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const harmonyGroups = [
  ['Thân', 'Tý', 'Thìn'],
  ['Hợi', 'Mão', 'Mùi'],
  ['Dần', 'Ngọ', 'Tuất'],
  ['Tỵ', 'Dậu', 'Sửu'],
];

export type PersonalizedDate = {
  date: Date;
  lunarDay: number;
  lunarMonth: number;
  dayCanChi: string;
  rating: 'Hợp tuổi' | 'Có thể cân nhắc';
};

export function getPersonalizedDates(profile: BirthProfile, from: Date, to: Date): PersonalizedDate[] {
  const candidates: PersonalizedDate[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const birthBranchIndex = zodiacBranches.indexOf(profile.zodiac);

  for (const date = start; date <= end; date.setDate(date.getDate() + 1)) {
    const lunar = getVietnameseLunarDate(date);
    const dayBranch = lunar.dayCanChi.split(' ')[1];
    const dayBranchIndex = zodiacBranches.indexOf(dayBranch);
    if (dayBranchIndex < 0 || (dayBranchIndex - birthBranchIndex + 12) % 12 === 6) continue;

    const harmonyGroup = harmonyGroups.find((group) => group.includes(profile.zodiac));
    const rating = dayBranch === profile.zodiac || harmonyGroup?.includes(dayBranch)
      ? 'Hợp tuổi'
      : 'Có thể cân nhắc';
    candidates.push({
      date: new Date(date),
      lunarDay: lunar.day,
      lunarMonth: lunar.month,
      dayCanChi: lunar.dayCanChi,
      rating,
    });
  }

  return candidates
    .sort((left, right) => {
      if (left.rating !== right.rating) return left.rating === 'Hợp tuổi' ? -1 : 1;
      return left.date.getTime() - right.date.getTime();
    })
    .slice(0, 8);
}
