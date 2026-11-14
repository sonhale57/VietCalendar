export const CAN_LIST = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'] as const;
export const CHI_LIST = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const;

export type ElementType = 'KIM' | 'THỦY' | 'MỘC' | 'HỎA' | 'THỔ';

export const ELEMENT_SINH: Record<ElementType, ElementType> = {
  KIM: 'THỦY',
  THỦY: 'MỘC',
  MỘC: 'HỎA',
  HỎA: 'THỔ',
  THỔ: 'KIM',
};

export const ELEMENT_KHAC: Record<ElementType, ElementType> = {
  KIM: 'MỘC',
  MỘC: 'THỔ',
  THỔ: 'THỦY',
  THỦY: 'HỎA',
  HỎA: 'KIM',
};

export const LUC_HOP: Record<number, number> = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
};

export const LUC_XUNG: Record<number, number> = {
  0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5,
};

export const TUONG_HAI: Record<number, number> = {
  0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9,
};

export const TAM_HOP_GROUPS: number[][] = [
  [8, 0, 4],
  [2, 6, 10],
  [11, 3, 7],
  [5, 9, 1],
];

const NAP_AM_TABLE: Record<string, ElementType> = {
  'Giáp Tý': 'KIM', 'Ất Sửu': 'KIM', 'Bính Dần': 'HỎA', 'Đinh Mão': 'HỎA',
  'Mậu Thìn': 'MỘC', 'Kỷ Tỵ': 'MỘC', 'Canh Ngọ': 'THỔ', 'Tân Mùi': 'THỔ',
  'Nhâm Thân': 'KIM', 'Quý Dậu': 'KIM', 'Giáp Tuất': 'HỎA', 'Ất Hợi': 'HỎA',
  'Bính Tý': 'THỦY', 'Đinh Sửu': 'THỦY', 'Mậu Dần': 'THỔ', 'Kỷ Mão': 'THỔ',
  'Canh Thìn': 'KIM', 'Tân Tỵ': 'KIM', 'Nhâm Ngọ': 'MỘC', 'Quý Mùi': 'MỘC',
  'Giáp Thân': 'THỦY', 'Ất Dậu': 'THỦY', 'Bính Tuất': 'THỔ', 'Đinh Hợi': 'THỔ',
  'Mậu Tý': 'HỎA', 'Kỷ Sửu': 'HỎA', 'Canh Dần': 'MỘC', 'Tân Mão': 'MỘC',
  'Nhâm Thìn': 'THỦY', 'Quý Tỵ': 'THỦY', 'Giáp Ngọ': 'KIM', 'Ất Mùi': 'KIM',
  'Bính Thân': 'HỎA', 'Đinh Dậu': 'HỎA', 'Mậu Tuất': 'MỘC', 'Kỷ Hợi': 'MỘC',
  'Canh Tý': 'THỔ', 'Tân Sửu': 'THỔ', 'Nhâm Dần': 'KIM', 'Quý Mão': 'KIM',
  'Giáp Thìn': 'HỎA', 'Ất Tỵ': 'HỎA', 'Bính Ngọ': 'THỦY', 'Đinh Mùi': 'THỦY',
  'Mậu Thân': 'THỔ', 'Kỷ Dậu': 'THỔ', 'Canh Tuất': 'KIM', 'Tân Hợi': 'KIM',
  'Nhâm Tý': 'MỘC', 'Quý Sửu': 'MỘC', 'Giáp Dần': 'THỦY', 'Ất Mão': 'THỦY',
  'Bính Thìn': 'THỔ', 'Đinh Tỵ': 'THỔ', 'Mậu Ngọ': 'HỎA', 'Kỷ Mùi': 'HỎA',
  'Canh Thân': 'MỘC', 'Tân Dậu': 'MỘC', 'Nhâm Tuất': 'THỦY', 'Quý Hợi': 'THỦY',
};

