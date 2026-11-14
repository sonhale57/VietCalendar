const TIME_ZONE = 7;
const SYNODIC_MONTH = 29.530588853;
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const SOLAR_TERM_NAMES = [
  'Xuân Phân', 'Thanh Minh', 'Cốc Vũ', 'Lập Hạ', 'Tiểu Mãn', 'Mang Chủng',
  'Hạ Chí', 'Tiểu Thử', 'Đại Thử', 'Lập Thu', 'Xử Thử', 'Bạch Lộ',
  'Thu Phân', 'Hàn Lộ', 'Sương Giáng', 'Lập Đông', 'Tiểu Tuyết', 'Đại Tuyết',
  'Đông Chí', 'Tiểu Hàn', 'Đại Hàn', 'Lập Xuân', 'Vũ Thủy', 'Kinh Trập',
] as const;
const SEASONAL_AVOIDANCE_TERMS = new Set([0, 3, 9, 12, 15, 21]);
const SOLSTICE_TERMS = new Set([6, 18]);
const solarTermDatesByYear = new Map<number, { date: Date; index: number }[]>();

export type LunarDate = {
  day: number;
  month: number;
  year: number;
  isLeapMonth: boolean;
  dayCanChi: string;
  monthCanChi: string;
  yearCanChi: string;
};

export function getVietnameseLunarDate(solarDate: Date): LunarDate {
  const solarDay = solarDate.getDate();
  const solarMonth = solarDate.getMonth() + 1;
  const solarYear = solarDate.getFullYear();
  const dayNumber = getJulianDay(solarDay, solarMonth, solarYear);
  const newMoonIndex = Math.floor((dayNumber - 2415021.076998695) / SYNODIC_MONTH);
  let monthStart = newMoonDay(newMoonIndex + 1, TIME_ZONE);
  if (monthStart > dayNumber) {
    monthStart = newMoonDay(newMoonIndex, TIME_ZONE);
  }
  let month11 = getLunarMonth11(solarYear, TIME_ZONE);
  let month11Next = month11;
  let lunarYear: number;

  if (month11 >= monthStart) {
    lunarYear = solarYear;
    month11 = getLunarMonth11(solarYear - 1, TIME_ZONE);
  } else {
    lunarYear = solarYear + 1;
    month11Next = getLunarMonth11(solarYear + 1, TIME_ZONE);
  }

  const monthIndex = Math.floor((monthStart - month11) / 29);
  let lunarMonth = monthIndex + 11;
  let leapMonthOffset = 0;
  if (month11Next - month11 > 365) {
    leapMonthOffset = getLeapMonthOffset(month11, TIME_ZONE);
    if (monthIndex >= leapMonthOffset) {
      lunarMonth = monthIndex + 10;
    }
  }

  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && monthIndex < 4) lunarYear -= 1;

  const lunarDay = dayNumber - monthStart + 1;
  const dayCanChi = `${CAN[positiveModulo(dayNumber + 9, 10)]} ${CHI[positiveModulo(dayNumber + 1, 12)]}`;
  const monthCanChi = `${CAN[positiveModulo(lunarYear * 12 + lunarMonth + 3, 10)]} ${CHI[positiveModulo(lunarMonth + 1, 12)]}`;
  const yearCanChi = `${CAN[positiveModulo(lunarYear + 6, 10)]} ${CHI[positiveModulo(lunarYear + 8, 12)]}`;

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    isLeapMonth: monthIndex === leapMonthOffset && leapMonthOffset !== 0,
    dayCanChi,
    monthCanChi,
    yearCanChi,
  };
}

export function getVietnameseLunarMonthLength(solarDate: Date): 29 | 30 {
  const current = getVietnameseLunarDate(solarDate);
  const cursor = new Date(solarDate.getFullYear(), solarDate.getMonth(), solarDate.getDate());

  for (let offset = 1; offset <= 30; offset += 1) {
    cursor.setDate(cursor.getDate() + 1);
    const next = getVietnameseLunarDate(cursor);
    if (
      next.year !== current.year ||
      next.month !== current.month ||
      next.isLeapMonth !== current.isLeapMonth
    ) {
      return current.day + offset - 1 === 29 ? 29 : 30;
    }
  }

  throw new Error('Không xác định được độ dài tháng âm lịch.');
}

export function getSeasonalAvoidanceNotes(solarDate: Date): string[] {
  const year = solarDate.getFullYear();
  const termDates = getSolarTermDates(year);
  const selectedDay = new Date(year, solarDate.getMonth(), solarDate.getDate()).getTime();
  const notes: string[] = [];
  for (const term of termDates) {
    const termDay = term.date.getTime();
    const dayDistance = Math.round((selectedDay - termDay) / 86400000);
    if (SEASONAL_AVOIDANCE_TERMS.has(term.index) && dayDistance === 0) {
      notes.push(`Ngày tiết ${SOLAR_TERM_NAMES[term.index]}`);
    }
    if (SOLSTICE_TERMS.has(term.index) && Math.abs(dayDistance) <= 3) {
      notes.push(`${SOLAR_TERM_NAMES[term.index]} (mốc ${dayDistance === 0 ? 'đúng tiết' : `${Math.abs(dayDistance)} ngày ${dayDistance < 0 ? 'trước' : 'sau'}`})`);
    }
  }
  return notes;
}

