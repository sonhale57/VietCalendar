import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { useRouter } from 'expo-router';

import { CalendarHeader } from '@/components/calendar-header';
import { CalendarPage, Card, SectionTitle, commonStyles } from '@/components/calendar-ui';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import * as dailyAlmanac from '@/utils/daily-almanac';
import { getBirthProfile } from '@/utils/birth-profile';
import { calculateDailyEvaluation, getDestinyUserProfile } from '@/utils/destiny-engine';
import { isFastingDay, isTraditionalVitalityDay } from '@/utils/fasting-schedule';
import { getSeasonalAvoidanceNotes, getVietnameseLunarDate, getVietnameseLunarMonthLength } from '@/utils/vietnamese-lunar';

const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export default function TodayScreen() {
  const router = useRouter();
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
  } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  const lunar = useMemo(() => getVietnameseLunarDate(today), [today]);
  const lunarMonthLength = useMemo(() => getVietnameseLunarMonthLength(today), [today]);
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
    }, destinyProfile),
    [today, lunar.day, lunar.month, lunar.isLeapMonth, lunarMonthLength, almanac.isHoangDao, destinyProfile],
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
      <View style={[styles.dateCard, { backgroundColor: theme.accent }]}>
        <Text style={styles.dateLabel}>{weekdays[today.getDay().valueOf()].toUpperCase()} · {today.toLocaleDateString('vi-VN')}</Text>
        <Text style={styles.solarNumber}>{today.getDate()}</Text>
        <Text style={styles.lunarLine}>
          {lunar.day} tháng {lunar.month}{lunar.isLeapMonth ? ' nhuận' : ''} Âm lịch
        </Text>
        <Text style={styles.canChiLine}>Năm {lunar.yearCanChi} · Ngày {lunar.dayCanChi} · Tuổi {lunar.yearCanChi.split(' ')[1]}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở tab Bảo Thọ"
        onPress={() => router.push('/fasting')}
        style={[styles.fastingBadge, { backgroundColor: theme.card, borderColor: `${theme.accent}40` }]}>
        <Text style={[styles.fastingBadgeText, { color: theme.accent }]}>
          {fastingToday ? '🪷 Hôm nay: Ngày ăn chay & thanh tịnh thân thể' : '🪷 Chu kỳ chay & dưỡng sinh · Khám phá Bảo Thọ'}
        </Text>
        <Text style={[styles.bannerChevron, { color: theme.accent }]}>›</Text>
      </Pressable>

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
  dateCard: { borderRadius: 8, padding: 20 },
  dateLabel: { color: '#FFFFFFCC', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  solarNumber: { color: '#FFFFFF', fontSize: 64, lineHeight: 72, fontWeight: '700', marginTop: 5 },
  lunarLine: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginTop: 2 },
  canChiLine: { color: '#FFFFFFDD', fontSize: 12, marginTop: 8 },
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
