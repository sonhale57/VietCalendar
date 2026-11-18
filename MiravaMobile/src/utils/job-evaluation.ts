import type { BirthProfile } from '@/utils/birth-profile';
import type { LunarCalendarAdviceDocument } from '@/services/account-api';
import { getDailyAlmanac } from '@/utils/daily-almanac';
import {
  ELEMENT_KHAC,
  ELEMENT_SINH,
  LUC_HOP,
  LUC_XUNG,
  TAM_HOP_GROUPS,
  TUONG_HAI,
  get12Hours,
  getCanChiDay,
  getCanChiYear,
  evaluateLongevityBadges,
} from '@/utils/destiny-engine';
import type { ElementType } from '@/utils/destiny-engine';
import { FIXED_FLAG_LABELS, JOB_CATEGORIES, TRUC_NAMES } from '@/utils/job-config';
import { getVietnameseLunarDate, getVietnameseLunarMonthLength } from '@/utils/vietnamese-lunar';

export type EvaluationProfile = Pick<BirthProfile, 'lunarYear' | 'yearCanChi' | 'element'> & { name: string };

export type DayEvaluationResult = {
  date: string;
  lunarDate: string;
  canChiDay: string;
  elementDay: string;
  isHoangDao: boolean;
  score: number;
  classification: 'DAI_CAT' | 'THUAN_LOI' | 'BINH_HOA' | 'KY_DUNG';
  classificationLabel: string;
  isConflictAge: boolean;
  jobHighlights: {
    trucName: string;
    isTrucGood: boolean;
    isTrucBad: boolean;
    fixedBadDays: string[];
    unsupportedBadFlags: string[];
    jobFit: string;
    baseScore: number;
  };
  personalizedHighlights?: {
    profileName: string;
    chiRelation: string;
    elementRelation: string;
    stemRelation: string;
    favorableHours: string[];
    destinyScore: number;
  };
  longevityNotes: {
    isThapTrai: boolean;
    daiKyLevel: string;
    daiKyNote: string | null;
  };
  hours: ReturnType<typeof get12Hours>;
  reasons: string[];
};

const SUPPORTED_FIXED_FLAGS = new Set(['TAM_NUONG', 'NGUYET_KY']);
const STEM_COMBINATIONS = new Set(['0-5', '1-6', '2-7', '3-8', '4-9']);
const STEM_CLASHES = new Set(['0-6', '1-7', '2-8', '3-9']);
const ELEMENT_NAMES: Record<ElementType, string> = {
  KIM: 'Kim',
  THỦY: 'Thủy',
  MỘC: 'Mộc',
  HỎA: 'Hỏa',
  THỔ: 'Thổ',
};
const ELEMENT_KEYS: Record<string, ElementType> = {
  Kim: 'KIM',
  Thủy: 'THỦY',
  Mộc: 'MỘC',
  Hỏa: 'HỎA',
  Thổ: 'THỔ',
};

