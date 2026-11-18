import { Pressable, StyleSheet, View } from 'react-native';
import { CalendarDays, Plus } from 'lucide-react-native';

import { AppText as Text } from '@/components/app-text';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';

export function CalendarHeader({
  title,
  onTodayPress,
  onAddEventPress,
}: {
  title: string;
  onTodayPress?: () => void;
  onAddEventPress?: () => void;
}) {
  const { themeIndex } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];

  return (
    <View style={styles.header}>
      <View style={styles.titleArea}>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>LỊCH VIỆT</Text>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      </View>
      <View style={styles.actions}>
        {onTodayPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn ngày hôm nay trong lịch"
            onPress={onTodayPress}
            style={({ pressed }) => [
              styles.todayButton,
              { backgroundColor: theme.card, opacity: pressed ? 0.65 : 1 },
            ]}>
            <CalendarDays size={16} color={theme.accent} />
            <Text style={[styles.todayText, { color: theme.text }]}>Hôm nay</Text>
          </Pressable>
        )}
        {onAddEventPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thêm sự kiện hoặc lời nhắc"
            onPress={onAddEventPress}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.accent, opacity: pressed ? 0.65 : 1 },
            ]}>
            <Plus size={19} color={theme.card} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  titleArea: { flexShrink: 1 },
  eyebrow: { fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '700', marginTop: 2 },
  addButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  todayButton: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 8 },
  todayText: { fontSize: 12, fontWeight: '600' },
});