function getSolarTermDates(year: number): { date: Date; index: number }[] {
  const cached = solarTermDatesByYear.get(year);
  if (cached) return cached;

  const dates: { date: Date; index: number }[] = [];
  let previousSector = getSolarTermSector(new Date(year, 0, 1));
  for (let dayOffset = 1; dayOffset < 366; dayOffset += 1) {
    const date = new Date(year, 0, 1 + dayOffset);
    if (date.getFullYear() !== year) break;
    const sector = getSolarTermSector(date);
    if (sector !== previousSector) {
      dates.push({ date: new Date(year, 0, dayOffset), index: sector });
      previousSector = sector;
    }
  }
  solarTermDatesByYear.set(year, dates);
  return dates;
}

function getSolarTermSector(date: Date): number {
  const longitude = sunLongitudeDegrees(
    getJulianDay(date.getDate(), date.getMonth() + 1, date.getFullYear()),
    TIME_ZONE,
  );
  return Math.floor(longitude / 15);
}

function getLunarMonth11(year: number, timeZone: number): number {
  const offset = getJulianDay(31, 12, year) - 2415021;
  const newMoonIndex = Math.floor(offset / SYNODIC_MONTH);
  let newMoon = newMoonDay(newMoonIndex, timeZone);
  if (sunLongitude(newMoon, timeZone) >= 9) {
    newMoon = newMoonDay(newMoonIndex - 1, timeZone);
  }
  return newMoon;
}

function getLeapMonthOffset(month11: number, timeZone: number): number {
  const newMoonIndex = Math.floor(0.5 + (month11 - 2415021.076998695) / SYNODIC_MONTH);
  let previousSector = -1;
  let monthOffset = 1;
  let sector = sunLongitude(newMoonDay(newMoonIndex + monthOffset, timeZone), timeZone);

  while (sector !== previousSector && monthOffset < 14) {
    previousSector = sector;
    monthOffset += 1;
    sector = sunLongitude(newMoonDay(newMoonIndex + monthOffset, timeZone), timeZone);
  }
  return monthOffset - 1;
}

function newMoonDay(newMoonIndex: number, timeZone: number): number {
  const t = newMoonIndex / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const degreesToRadians = Math.PI / 180;
  let julianDate =
    2415020.75933 +
    SYNODIC_MONTH * newMoonIndex +
    0.0001178 * t2 -
    0.000000155 * t3;
  julianDate += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * degreesToRadians);

  const meanSun = 359.2242 + 29.10535608 * newMoonIndex - 0.0000333 * t2 - 0.00000347 * t3;
  const meanMoon = 306.0253 + 385.81691806 * newMoonIndex + 0.0107306 * t2 + 0.00001236 * t3;
  const moonArgument = 21.2964 + 390.67050646 * newMoonIndex - 0.0016528 * t2 - 0.00000239 * t3;
  const correction =
    (0.1734 - 0.000393 * t) * Math.sin(meanSun * degreesToRadians) +
    0.0021 * Math.sin(2 * meanSun * degreesToRadians) -
    0.4068 * Math.sin(meanMoon * degreesToRadians) +
    0.0161 * Math.sin(2 * meanMoon * degreesToRadians) -
    0.0004 * Math.sin(3 * meanMoon * degreesToRadians) +
    0.0104 * Math.sin(2 * moonArgument * degreesToRadians) -
    0.0051 * Math.sin((meanSun + meanMoon) * degreesToRadians) -
    0.0074 * Math.sin((meanSun - meanMoon) * degreesToRadians) +
    0.0004 * Math.sin((2 * moonArgument + meanSun) * degreesToRadians) -
    0.0004 * Math.sin((2 * moonArgument - meanSun) * degreesToRadians) -
    0.0006 * Math.sin((2 * moonArgument + meanMoon) * degreesToRadians) +
    0.001 * Math.sin((2 * moonArgument - meanMoon) * degreesToRadians) +
    0.0005 * Math.sin((2 * meanMoon + meanSun) * degreesToRadians);

  const deltaT =
    t < -11
      ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
      : -0.000278 + 0.000265 * t + 0.000262 * t2;
  return Math.floor(julianDate + correction + deltaT + 0.5 + timeZone / 24);
}

function sunLongitude(julianDay: number, timeZone: number): number {
  return Math.floor(sunLongitudeDegrees(julianDay, timeZone) / 30);
}

function sunLongitudeDegrees(julianDay: number, timeZone: number): number {
  const t = (julianDay - 2451545.5 - timeZone / 24) / 36525;
  const t2 = t * t;
  const degreesToRadians = Math.PI / 180;
  const meanAnomaly = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
  const meanLongitude = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
  const equationOfCenter =
    (1.9146 - 0.004817 * t - 0.000014 * t2) * Math.sin(degreesToRadians * meanAnomaly) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * degreesToRadians * meanAnomaly) +
    0.00029 * Math.sin(3 * degreesToRadians * meanAnomaly);
  let longitude = (meanLongitude + equationOfCenter) * degreesToRadians;
  longitude -= 2 * Math.PI * Math.floor(longitude / (2 * Math.PI));
  return (longitude / Math.PI) * 180;
}

function getJulianDay(day: number, month: number, year: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let julianDay = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  if (year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)))) {
    julianDay += -Math.floor(y / 100) + Math.floor(y / 400) + 38;
  }
  return julianDay;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