export function evaluateDayForJob(
  date: Date,
  jobCode: string,
  profile: EvaluationProfile | null = null,
  lunarAdvice?: LunarCalendarAdviceDocument | null,
): DayEvaluationResult {
  const job = JOB_CATEGORIES[jobCode];
  if (!job) throw new Error(`Không tìm thấy danh mục công việc "${jobCode}".`);
  if (Number.isNaN(date.getTime())) throw new Error('Ngày tra cứu không hợp lệ.');

  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const lunar = getVietnameseLunarDate(targetDate);
  const almanac = getDailyAlmanac(targetDate, job.name, null);
  const dayCanChi = getCanChiDay(targetDate.getDate(), targetDate.getMonth() + 1, targetDate.getFullYear());
  const trucIndex = TRUC_NAMES.findIndex((name) => name === almanac.officer || (name === 'Thâu' && almanac.officer === 'Thu'));
  const trucName = almanac.officer === 'Thu' ? 'Thâu' : almanac.officer;
  const isTrucGood = job.goodTruc.includes(trucIndex);
  const isTrucBad = job.badTruc.includes(trucIndex);
  const fixedFlags = getFixedDayFlags(lunar.day);
  const fixedBadDays = [...fixedFlags]
    .filter((flag) => job.badFixedFlags.includes(flag))
    .map((flag) => FIXED_FLAG_LABELS[flag] ?? flag);
  const longevity = evaluateLongevityBadges(
    lunar.day,
    lunar.month,
    lunar.isLeapMonth,
    getVietnameseLunarMonthLength(targetDate) === 29,
    [],
    lunarAdvice,
  );
  const jobFitScore = isTrucGood ? 15 : isTrucBad ? -15 : 5;
  // The baseline fills the 40-point job scale and allows the specified 90+ harmony case.
  const baseScore = 10
    + (almanac.isHoangDao ? 15 : 0)
    + jobFitScore
    - (fixedBadDays.length > 0 ? 20 : 0)
    - (longevity.daiKyLevel === 'CRITICAL' ? 15 : 0);
  const hours = get12Hours(dayCanChi.chiIndex);
  const reasons = [
    `Điểm nền lịch 10/40 · ${almanac.isHoangDao ? 'Hoàng đạo' : 'Hắc đạo'} · Trực ${trucName}${isTrucGood ? ' hợp' : isTrucBad ? ' kỵ' : ' trung tính'} với công việc`,
    ...(fixedBadDays.length > 0 ? [`Ngày kỵ: ${fixedBadDays.join(', ')}`] : []),
    ...(longevity.daiKyLevel === 'CRITICAL' ? ['Đại Kỵ Cửu Độc theo Thọ Khang Bảo Giám'] : []),
  ];

  let score = clamp(baseScore * 2.5, 0, 100);
  let isConflictAge = false;
  let personalizedHighlights: DayEvaluationResult['personalizedHighlights'];
  if (profile) {
    const userCanChi = getCanChiYear(profile.lunarYear);
    const chiRelation = getChiRelation(userCanChi.chiIndex, dayCanChi.chiIndex);
    const elementRelation = getElementRelation(
      ELEMENT_KEYS[profile.element] ?? userCanChi.element,
      dayCanChi.element,
    );
    const stemRelation = getStemRelation(userCanChi.canIndex, dayCanChi.canIndex);
    isConflictAge = chiRelation.isConflict;
    const destinyScore = chiRelation.score + elementRelation.score + stemRelation.score;
    score = clamp(baseScore + destinyScore, 0, 100);
    const favorableHours = hours
      .filter((hour) =>
        hour.isHoangDao &&
        (LUC_HOP[userCanChi.chiIndex] === hour.chiIndex ||
          TAM_HOP_GROUPS.some((group) => group.includes(userCanChi.chiIndex) && group.includes(hour.chiIndex))),
      )
      .map((hour) => `${hour.chiName} (${hour.timeRange})`);
    personalizedHighlights = {
      profileName: profile.name,
      chiRelation: chiRelation.label,
      elementRelation: elementRelation.label,
      stemRelation: stemRelation.label,
      favorableHours,
      destinyScore,
    };
    reasons.push(chiRelation.label, elementRelation.label, stemRelation.label);
  }

  const classification = classifyScore(score, isConflictAge);
  return {
    date: formatDate(targetDate),
    lunarDate: `${lunar.day}/${lunar.month}${lunar.isLeapMonth ? ' nhuận' : ''}/${lunar.year}`,
    canChiDay: dayCanChi.fullName,
    elementDay: ELEMENT_NAMES[dayCanChi.element],
    isHoangDao: almanac.isHoangDao,
    score: Math.round(score),
    classification,
    classificationLabel: !profile && classification === 'DAI_CAT'
      ? 'ĐẠI CÁT / RẤT TỐT'
      : CLASSIFICATION_LABELS[classification],
    isConflictAge,
    jobHighlights: {
      trucName,
      isTrucGood,
      isTrucBad,
      fixedBadDays,
      unsupportedBadFlags: job.badFixedFlags
        .filter((flag) => !SUPPORTED_FIXED_FLAGS.has(flag))
        .map((flag) => FIXED_FLAG_LABELS[flag] ?? flag),
      jobFit: isTrucGood ? 'Trực tốt cho công việc' : isTrucBad ? 'Trực kỵ công việc' : 'Trực trung tính',
      baseScore,
    },
    personalizedHighlights,
    longevityNotes: {
      isThapTrai: longevity.isThapTrai,
      daiKyLevel: longevity.daiKyLevel,
      daiKyNote: longevity.daiKyReason,
    },
    hours,
    reasons,
  };
}

