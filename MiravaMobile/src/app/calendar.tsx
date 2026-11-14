import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { CalendarHeader } from '@/components/calendar-header';
import { CalendarPage, Card } from '@/components/calendar-ui';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import { ChevronLeft, ChevronRight, Leaf, Moon } from 'lucide-react-native';
import { evaluateLongevityBadges } from '@/utils/destiny-engine';
import { getSeasonalAvoidanceNotes, getVietnameseLunarDate, getVietnameseLunarMonthLength } from '@/utils/vietnamese-lunar';

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const monthNames = ['Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu', 'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'];
const formatDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const { themeIndex } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const days = useMemo(() => Array.from(
    { length: new Date(year, month + 1, 0).getDate() },
    (_, index) => new Date(year, month, index + 1),
  ), [year, month]);
  const dayInfoByDate = useMemo(() => {
    return new Map(days.map((date) => {
      const lunar = getVietnameseLunarDate(date);
      const longevity = evaluateLongevityBadges(
        lunar.day,
        lunar.month,
        lunar.isLeapMonth,
        getVietnameseLunarMonthLength(date) === 29,
        getSeasonalAvoidanceNotes(date),
      );
      return [formatDateKey(date), longevity] as const;
    }));
  }, [days]);
  const selectedLunar = getVietnameseLunarDate(selectedDate);
  const selectedInfo = dayInfoByDate.get(formatDateKey(selectedDate));
  const selectedLongevity = selectedInfo ?? evaluateLongevityBadges(
    selectedLunar.day,
    selectedLunar.month,
    selectedLunar.isLeapMonth,
    getVietnameseLunarMonthLength(selectedDate) === 29,
    getSeasonalAvoidanceNotes(selectedDate),
  );
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;

  function changeMonth(amount: number) {
    setSelectedDate(new Date(year, month + amount, 1));
  }

  return (
    <CalendarPage>
      <CalendarHeader title="Lịch Tháng" onTodayPress={() => setSelectedDate(new Date())} />
      <Card>
        <View style={styles.monthHeader}>
          <Pressable accessibilityLabel="Tháng trước" onPress={() => changeMonth(-1)} hitSlop={12}>
            <ChevronLeft size={22} color={theme.accent} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: theme.text }]}>{monthNames[month]} {year}</Text>
          <Pressable accessibilityLabel="Tháng sau" onPress={() => changeMonth(1)} hitSlop={12}>
            <ChevronRight size={22} color={theme.accent} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {weekDays.map((day) => <Text key={day} style={[styles.weekday, { color: theme.muted }]}>{day}</Text>)}
          {Array.from({ length: offset }, (_, i) => <View key={`blank-${i}`} style={styles.daySlot}><View style={styles.dayCell} /></View>)}
          {days.map((date) => {
            const lunar = getVietnameseLunarDate(date);
            const selected = formatDateKey(date) === formatDateKey(selectedDate);
            const isToday = formatDateKey(date) === formatDateKey(new Date());
            const longevity = dayInfoByDate.get(formatDateKey(date));
            return (
              <View key={formatDateKey(date)} style={styles.daySlot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${date.getDate()} dương lịch, ngày âm ${lunar.day} tháng ${lunar.month}${longevity?.isThapTrai ? ', ngày Thập Trai' : ''}${longevity?.isDaiKy ? `, ${longevity.daiKyBadge}` : ''}`}
                  onPress={() => setSelectedDate(date)}
                  style={[styles.dayCell, selected && { backgroundColor: theme.accent }, isToday && !selected && { borderColor: theme.accent, borderWidth: 1 }]}>
                  <Text style={[styles.solar, { color: selected ? '#FFFFFF' : theme.text }]}>{date.getDate()}</Text>
                  <Text style={[styles.lunar, { color: selected ? '#FFFFFFCC' : theme.muted }]}>{lunar.day}</Text>
                  <View style={styles.badges}>
                    {longevity?.isThapTrai && <View style={[styles.vitalityMark, { backgroundColor: selected ? '#C6F0D2' : '#39724C' }]} />}
                    {longevity?.isDaiKy && (
                      <View style={[styles.vitalityMark, { backgroundColor: selected ? '#FFD2B8' : '#C45A37' }]} />
                    )}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#39724C' }]} />
            <Text style={[styles.legendText, { color: theme.muted }]}>Thập Trai</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#C45A37' }]} />
            <Text style={[styles.legendText, { color: theme.muted }]}>Kiêng kỵ · lịch tháng/Thọ Khang</Text>
          </View>
        </View>
      </Card>
      <Card>
        <Text style={[styles.detailDate, { color: theme.text }]}>
          {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}{selectedLunar.day}/{selectedLunar.month}{selectedLunar.isLeapMonth ? ' nhuận' : ''} âm lịch
        </Text>
        <Text style={[styles.detailHint, { color: theme.muted }]}>
          {selectedLongevity.isThapTrai || selectedLongevity.isDaiKy
            ? 'Ghi chú theo lịch tháng, tiết khí và tư liệu Thọ Khang Bảo Giám.'
            : 'Ngày thường · Không có ghi chú Thập Trai hoặc kiêng kỵ.'}
        </Text>
      </Card>
      {selectedLongevity.isThapTrai && (
        <Card style={{ ...styles.detailPanel, borderLeftColor: '#39724C' }}>
          <View style={styles.detailHeading}>
            <Leaf size={17} color="#39724C" />
            <Text style={[styles.detailTitle, { color: '#39724C' }]}>Ăn Chay & Phóng Sinh</Text>
          </View>
          <Text style={[styles.detailBadge, { color: '#39724C' }]}>{selectedLongevity.thapTraiBadge}</Text>
          <Text style={[styles.detailBody, { color: theme.text }]}>{selectedLongevity.thapTraiAdvice}</Text>
        </Card>
      )}
      {selectedLongevity.isDaiKy && (
        <Card style={{ ...styles.detailPanel, borderLeftColor: selectedLongevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#A17A32' }}>
          <View style={styles.detailHeading}>
            <Moon size={17} color={selectedLongevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#9A7331'} />
            <Text style={[styles.detailTitle, { color: selectedLongevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#9A7331' }]}>Dưỡng Tinh & Kiêng Kỵ</Text>
          </View>
          <Text style={[styles.detailBadge, { color: selectedLongevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#9A7331' }]}>
            {selectedLongevity.daiKyBadge}
          </Text>
          {selectedLongevity.daiKyReason && (
            <Text style={[styles.detailBody, { color: theme.text }]}>{selectedLongevity.daiKyReason}</Text>
          )}
          <Text style={[styles.detailBody, { color: theme.text }]}>{selectedLongevity.daiKyAdvice}</Text>
          <Text style={[styles.detailHint, { color: theme.muted }]}>Các mốc theo tư liệu dân gian, không phải dự báo hay khuyến nghị y tế.</Text>
        </Card>
      )}
    </CalendarPage>
  );
}

const styles = StyleSheet.create({
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  monthTitle: { fontSize: 17, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', fontSize: 10, fontWeight: '700', paddingBottom: 8 },
  daySlot: { width: '14.2857%', padding: 2 },
  dayCell: { width: '100%', height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  solar: { fontSize: 15, fontWeight: '700' },
  lunar: { fontSize: 10, marginTop: 1 },
  badges: { position: 'absolute', bottom: 2, minHeight: 8, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  vitalityMark: { width: 5, height: 5, borderRadius: 3 },
  detailDate: { fontSize: 14, fontWeight: '700' },
  detailHint: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  detailPanel: { borderLeftWidth: 3, paddingLeft: 13 },
  detailTitle: { fontSize: 14, fontWeight: '800' },
  detailHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailBadge: { fontSize: 11, fontWeight: '700', marginTop: 7 },
  detailBody: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#8884', paddingTop: 10, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10 },
});