const STAR_NAMES = [
  'Thanh Long', 'Minh Đường', 'Thiên Hình', 'Chu Tước', 'Kim Quỹ', 'Kim Đường',
  'Bạch Hổ', 'Ngọc Đường', 'Thiên Lao', 'Huyền Vũ', 'Tư Mệnh', 'Câu Trận',
] as const;
const HOANG_DAO_STARS = new Set([0, 1, 4, 5, 7, 10]);
const TIME_RANGES = [
  '23:00 - 01:00', '01:00 - 03:00', '03:00 - 05:00', '05:00 - 07:00',
  '07:00 - 09:00', '09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00',
  '15:00 - 17:00', '17:00 - 19:00', '19:00 - 21:00', '21:00 - 23:00',
] as const;
const HOANG_DAO_START_BY_DAY_CHI: Record<number, number> = {
  2: 0, 8: 0, 3: 2, 9: 2, 4: 4, 10: 4, 5: 6, 11: 6, 0: 8, 6: 8, 1: 10, 7: 10,
};

export interface CanChiInfo {
  canIndex: number;
  chiIndex: number;
  canName: string;
  chiName: string;
  fullName: string;
  element: ElementType;
}

export interface HourInfo {
  chiIndex: number;
  chiName: string;
  timeRange: string;
  isHoangDao: boolean;
  starName: string;
}

export interface ThoKhangRule {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  badge: string;
  advice: string;
}

export interface LongevityBadgeInfo {
  isThapTrai: boolean;
  thapTraiBadge: string | null;
  thapTraiAdvice: string | null;
  isMonthlyTaboo: boolean;
  monthlyTabooNote: string | null;
  seasonalNotes: string[];
  isDaiKy: boolean;
  daiKyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NONE';
  daiKyBadge: string | null;
  daiKyReason: string | null;
  daiKyAdvice: string;
}

export interface UserProfile {
  birthSolarDay: number;
  birthSolarMonth: number;
  birthSolarYear: number;
  birthLunarYear: number;
}

export interface DayTarget {
  solarDay: number;
  solarMonth: number;
  solarYear: number;
  lunarDay: number;
  lunarMonth: number;
  isLeapMonth?: boolean;
  isMonthTotal29Days?: boolean;
  isHoangDao?: boolean;
  seasonalAvoidanceNotes?: string[];
}

export type EvaluationHour = HourInfo & {
  isPersonalFavorable: boolean;
  badge: string;
};

export type DailyEvaluation = {
  isPersonalized: false;
  dayInfo: {
    solar: string;
    lunar: string;
    canChiDay: string;
    element: ElementType;
    isHoangDao: boolean;
  };
  longevity: LongevityBadgeInfo;
  hoursList: EvaluationHour[];
  generalStatus: string;
  recommendations: { dos: string[]; donts: string[] };
} | {
  isPersonalized: true;
  userProfile: { canChiYear: string; element: ElementType };
  dayInfo: {
    solar: string;
    lunar: string;
    canChiDay: string;
    element: ElementType;
    isHoangDao: boolean;
  };
  destinyScore: number;
  classification: string;
  analysis: string[];
  longevity: LongevityBadgeInfo;
  hoursList: EvaluationHour[];
  recommendations: { dos: string[]; donts: string[] };
};

const MONTHLY_TABOO_DAYS: Record<number, number[]> = {
  1: [1, 3, 5, 6, 7, 8, 9, 13, 14, 15, 19, 23, 27, 29, 30],
  2: [1, 2, 3, 6, 8, 14, 15, 18, 19, 21, 23, 29, 30],
  3: [1, 3, 6, 8, 9, 14, 15, 16, 18, 23, 27, 28, 29, 30],
  4: [1, 4, 7, 8, 14, 15, 18, 23, 28, 29, 30],
  5: [1, 5, 6, 7, 8, 11, 13, 14, 15, 16, 17, 18, 23, 25, 26, 27, 29, 30],
  6: [1, 3, 6, 8, 13, 14, 15, 18, 19, 23, 24, 27, 29, 30],
  7: [1, 7, 8, 10, 12, 13, 14, 15, 18, 22, 23, 27, 29, 30],
  8: [1, 3, 5, 8, 10, 12, 14, 15, 18, 22, 23, 24, 27, 29, 30],
  9: [1, 3, 8, 9, 14, 15, 17, 18, 19, 23, 27, 29, 30],
  10: [1, 5, 8, 10, 14, 15, 18, 23, 27, 29, 30],
  11: [1, 4, 6, 8, 11, 14, 15, 17, 19, 23, 25, 27, 29, 30],
  12: [1, 6, 7, 8, 12, 14, 15, 16, 18, 20, 23, 24, 25, 27, 29, 30],
};

