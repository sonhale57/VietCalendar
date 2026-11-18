import { useMemo, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';

import { AppText as Text } from '@/components/app-text';

import { CalendarHeader } from '@/components/calendar-header';
import { CalendarPage, Card, SectionTitle, commonStyles } from '@/components/calendar-ui';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import { getDaysUntilDate, getNextCalendarEventOccurrence, getNextLunarNewYearOccurrence } from '@/utils/calendar-events';
import * as dailyAlmanac from '@/utils/daily-almanac';
import { getBirthProfile } from '@/utils/birth-profile';
import { calculateDailyEvaluation, getDestinyUserProfile } from '@/utils/destiny-engine';
import { isFastingDay, isTraditionalVitalityDay } from '@/utils/fasting-schedule';
import { getSeasonalAvoidanceNotes, getVietnameseLunarDate, getVietnameseLunarMonthLength } from '@/utils/vietnamese-lunar';

const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const zodiacIllustrations: Record<string, ImageSourcePropType> = {
  Tý: require('@/assets/images/ConGiap/RAT.png'),
  Sửu: require('@/assets/images/ConGiap/OX.png'),
  Dần: require('@/assets/images/ConGiap/TIGER.png'),
  Mão: require('@/assets/images/ConGiap/RABBIT.png'),
  Thìn: require('@/assets/images/ConGiap/DRAGON.png'),
  Tỵ: require('@/assets/images/ConGiap/SNAKE.png'),
  Ngọ: require('@/assets/images/ConGiap/HORSE.png'),
  Mùi: require('@/assets/images/ConGiap/GOAT.png'),
  Thân: require('@/assets/images/ConGiap/MONKEY.png'),
  Dậu: require('@/assets/images/ConGiap/ROOSTER.png'),
  Tuất: require('@/assets/images/ConGiap/DOG.png'),
  Hợi: require('@/assets/images/ConGiap/PIG.png'),
};

export default function TodayScreen() {
  const { width } = useWindowDimensions();
  const [today] = useState(() => new Date());
  const {
    themeIndex,
    authUser,
    selectedProfile,
    profileName,
    birthDate,
    birthCalendarType,
    gender,
    relativeNames,
    relativeBirthDates,
    relativeBirthCalendarTypes,
    relativeGenders,
    fastingMode,
    calendarEvents,
    calendarEventsReady,
    lunarCalendarAdvice,
    lunarCalendarAdviceError,
  } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  const lunar = useMemo(() => getVietnameseLunarDate(today), [today]);
  const zodiacBranch = lunar.yearCanChi.split(' ')[1] ?? 'Tý';
  const dayZodiacBranch = lunar.dayCanChi.split(' ')[1] ?? 'Tý';
  const lunarMonthLength = useMemo(() => getVietnameseLunarMonthLength(today), [today]);
  const lunarNewYear = useMemo(() => getNextLunarNewYearOccurrence(today), [today]);
  const countdownEvent = useMemo(
    () => calendarEvents
      .filter((event) => event.countdown)
      .map((event) => ({ event, date: getNextCalendarEventOccurrence(event, today) }))
      .filter((item): item is { event: (typeof calendarEvents)[number]; date: Date } => item.date !== null)
      .sort((left, right) => left.date.getTime() - right.date.getTime())[0] ?? null,
    [calendarEvents, today],
  );
  const countdownTarget = calendarEventsReady && countdownEvent
    ? { title: countdownEvent.event.title, date: countdownEvent.date }
    : lunarNewYear
      ? { title: 'Tết Nguyên Đán', date: lunarNewYear }
      : null;
  const countdownDays = countdownTarget ? getDaysUntilDate(countdownTarget.date, today) : null;
  const profiles = [
    { name: profileName || 'Bản thân', dateOfBirth: birthDate, calendarType: birthCalendarType, gender },
    ...relativeNames
      .map((name, index) => ({
        name: name.trim(),
        dateOfBirth: relativeBirthDates[index] ?? '',
        calendarType: relativeBirthCalendarTypes[index] ?? 'Dương lịch',
        gender: relativeGenders[index] ?? 'Chưa chọn',
      }))
      .filter((profile) => profile.name.length > 0),
  ];
  const selectedPerson = profiles[selectedProfile] ?? profiles[0];
  const birthProfile = useMemo(
    () => authUser
      ? getBirthProfile(selectedPerson.dateOfBirth, selectedPerson.calendarType, selectedPerson.gender)
      : null,
    [authUser, selectedPerson.dateOfBirth, selectedPerson.calendarType, selectedPerson.gender],
  );
  const almanac = useMemo(
    () => dailyAlmanac.getDailyAlmanac(today, 'Xuất hành', birthProfile),
    [today, birthProfile],
  );
  const destinyProfile = useMemo(
    () => authUser && birthProfile
      ? getDestinyUserProfile(selectedPerson.dateOfBirth, birthProfile.lunarYear)
      : null,
    [authUser, birthProfile, selectedPerson.dateOfBirth],
  );
  const evaluation = useMemo(
    () => calculateDailyEvaluation({
      solarDay: today.getDate(),
      solarMonth: today.getMonth() + 1,
      solarYear: today.getFullYear(),
      lunarDay: lunar.day,
      lunarMonth: lunar.month,
      isLeapMonth: lunar.isLeapMonth,
      isMonthTotal29Days: lunarMonthLength === 29,
      isHoangDao: almanac.isHoangDao,
      seasonalAvoidanceNotes: getSeasonalAvoidanceNotes(today),
    }, destinyProfile, lunarCalendarAdvice),
    [
      today,
      lunar.day,
      lunar.month,
      lunar.isLeapMonth,
      lunarMonthLength,
      almanac.isHoangDao,
      destinyProfile,
      lunarCalendarAdvice,
    ],
  );
  const hourColumnCount = width >= 640 ? 6 : 4;
  const hourRows = Array.from(
    { length: Math.ceil(evaluation.hoursList.length / hourColumnCount) },
    (_, rowIndex) => evaluation.hoursList.slice(rowIndex * hourColumnCount, (rowIndex + 1) * hourColumnCount),
  );
  const fastingToday = isFastingDay(today, fastingMode);
  const vitalityDay = isTraditionalVitalityDay(today);
  const ratingTone = evaluation.isPersonalized
    ? evaluation.destinyScore >= 75 ? '#36724A' : evaluation.destinyScore < 50 ? '#A15C54' : '#9A7B3A'
    : almanac.rating === 'Thuận lợi' ? '#36724A' : almanac.rating === 'Cân nhắc' ? '#A15C54' : '#9A7B3A';

  return (
    <CalendarPage>
      <CalendarHeader title="Hôm Nay" />
      {lunarCalendarAdviceError && (
        <Text style={[styles.adviceLoadNotice, { color: theme.muted }]}>{lunarCalendarAdviceError}</Text>
      )}
      <View style={[styles.dateCard, { backgroundColor: theme.accent }]}>
        <View pointerEvents="none" style={styles.dateCardInset} />
        <Image
          pointerEvents="none"
          source={zodiacIllustrations[dayZodiacBranch] ?? zodiacIllustrations.Tý}
          resizeMode="contain"
          style={styles.zodiacWatermark}
        />
        <View style={styles.dateCardContent}>
          <View style={styles.dateCardHeader}>
            <View style={styles.dateHeading}>
              <Text style={styles.dateLabel}>
                {weekdays[today.getDay()].toUpperCase()} · {today.toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>
          <View style={styles.dateHero}>
            <Text style={styles.solarNumber}>{today.getDate()}</Text>
            <View style={styles.solarDivider} />
            <View style={styles.lunarDetails}>
              <Text style={styles.lunarCaption}>NGÀY ÂM LỊCH</Text>
              <Text style={styles.lunarLine}>
                {lunar.day} tháng {lunar.month}{lunar.isLeapMonth ? ' nhuận' : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.canChiLine}>
            Năm {lunar.yearCanChi} · Ngày {lunar.dayCanChi} · Tuổi {zodiacBranch}
          </Text>
        </View>
      </View>
      {countdownTarget && (
        <View style={[styles.countdownCard, { backgroundColor: theme.card, borderColor: '#D5B45C' }]}>
          <View style={styles.countdownCopy}>
            <Text style={[styles.countdownEyebrow, { color: '#A47718' }]}>ĐẾM NGƯỢC</Text>
            <Text style={[styles.countdownTitle, { color: theme.text }]}>{countdownTarget.title}</Text>
            <Text style={[styles.countdownDate, { color: theme.muted }]}>
              {countdownTarget.date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.countdownDaysBlock}>
            <Text style={[styles.countdownDays, { color: theme.accent }]}>{countdownDays}</Text>
            <Text style={[styles.countdownDaysLabel, { color: theme.muted }]}>
              {countdownDays === 0 ? 'hôm nay' : 'ngày nữa'}
            </Text>
          </View>
        </View>
      )}
      {evaluation.longevity.isThapTrai && (
        <View style={[styles.longevityBanner, { backgroundColor: '#E8F3EC', borderColor: '#39724C55' }]}>
          <Text style={[styles.longevityTitle, { color: '#39724C' }]}>🪷 {evaluation.longevity.thapTraiBadge}</Text>
          <Text style={[styles.longevityText, { color: theme.text }]}>{evaluation.longevity.thapTraiAdvice}</Text>
        </View>
      )}
      {evaluation.longevity.isDaiKy && (
        <View style={[styles.longevityBanner, { backgroundColor: evaluation.longevity.daiKyLevel === 'CRITICAL' ? '#F8E9E5' : '#F6F0E2', borderColor: evaluation.longevity.daiKyLevel === 'CRITICAL' ? '#A15C5455' : '#A17A3255' }]}>
          <Text style={[styles.longevityTitle, { color: evaluation.longevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#9A7331' }]}>
            {evaluation.longevity.daiKyLevel === 'CRITICAL' ? '⚠️' : '🛑'} {evaluation.longevity.daiKyBadge}
          </Text>
          <Text style={[styles.longevityText, { color: theme.text }]}>{evaluation.longevity.daiKyReason}</Text>
          <Text style={[styles.longevityText, { color: theme.muted }]}>{evaluation.longevity.daiKyAdvice}</Text>
        </View>
      )}

      <Card>
        <SectionTitle detail={`${authUser ? `${birthProfile ? selectedPerson.name : 'Thông tin chung'} · ` : ''}Ngày ${almanac.dayCanChi} · Trực ${almanac.officer}`}>
          XEM NGÀY TỐT XẤU HÔM NAY
        </SectionTitle>
        <View style={styles.ratingBanner}>
          <Text style={[styles.ratingTitle, { color: ratingTone }]}>
            {evaluation.isPersonalized ? evaluation.classification : evaluation.generalStatus}
          </Text>
          <Text style={[commonStyles.muted, { color: theme.muted }]}>
            {almanac.isHoangDao ? 'Ngày Hoàng đạo' : 'Ngày Hắc đạo theo lịch dân gian'}
            {authUser ? ` · ${almanac.personalCompatibility}` : ''}
          </Text>
        </View>
        {evaluation.isPersonalized && (
          <View style={styles.destinyScore}>
            <Text style={[styles.destinyScoreValue, { color: ratingTone }]}>{evaluation.destinyScore}/100</Text>
            <Text style={[commonStyles.muted, { color: theme.muted }]}>
              Cá nhân hóa theo tuổi {evaluation.userProfile.canChiYear} · mệnh {evaluation.userProfile.element}
            </Text>
          </View>
        )}
        {authUser && (
          <View style={styles.almanacMeta}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: theme.muted }]}>MỆNH</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{birthProfile?.element ?? 'Thông tin chung'}</Text>
            </View>
          </View>
        )}
        {almanac.warnings.length > 0 && (
          <Text style={[styles.dayWarning, { color: '#A15C54' }]}>Lưu ý: {almanac.warnings.join(' · ')}</Text>
        )}
        {evaluation.isPersonalized && evaluation.analysis.length > 0 && (
          <Text style={[styles.dayNote, { color: theme.text }]}>{evaluation.analysis.join(' · ')}</Text>
        )}
        {fastingToday && <Text style={[styles.dayNote, { color: theme.accent }]}>Ngày chay theo lịch {fastingMode}.</Text>}
        {vitalityDay && <Text style={[styles.dayNote, { color: theme.muted }]}>Ngày được đánh dấu lưu ý dưỡng sinh trong lịch truyền thống.</Text>}
      </Card>

      <Card>
        <SectionTitle detail={`12 khung giờ · Ngày ${almanac.dayCanChi}`}>Giờ Hoàng Đạo</SectionTitle>
        <View style={styles.hourGrid}>
          {hourRows.map((row, rowIndex) => (
            <View key={`hour-row-${rowIndex}`} style={styles.hourRow}>
              {row.map((hour) => {
                const favorable = hour.isHoangDao;
                const personalFavorable = hour.isPersonalFavorable;
                return (
                  <View key={hour.chiName} style={[styles.hourCell, { backgroundColor: personalFavorable ? '#E6F2E9' : favorable ? '#F3F4EC' : '#F0EFEC', borderColor: personalFavorable ? '#39724C88' : 'transparent', borderWidth: personalFavorable ? 1 : 0 }]}>
                    <Text style={[styles.hourText, { color: favorable ? '#39724C' : theme.muted }]}>{hour.chiName}</Text>
                    <Text style={[styles.hourStatus, { color: favorable ? '#39724C' : theme.muted }]}>{hour.badge}</Text>
                    <Text style={[styles.hourTime, { color: favorable ? '#39724C' : theme.muted }]}>{hour.timeRange}</Text>
                    <Text style={[styles.hourTime, { color: theme.muted }]}>{hour.starName}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle detail={`Theo ngày ${almanac.dayCanChi} ${birthProfile ? `· hồ sơ ${selectedPerson.name}` : ''}`}>Xuất hành hôm nay</SectionTitle>
        <View style={styles.travelRating}>
          <Text style={[styles.travelRatingText, { color: almanac.travelRating === 'Thuận lợi' ? '#36724A' : almanac.travelRating === 'Cần thận trọng' ? '#A15C54' : '#9A7B3A' }]}>
            {almanac.travelRating}
          </Text>
          {authUser && (
            <Text style={[styles.travelCompatibility, { color: theme.muted }]}>{almanac.personalCompatibility}</Text>
          )}
        </View>
        <View style={styles.directionRow}>
          <Text style={[styles.directionLabel, { color: theme.muted }]}>Hướng tốt</Text>
          <Text style={[styles.directionValue, { color: theme.text }]}>{almanac.favorableDirections.join(' · ')}</Text>
        </View>
        <View style={styles.directionRow}>
          <Text style={[styles.directionLabel, { color: theme.muted }]}>Hướng cần tránh</Text>
          <Text style={[styles.directionValue, { color: theme.text }]}>{almanac.unfavorableDirections.join(' · ')}</Text>
        </View>
      </Card>
    </CalendarPage>
  );
}

const styles = StyleSheet.create({
  dateCard: { position: 'relative', overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: '#E8C77A', paddingVertical: 16, paddingHorizontal: 19 },
  dateCardInset: { position: 'absolute', top: 7, right: 7, bottom: 7, left: 7, borderWidth: 1, borderColor: '#F3D59166', borderRadius: 13 },
  zodiacWatermark: { position: 'absolute', width: 148, height: 157, right: 5, bottom: -7, opacity: 0.82 },
  dateCardContent: { zIndex: 1, gap: 10 },
  dateCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateHeading: { gap: 3 },
  dateBrand: { color: '#F4D591', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  dateLabel: { color: '#FFFFFFDD', fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  dateBrandMark: { width: 33, height: 33, borderWidth: 1, borderColor: '#F4D591AA', borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF12' },
  dateBrandMarkText: { color: '#F4D591', fontSize: 10, fontWeight: '800' },
  dateHero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  solarNumber: { color: '#FFFFFF', fontSize: 64, lineHeight: 68, fontWeight: '800' },
  solarDivider: { width: 1, height: 46, backgroundColor: '#FFFFFF66' },
  lunarDetails: { gap: 4, maxWidth: '62%', alignItems: 'center', justifyContent: 'center' },
  lunarCaption: { color: '#F4D591', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  lunarLine: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '700' },
  canChiLine: { color: '#FFFFFFE8', fontSize: 11, fontWeight: '600', marginTop: 1 },
  countdownCard: { minHeight: 80, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  countdownCopy: { flex: 1, minWidth: 0, gap: 3 },
  countdownEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  countdownTitle: { fontSize: 15, fontWeight: '800' },
  countdownDate: { fontSize: 10 },
  countdownDaysBlock: { minWidth: 66, alignItems: 'center', justifyContent: 'center' },
  countdownDays: { fontSize: 27, lineHeight: 31, fontWeight: '800' },
  countdownDaysLabel: { fontSize: 9, fontWeight: '700' },
  fastingBadge: { minHeight: 48, borderWidth: 1, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, marginTop: -4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  fastingBadgeText: { flex: 1, fontSize: 11, fontWeight: '700' },
  bannerChevron: { fontSize: 24, lineHeight: 25 },
  longevityBanner: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 5, marginTop: -4 },
  longevityTitle: { fontSize: 13, fontWeight: '800' },
  longevityText: { fontSize: 11, lineHeight: 17 },
  ratingBanner: { borderLeftWidth: 3, borderLeftColor: '#9A7B3A', paddingLeft: 11, gap: 3 },
  ratingTitle: { fontSize: 18, fontWeight: '800' },
  almanacMeta: { flexDirection: 'row', gap: 12, marginTop: 14 },
  metaItem: { flex: 1, backgroundColor: '#8881', borderRadius: 8, padding: 10 },
  metaLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  metaValue: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  dayWarning: { fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 12 },
  adviceLoadNotice: { fontSize: 10, lineHeight: 15, marginTop: -7 },
  dayNote: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  hourGrid: { gap: 6 },
  hourRow: { flexDirection: 'row', gap: 6 },
  hourCell: { flex: 1, minWidth: 0, minHeight: 76, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 5, paddingHorizontal: 2 },
  hourText: { fontSize: 12, fontWeight: '700' },
  hourStatus: { fontSize: 7, marginTop: 2, textAlign: 'center' },
  hourTime: { fontSize: 8, marginTop: 2 },
  destinyScore: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  destinyScoreValue: { fontSize: 18, fontWeight: '800' },
  travelRating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  travelRatingText: { fontSize: 16, fontWeight: '800' },
  travelCompatibility: { fontSize: 11, fontWeight: '600' },
  directionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#7774', paddingVertical: 10 },
  directionLabel: { width: 105, fontSize: 11 },
  directionValue: { flex: 1, fontSize: 13, fontWeight: '700' },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 3 },
});