export function findGoodDaysForJob(
  from: Date,
  to: Date,
  jobCode: string,
  profile: EvaluationProfile | null = null,
  lunarAdvice?: LunarCalendarAdviceDocument | null,
): DayEvaluationResult[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (start > end || spanDays > 59) return [];

  const results: DayEvaluationResult[] = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    results.push(evaluateDayForJob(date, jobCode, profile, lunarAdvice));
  }
  return results
    .filter((result) => result.score >= 50 && !result.isConflictAge)
    .sort((left, right) => right.score - left.score || left.date.localeCompare(right.date))
    .slice(0, 8);
}

const CLASSIFICATION_LABELS: Record<DayEvaluationResult['classification'], string> = {
  DAI_CAT: 'ĐẠI CÁT HỢP TUỔI',
  THUAN_LOI: 'NGÀY LÀNH / THUẬN LỢI',
  BINH_HOA: 'BÌNH HÒA',
  KY_DUNG: 'KỴ DÙNG / XUNG TUỔI',
};

function getFixedDayFlags(lunarDay: number) {
  const flags = new Set<string>();
  if ([3, 7, 13, 18, 22, 27].includes(lunarDay)) flags.add('TAM_NUONG');
  if ([5, 14, 23].includes(lunarDay)) flags.add('NGUYET_KY');
  return flags;
}

function getChiRelation(userChi: number, dayChi: number) {
  if (LUC_HOP[userChi] === dayChi) return { score: 25, isConflict: false, label: 'Địa chi ngày Lục Hợp với tuổi' };
  if (TAM_HOP_GROUPS.some((group) => group.includes(userChi) && group.includes(dayChi))) {
    return { score: 20, isConflict: false, label: 'Địa chi ngày Tam Hợp với tuổi' };
  }
  if (LUC_XUNG[userChi] === dayChi) return { score: -35, isConflict: true, label: 'Địa chi ngày Lục Xung với tuổi' };
  if (TUONG_HAI[userChi] === dayChi) return { score: -15, isConflict: false, label: 'Địa chi ngày Tương Hại với tuổi' };
  return { score: 0, isConflict: false, label: 'Địa chi không có quan hệ hợp/xung trực tiếp' };
}

function getElementRelation(userElement: ElementType, dayElement: ElementType) {
  if (ELEMENT_SINH[dayElement] === userElement) {
    return { score: 20, label: `Mệnh ngày ${ELEMENT_NAMES[dayElement]} tương sinh mệnh tuổi ${ELEMENT_NAMES[userElement]}` };
  }
  if (dayElement === userElement) {
    return { score: 10, label: `Mệnh ngày đồng hành mệnh tuổi ${ELEMENT_NAMES[userElement]}` };
  }
  if (ELEMENT_KHAC[dayElement] === userElement) {
    return { score: -20, label: `Mệnh ngày ${ELEMENT_NAMES[dayElement]} khắc mệnh tuổi ${ELEMENT_NAMES[userElement]}` };
  }
  if (ELEMENT_KHAC[userElement] === dayElement) {
    return { score: -5, label: `Mệnh tuổi ${ELEMENT_NAMES[userElement]} khắc mệnh ngày ${ELEMENT_NAMES[dayElement]}` };
  }
  return { score: 0, label: 'Ngũ hành không có quan hệ sinh/khắc trực tiếp' };
}

function getStemRelation(userStem: number, dayStem: number) {
  const pair = `${Math.min(userStem, dayStem)}-${Math.max(userStem, dayStem)}`;
  if (userStem !== dayStem && STEM_COMBINATIONS.has(pair)) return { score: 10, label: 'Thiên Can ngày tương hợp với tuổi' };
  if (STEM_CLASHES.has(pair)) return { score: -10, label: 'Thiên Can ngày tương phá với tuổi' };
  return { score: 0, label: 'Thiên Can không có quan hệ hợp/phá trực tiếp' };
}

function classifyScore(score: number, isConflictAge: boolean): DayEvaluationResult['classification'] {
  if (score < 45 || isConflictAge) return 'KY_DUNG';
  if (score >= 80) return 'DAI_CAT';
  if (score >= 60) return 'THUAN_LOI';
  return 'BINH_HOA';
}

function formatDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
