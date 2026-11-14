import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { CalendarPage, Card, commonStyles } from '@/components/calendar-ui';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import { Activity, Leaf, Moon } from 'lucide-react-native';
import { evaluateLongevityBadges } from '@/utils/destiny-engine';
import { getSeasonalAvoidanceNotes, getVietnameseLunarDate, getVietnameseLunarMonthLength } from '@/utils/vietnamese-lunar';

type SubTab = 'fasting' | 'wellness';

export default function FastingScreen() {
  const { themeIndex } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('fasting');
  const [today] = useState(() => new Date());
  const lunar = useMemo(() => getVietnameseLunarDate(today), [today]);
  const lunarMonthLength = useMemo(() => getVietnameseLunarMonthLength(today), [today]);
  const longevity = useMemo(
    () => evaluateLongevityBadges(
      lunar.day,
      lunar.month,
      lunar.isLeapMonth,
      lunarMonthLength === 29,
      getSeasonalAvoidanceNotes(today),
    ),
    [lunar.day, lunar.month, lunar.isLeapMonth, lunarMonthLength, today],
  );
  return (
    <CalendarPage>
      <View>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>DƯỠNG SINH · CHÁNH NIỆM</Text>
        <Text style={[styles.title, { color: theme.text }]}>Bảo Thọ</Text>
        <Text style={[commonStyles.muted, { color: theme.muted }]}>Thanh trai, gìn giữ nếp sống điều độ và nuôi dưỡng sự an nhiên.</Text>
      </View>

      <View style={[styles.segment, { backgroundColor: theme.card }]}>
        <SubTabButton label="Ăn Chay" icon={Leaf} active={activeSubTab === 'fasting'} theme={theme} onPress={() => setActiveSubTab('fasting')} />
        <SubTabButton label="Dưỡng Sinh" icon={Activity} active={activeSubTab === 'wellness'} theme={theme} onPress={() => setActiveSubTab('wellness')} />
      </View>

      {activeSubTab === 'fasting' ? (
        <>
          {longevity.isThapTrai && (
            <Card style={{ ...styles.longevityPanel, borderLeftColor: '#39724C' }}>
              <View style={styles.sectionHeading}>
                <Leaf size={17} color="#39724C" />
                <Text style={[styles.sectionHeadingText, { color: theme.text }]}>Ăn Chay & Phóng Sinh</Text>
              </View>
              <Text style={[styles.note, { color: theme.muted }]}>Ngày {lunar.day}/{lunar.month} âm lịch{lunar.isLeapMonth ? ' nhuận' : ''}</Text>
              <Text style={[styles.ruleBadge, { color: '#39724C' }]}>{longevity.thapTraiBadge}</Text>
              <Text style={[commonStyles.body, { color: theme.text }]}>{longevity.thapTraiAdvice}</Text>
            </Card>
          )}
        </>
      ) : (
        <>
          {longevity.isDaiKy && (
            <Card style={{ ...styles.longevityPanel, borderLeftColor: longevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#A17A32' }}>
              <View style={styles.sectionHeading}>
                <Moon size={17} color={longevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#9A7331'} />
                <Text style={[styles.sectionHeadingText, { color: theme.text }]}>Dưỡng Tinh & Kiêng Kỵ</Text>
              </View>
              <Text style={[styles.note, { color: theme.muted }]}>Ngày {lunar.day}/{lunar.month} âm lịch · {longevity.daiKyLevel}</Text>
              <Text style={[styles.ruleBadge, { color: longevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#9A7331' }]}>
                {longevity.daiKyBadge}
              </Text>
              {longevity.daiKyReason && (
                <Text style={[commonStyles.body, { color: theme.text }]}>{longevity.daiKyReason}</Text>
              )}
              <Text style={[commonStyles.body, { color: theme.text }]}>{longevity.daiKyAdvice}</Text>
            </Card>
          )}
          {lunar.month === 5 && (
            <View style={[styles.seasonCard, { backgroundColor: '#F5E9DB' }]}>
              <Text style={[styles.recipeTitle, { color: '#764B32' }]}>Tháng 5 âm lịch · Lưu ý theo lịch cổ</Text>
              <Text style={[styles.note, { color: '#764B32' }]}>Một số ngày trong tháng được gọi là Cửu Độc ở tư liệu dân gian. Không có cơ sở để xem đây là “độc khí” hay cảnh báo y tế; hãy duy trì sinh hoạt và chế độ ăn phù hợp.</Text>
            </View>
          )}

        </>
      )}
    </CalendarPage>
  );
}

function SubTabButton({
  label,
  icon: Icon,
  active,
  theme,
  onPress,
}: {
  label: string;
  icon: typeof Leaf;
  active: boolean;
  theme: (typeof calendarThemes)[number];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.subTab, active && { backgroundColor: theme.background }]}>
      <Icon size={16} color={active ? theme.accent : theme.muted} strokeWidth={2} />
      <Text style={[styles.subTabText, { color: active ? theme.accent : theme.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 26, fontWeight: '700', marginTop: 3 },
  segment: { flexDirection: 'row', borderRadius: 8, padding: 4 },
  subTab: { minHeight: 42, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 8 },
  subTabText: { fontSize: 12, fontWeight: '700' },
  longevityPanel: { borderLeftWidth: 3, paddingLeft: 13 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionHeadingText: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 11, lineHeight: 17, marginTop: 10 },
  recipeTitle: { fontSize: 14, fontWeight: '700' },
  ruleBadge: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, marginBottom: 8 },
  seasonCard: { borderRadius: 8, padding: 16 },
});