const MONTHLY_TABOO_OCCASIONS: Record<string, string> = {
  '1-1': 'Vía Phật Di Lặc',
  '1-9': 'Vía Ngọc Hoàng',
  '1-15': 'Thượng Nguyên',
  '2-8': 'Ngày Phật Thích Ca xuất gia',
  '2-15': 'Ngày Phật Thích Ca nhập Niết Bàn',
  '2-19': 'Vía Quán Thế Âm',
  '2-21': 'Vía Phổ Hiền',
  '3-16': 'Vía Chuẩn Đề',
  '4-4': 'Vía Văn Thù',
  '4-8': 'Phật Đản',
  '4-28': 'Vía Dược Vương',
  '5-5': 'Tết Đoan Ngọ',
  '5-15': 'Ngày Cửu Độc',
  '6-3': 'Vía Vi Đà',
  '6-19': 'Ngày Quán Thế Âm thành đạo',
  '7-7': 'Thất Tịch',
  '7-13': 'Vía Đại Thế Chí',
  '7-15': 'Trung Nguyên · Vu Lan',
  '7-30': 'Vía Địa Tạng',
  '8-15': 'Tết Trung Thu',
  '8-22': 'Vía Nhiên Đăng Cổ Phật',
  '9-9': 'Trùng Cửu',
  '9-19': 'Ngày Quán Thế Âm xuất gia',
  '9-30': 'Vía Phật Dược Sư',
  '10-15': 'Hạ Nguyên',
  '11-17': 'Vía Phật A Di Đà',
  '12-8': 'Ngày Phật Thích Ca thành đạo',
  '12-23': 'Ngày Táo Quân chầu trời',
  '12-29': 'Vía Hoa Nghiêm Bồ Tát',
  '12-30': 'Trừ Tịch',
};

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

function getElement(canName: string, chiName: string): ElementType {
  return NAP_AM_TABLE[`${canName} ${chiName}`] ?? 'KIM';
}

export function getJulianDay(day: number, month: number, year: number): number {
  const a = Math.floor((14 - month) / 12);
  const adjustedYear = year + 4800 - a;
  const adjustedMonth = month + 12 * a - 3;
  return day + Math.floor((153 * adjustedMonth + 2) / 5) + 365 * adjustedYear
    + Math.floor(adjustedYear / 4) - Math.floor(adjustedYear / 100)
    + Math.floor(adjustedYear / 400) - 32045;
}

export function getCanChiDay(day: number, month: number, year: number): CanChiInfo {
  const julianDay = getJulianDay(day, month, year);
  const canIndex = positiveModulo(julianDay + 9, 10);
  const chiIndex = positiveModulo(julianDay + 1, 12);
  const canName = CAN_LIST[canIndex];
  const chiName = CHI_LIST[chiIndex];
  const fullName = `${canName} ${chiName}`;
  return { canIndex, chiIndex, canName, chiName, fullName, element: getElement(canName, chiName) };
}

export function getCanChiYear(lunarYear: number): CanChiInfo {
  const canIndex = positiveModulo(lunarYear + 6, 10);
  const chiIndex = positiveModulo(lunarYear + 8, 12);
  const canName = CAN_LIST[canIndex];
  const chiName = CHI_LIST[chiIndex];
  const fullName = `${canName} ${chiName}`;
  return { canIndex, chiIndex, canName, chiName, fullName, element: getElement(canName, chiName) };
}

export function get12Hours(dayChiIndex: number): HourInfo[] {
  const startOffset = HOANG_DAO_START_BY_DAY_CHI[dayChiIndex] ?? 0;
  return CHI_LIST.map((chiName, index) => {
    const starIndex = positiveModulo(index - startOffset, 12);
    return {
      chiIndex: index,
      chiName,
      timeRange: TIME_RANGES[index],
      isHoangDao: HOANG_DAO_STARS.has(starIndex),
      starName: STAR_NAMES[starIndex],
    };
  });
}

