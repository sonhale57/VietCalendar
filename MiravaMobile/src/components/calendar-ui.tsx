import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';

export function CalendarPage({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle?: ViewStyle;
}) {
  const { themeIndex } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { themeIndex } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  return <View style={[styles.card, { backgroundColor: theme.card }, style]}>{children}</View>;
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <View style={styles.cardFooter}>{children}</View>;
}

export function SectionTitle({ children, detail }: { children: ReactNode; detail?: string }) {
  const { themeIndex } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{children}</Text>
      {detail ? <Text style={[styles.sectionDetail, { color: theme.muted }]}>{detail}</Text> : null}
    </View>
  );
}

export const commonStyles = StyleSheet.create({
  muted: { fontSize: 13, lineHeight: 20 },
  label: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#7773', marginVertical: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 78, gap: 15 },
  card: { alignSelf: 'stretch', borderRadius: 8, padding: 16 },
  cardFooter: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#8884', paddingTop: 10, marginTop: 12, gap: 4 },
  sectionHeader: { gap: 4, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionDetail: { fontSize: 12, lineHeight: 17 },
});
