import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { calendarThemes, type CalendarTheme } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';

export { ImperialButton, type ImperialButtonProps } from './imperial-button';

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
      <SeasonalThemeEffect theme={theme} />
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * SeasonalThemeEffect: Hệ thống hiệu ứng khí quyển sống động cho từng Theme:
 * - Tết Nguyên Đán: Cánh hoa đào, hoa mai, lồng đèn đỏ, pháo hoa kim quang rơi đung đưa.
 * - Trung Thu: Vầng trăng tròn tỏa sáng, mây trôi, đom đóm & sao trời lấp lánh.
 * - Mùa Hè: Thái dương rạng ngời, tia nắng lấp lánh, hoa sen thơm ngát bồng bềnh.
 * - Mùa Đông: Bông tuyết trắng tinh khôi đa kích cỡ rơi chầm chậm tự nhiên.
 * - Giáng Sinh: Chuông vàng đung đưa, cây thông & quả châu, sao Noel lung linh.
 */
function SeasonalThemeEffect({ theme }: { theme: CalendarTheme }) {
  const animValue = useRef(new Animated.Value(0)).current;
  const secondaryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    secondaryAnim.setValue(0);

    const mainLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 3800,
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 3800,
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
      ]),
    );

    const secondaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(secondaryAnim, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
        Animated.timing(secondaryAnim, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
      ]),
    );

    mainLoop.start();
    secondaryLoop.start();

    return () => {
      mainLoop.stop();
      secondaryLoop.stop();
    };
  }, [animValue, secondaryAnim, theme.name]);

  const translateYMain = animValue.interpolate({ inputRange: [0, 1], outputRange: [-4, 22] });
  const translateYReverse = animValue.interpolate({ inputRange: [0, 1], outputRange: [18, -2] });
  const rotateSway = animValue.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '14deg'] });
  const rotateClockwise = animValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const opacityPulse = secondaryAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.95, 0.4] });
  const scalePulse = secondaryAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1.12, 0.92] });

  // Render Theme Effect theo từng chủ đề
  return (
    <View pointerEvents="none" style={styles.themeAtmosphereContainer}>
      {/* 1. Dải ruy băng vương giả ở đầu trang với màu chủ đạo của theme */}
      <View
        style={[
          styles.themeTopRibbon,
          {
            backgroundColor: `${theme.accent}12`,
            borderBottomColor: `${theme.accent}28`,
          },
        ]}>
        {/* Điểm nhấn hoa văn hoàng cung bên trái */}
        <Animated.Text style={[styles.cornerEmblem, { transform: [{ rotate: rotateSway }] }]}>
          {theme.themeKey === 'tet'
            ? '🏮'
            : theme.themeKey === 'trungthu'
              ? '🏮'
              : theme.themeKey === 'muahe'
                ? '☼'
                : theme.themeKey === 'muadong'
                  ? '❄'
                  : '🔔'}
        </Animated.Text>

        {/* Khẩu hiệu / mood của theme */}
        <View style={styles.ribbonCenter}>
          <Text numberOfLines={1} style={[styles.ribbonSubtitle, { color: theme.accent }]}>
            {theme.subtitle}
          </Text>
        </View>

        {/* Điểm nhấn hoa văn hoàng cung bên phải */}
        <Animated.Text style={[styles.cornerEmblem, { transform: [{ scale: scalePulse }] }]}>
          {theme.themeKey === 'tet'
            ? '🌸'
            : theme.themeKey === 'trungthu'
              ? '🌕'
              : theme.themeKey === 'muahe'
                ? '🪷'
                : theme.themeKey === 'muadong'
                  ? '❅'
                  : '⭐'}
        </Animated.Text>
      </View>

      {/* 2. Dàn hạt động lơ lửng / rơi tự nhiên (Floating Particles) */}
      <View style={styles.particlesContainer}>
        {theme.decoration.symbols.map((symbol, idx) => {
          const isEven = idx % 2 === 0;
          const isThird = idx % 3 === 0;
          const particleTranslateY = isEven ? translateYMain : translateYReverse;
          const particleRotate = isThird ? rotateClockwise : rotateSway;
          const particleSize = 15 + (idx % 4) * 3;

          return (
            <Animated.View
              key={`${theme.themeKey}-${symbol}-${idx}`}
              style={[
                styles.particleWrapper,
                {
                  transform: [{ translateY: particleTranslateY }, { rotate: particleRotate }],
                  opacity: opacityPulse,
                },
              ]}>
              <Text
                style={[
                  styles.particleSymbol,
                  {
                    fontSize: particleSize,
                    color: theme.decoration.color,
                    textShadowColor: `${theme.accent}55`,
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  },
                ]}>
                {symbol}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
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
  themeAtmosphereContainer: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
  },
  themeTopRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cornerEmblem: {
    fontSize: 16,
  },
  ribbonCenter: {
    flex: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  ribbonSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  particlesContainer: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginBottom: -10,
  },
  particleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleSymbol: {
    fontWeight: '700',
  },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 78, gap: 15 },
  card: { alignSelf: 'stretch', borderRadius: 8, padding: 16 },
  cardFooter: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#8884', paddingTop: 10, marginTop: 12, gap: 4 },
  sectionHeader: { gap: 4, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionDetail: { fontSize: 12, lineHeight: 17 },
});