export function evaluateLongevityBadges(
  lunarDay: number,
  lunarMonth: number,
  _isLeapMonth = false,
  isMonthTotal29Days = false,
  seasonalNotes: string[] = [],
): LongevityBadgeInfo {
  const thapTraiDays = isMonthTotal29Days
    ? [1, 8, 14, 15, 18, 23, 24, 27, 28, 29]
    : [1, 8, 14, 15, 18, 23, 24, 28, 29, 30];
  const isThapTrai = thapTraiDays.includes(lunarDay);
  const thapTraiBadge = isThapTrai ? 'Ngày Thập Trai' : null;
  const thapTraiAdvice = isThapTrai
    ? 'Theo thực hành Phật giáo, ngày Thập Trai là dịp để tùy tâm ăn chay, phóng sinh và nuôi dưỡng lòng từ bi.'
    : null;
  const isMonthlyTaboo = MONTHLY_TABOO_DAYS[lunarMonth]?.includes(lunarDay) ?? false;
  const occasion = MONTHLY_TABOO_OCCASIONS[`${lunarMonth}-${lunarDay}`];
  const monthlyTabooNote = isMonthlyTaboo
    ? `Ngày ${lunarDay} tháng ${lunarMonth} âm lịch nằm trong danh sách ngày kiêng kỵ đặc biệt${occasion ? ` (${occasion})` : ''} được cung cấp. Đây là ghi chép phong tục/tín ngưỡng, không phải dự báo y tế.`
    : null;
  const normalizedSeasonalNotes = [...new Set(seasonalNotes)];
  const additionalReasons = [
    ...(monthlyTabooNote ? [monthlyTabooNote] : []),
    ...normalizedSeasonalNotes.map((note) => `${note} được ghi chú trong quan niệm dưỡng sinh truyền thống.`),
  ];

  function makeResult(
    daiKyLevel: LongevityBadgeInfo['daiKyLevel'],
    daiKyBadge: string | null,
    daiKyReason: string | null,
    daiKyAdvice: string,
  ): LongevityBadgeInfo {
    const reasons = [...(daiKyReason ? [daiKyReason] : []), ...additionalReasons];
    const levelWeight = { NONE: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;
    const minimumLevel: LongevityBadgeInfo['daiKyLevel'] = normalizedSeasonalNotes.length > 0
      ? 'HIGH'
      : isMonthlyTaboo ? 'MEDIUM' : 'NONE';
    const level = levelWeight[daiKyLevel] >= levelWeight[minimumLevel] ? daiKyLevel : minimumLevel;
    return {
      isThapTrai,
      thapTraiBadge,
      thapTraiAdvice,
      isMonthlyTaboo,
      monthlyTabooNote,
      seasonalNotes: normalizedSeasonalNotes,
      isDaiKy: level !== 'NONE',
      daiKyLevel: level,
      daiKyBadge: daiKyBadge ?? (
        normalizedSeasonalNotes.length > 0
          ? 'Ngày tiết khí cần lưu ý theo lịch cổ'
          : isMonthlyTaboo ? 'Ngày kiêng kỵ theo lịch tháng' : null
      ),
      daiKyReason: reasons.length > 0 ? reasons.join('\n') : null,
      daiKyAdvice,
    };
  }

  const cuuDocDays = [5, 6, 7, 15, 16, 17, 25, 26, 27];
  if (lunarMonth === 5 && cuuDocDays.includes(lunarDay)) {
    return makeResult(
      'CRITICAL',
      'Đại Kỵ Cửu Độc',
      'Một số tư liệu dân gian xếp ngày này vào nhóm Cửu Độc của tháng 5 âm lịch.',
      'Đây là quan niệm trong lịch cổ; nếu phù hợp với tín ngưỡng cá nhân, có thể xem như lời nhắc sinh hoạt điều độ. Không phải cảnh báo hay khuyến nghị y tế.',
    );
  }
  if (lunarDay === 1 || lunarDay === 15) {
    return makeResult(
      'HIGH',
      'Đại Kỵ Phòng Sự',
      lunarDay === 1
        ? 'Ngày Sóc (mùng 1) thường gắn với thực hành thanh trai trong một số tư liệu dân gian.'
        : 'Ngày Vọng (rằm) thường gắn với thực hành thanh trai trong một số tư liệu dân gian.',
      'Quan niệm kiêng cữ thuộc tín ngưỡng và phong tục; việc lựa chọn sinh hoạt là tùy mỗi người.',
    );
  }
  if (lunarDay === 14 || lunarDay === 16) {
    return makeResult(
      'HIGH',
      'Kỵ Phòng Sự (Giáp Rằm)',
      'Ngày trước và sau rằm được một số lịch cổ ghi là ngày cần lưu tâm.',
      'Đây là tập tục dân gian, không phải đánh giá khoa học về sức khỏe; sinh hoạt theo lựa chọn cá nhân.',
    );
  }
  if (lunarDay === 30 || (isMonthTotal29Days && lunarDay === 29)) {
    return makeResult(
      'HIGH',
      'Kỵ Phòng Sự (Cuối Tháng)',
      'Ngày cuối tháng âm lịch, còn gọi là ngày Hối trong một số tư liệu dân gian.',
      'Có thể xem như mốc chuyển tháng theo lịch truyền thống; nghỉ ngơi theo nhu cầu của bản thân.',
    );
  }
  if (lunarDay === 8 || lunarDay === 23) {
    return makeResult(
      'MEDIUM',
      'Nên Kiêng Dục',
      'Ngày bán nguyệt (thượng huyền hoặc hạ huyền) được một số lịch cổ ghi chú.',
      'Tập tục tham khảo theo lịch dân gian; mỗi người tự cân nhắc theo hoàn cảnh cá nhân.',
    );
  }
  if (normalizedSeasonalNotes.length > 0) {
    return makeResult(
      'NONE',
      null,
      null,
      'Một số tư liệu dưỡng sinh truyền thống khuyên tiết chế quanh các tiết khí này; đây không phải khuyến nghị y khoa.',
    );
  }
  if (isMonthlyTaboo) {
    return makeResult(
      'NONE',
      null,
      null,
      'Danh sách ngày theo phong tục/tín ngưỡng được cung cấp; việc thực hành tùy thuộc lựa chọn cá nhân.',
    );
  }
  return makeResult('NONE', null, null, 'Sinh hoạt và nghỉ ngơi điều độ theo nhịp sống của bản thân.');
}

export function evaluateThoKhang(lunarDay: number, lunarMonth: number): ThoKhangRule {
  const longevity = evaluateLongevityBadges(lunarDay, lunarMonth);
  return {
    severity: longevity.daiKyLevel,
    badge: longevity.daiKyBadge ?? 'Bình Hòa',
    advice: longevity.daiKyAdvice,
  };
}

export function getDestinyUserProfile(
  dateOfBirth: string,
  birthLunarYear: number,
): UserProfile | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!match || !Number.isInteger(birthLunarYear)) return null;
  const birthSolarYear = Number(match[1]);
  const birthSolarMonth = Number(match[2]);
  const birthSolarDay = Number(match[3]);
  if (
    birthSolarYear < 1900 || birthSolarYear > 2100 ||
    birthSolarMonth < 1 || birthSolarMonth > 12 ||
    birthSolarDay < 1 || birthSolarDay > 31
  ) return null;
  return { birthSolarDay, birthSolarMonth, birthSolarYear, birthLunarYear };
}

export function calculateDailyEvaluation(target: DayTarget, user: UserProfile | null): DailyEvaluation {
  const dayCanChi = getCanChiDay(target.solarDay, target.solarMonth, target.solarYear);
  const longevity = evaluateLongevityBadges(
    target.lunarDay,
    target.lunarMonth,
    target.isLeapMonth ?? false,
    target.isMonthTotal29Days ?? false,
    target.seasonalAvoidanceNotes ?? [],
  );
  const hours = get12Hours(dayCanChi.chiIndex);
  const isHoangDao = target.isHoangDao ?? true;
  const dayInfo = {
    solar: `${target.solarDay}/${target.solarMonth}/${target.solarYear}`,
    lunar: `${target.lunarDay}/${target.lunarMonth}`,
    canChiDay: dayCanChi.fullName,
    element: dayCanChi.element,
    isHoangDao,
  };

  if (!user) {
    const isGoodGeneral = isHoangDao && longevity.daiKyLevel !== 'CRITICAL';
    return {
      isPersonalized: false,
      dayInfo,
      longevity,
      hoursList: hours.map((hour) => ({ ...hour, isPersonalFavorable: false, badge: hour.isHoangDao ? 'Hoàng Đạo' : 'Hắc Đạo' })),
      generalStatus: isGoodGeneral ? 'NGÀY LÀNH THÔNG THƯỜNG' : 'NGÀY NÊN THẬN TRỌNG',
      recommendations: {
        dos: [
          longevity.isThapTrai ? 'Tùy tâm ăn chay, phóng sinh theo thực hành Thập Trai' : 'Thực hiện các công việc định kỳ',
          'Giữ tâm thái hòa nhã',
          'Nghỉ ngơi theo nhịp sinh hoạt phù hợp',
        ],
        donts: [
          longevity.isDaiKy ? 'Lưu ý phong tục kiêng kỵ theo lịch dân gian' : 'Sinh hoạt điều độ',
          'Tránh nóng giận, tranh chấp',
        ],
      },
    };
  }

  const userCanChi = getCanChiYear(user.birthLunarYear);
  let score = 50;
  const analysis: string[] = [];
  const dos: string[] = [];
  const donts: string[] = [];

  if (LUC_HOP[userCanChi.chiIndex] === dayCanChi.chiIndex) {
    score += 25;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Lục Hợp với tuổi (${userCanChi.chiName})`);
    dos.push('Ký kết hợp đồng', 'Gặp gỡ quý nhân', 'Khai trương');
  } else if (TAM_HOP_GROUPS.some((group) => group.includes(userCanChi.chiIndex) && group.includes(dayCanChi.chiIndex))) {
    score += 20;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Tam Hợp với tuổi (${userCanChi.chiName})`);
    dos.push('Hợp tác dự án mới', 'Bắt đầu kế hoạch quan trọng');
  } else if (LUC_XUNG[userCanChi.chiIndex] === dayCanChi.chiIndex) {
    score -= 30;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Lục Xung với tuổi (${userCanChi.chiName})`);
    donts.push('Cân nhắc kỹ trước khi xuất hành xa', 'Tránh tranh cãi đối đầu', 'Thận trọng với khoản chi lớn');
  } else if (TUONG_HAI[userCanChi.chiIndex] === dayCanChi.chiIndex) {
    score -= 20;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Tương Hại với tuổi (${userCanChi.chiName})`);
    donts.push('Cẩn trọng lời ăn tiếng nói', 'Đề phòng thị phi');
  }

  if (ELEMENT_SINH[dayCanChi.element] === userCanChi.element) {
    score += 20;
    analysis.push(`Mệnh ngày (${dayCanChi.element}) tương sinh bản mệnh (${userCanChi.element})`);
  } else if (dayCanChi.element === userCanChi.element) {
    score += 10;
    analysis.push(`Mệnh ngày (${dayCanChi.element}) đồng hành bản mệnh (${userCanChi.element})`);
  } else if (ELEMENT_KHAC[dayCanChi.element] === userCanChi.element) {
    score -= 20;
    analysis.push(`Mệnh ngày (${dayCanChi.element}) tương khắc bản mệnh (${userCanChi.element})`);
    donts.push('Tránh làm việc quá sức', 'Giữ tinh thần điềm tĩnh');
  }

  if (target.isHoangDao) score += 5;
  score = Math.max(0, Math.min(100, score));
  const classification = score >= 75 ? 'ĐẠI CÁT' : score < 50 ? 'XUNG TUỔI / NÊN CẨN TRỌNG' : 'BÌNH HÒA';
  if (longevity.isThapTrai) dos.unshift('Tùy tâm ăn chay, nuôi dưỡng lòng từ bi (Thập Trai)');
  if (longevity.isDaiKy) donts.unshift(longevity.daiKyBadge ?? 'Lưu ý phong tục theo lịch dân gian');
  const personalizedHours = hours.map((hour) => {
    const isLucHopHour = LUC_HOP[userCanChi.chiIndex] === hour.chiIndex;
    const isTamHopHour = TAM_HOP_GROUPS.some((group) => group.includes(userCanChi.chiIndex) && group.includes(hour.chiIndex));
    const isPersonalFavorable = hour.isHoangDao && (isLucHopHour || isTamHopHour);
    return {
      ...hour,
      isPersonalFavorable,
      badge: isPersonalFavorable ? 'Giờ Vàng Bản Mệnh' : hour.isHoangDao ? 'Hoàng Đạo' : 'Hắc Đạo',
    };
  });

  return {
    isPersonalized: true,
    userProfile: { canChiYear: userCanChi.fullName, element: userCanChi.element },
    dayInfo,
    destinyScore: score,
    classification,
    analysis,
    longevity,
    hoursList: personalizedHours,
    recommendations: {
      dos: dos.length > 0 ? dos : ['Tiến hành công việc bình thường', 'Giữ hòa khí'],
      donts: donts.length > 0 ? donts : ['Tránh hấp tấp, vội vã'],
    },
  };
}
