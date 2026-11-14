import { forwardRef, type ElementRef } from 'react';
import {
  TabList,
  TabSlot,
  Tabs,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { CalendarDays, Leaf, Search, type LucideIcon } from 'lucide-react-native';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';

const tabItems = [
  { name: 'index', href: '/', label: 'Hôm Nay', icon: 'today' },
  { name: 'calendar', href: '/calendar', label: 'Lịch', icon: 'calendar' },
  { name: 'fasting', href: '/fasting', label: 'Bảo Thọ', icon: 'fasting' },
  { name: 'finder', href: '/finder', label: 'Tra ngày', icon: 'finder' },
  { name: 'profile', href: '/profile', label: 'Cá nhân', icon: 'profile' },
] as const;

type Theme = (typeof calendarThemes)[number];
type TabIcon = (typeof tabItems)[number]['icon'];
const lucideTabIcons: Partial<Record<TabIcon, LucideIcon>> = {
  calendar: CalendarDays,
  fasting: Leaf,
  finder: Search,
};
const symbolTabIcons: Partial<Record<TabIcon, SymbolViewProps['name']>> = {
  today: { ios: 'sun.max', android: 'sunny', web: 'sunny' },
  profile: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
};

export default function AppTabsContent() {
  const { themeIndex, navigationStyle, navigationImage } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <TabBar
          theme={theme}
          bottomInset={insets.bottom}
          imageMode={navigationStyle === 'image'}
          imageUri={navigationImage}>
          {tabItems.map((item) => (
            <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
              <TabButton theme={theme} icon={item.icon} featured={item.name === 'fasting'}>{item.label}</TabButton>
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

const TabButton = forwardRef<
  ElementRef<typeof View>,
  Omit<TabTriggerSlotProps, 'ref'> & { theme: Theme; icon: TabIcon; featured: boolean }
>(function TabButton({ children, isFocused, theme, icon, featured, ...props }, ref) {
  const tintColor = isFocused ? theme.accent : theme.muted;
  const LucideTabIcon = lucideTabIcons[icon];
  const symbolIcon = symbolTabIcons[icon];
  return (
    <Pressable
      {...props}
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => StyleSheet.flatten([
        styles.tabButton,
        featured && styles.featuredTab,
        pressed ? styles.pressed : undefined,
      ])}>
      <View style={[
        styles.iconFrame,
        featured && [styles.featuredIcon, { backgroundColor: theme.accent }],
      ]}>
        {LucideTabIcon ? (
          <LucideTabIcon color={featured ? '#FFFFFF' : tintColor} size={featured ? 25 : 21} strokeWidth={2} />
        ) : symbolIcon ? (
          <SymbolView name={symbolIcon} tintColor={featured ? '#FFFFFF' : tintColor} size={featured ? 27 : 21} />
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.tabLabel, { color: featured ? theme.accent : tintColor }]}>{children}</Text>
      {isFocused && !featured && <View style={[styles.activeMark, { backgroundColor: theme.accent }]} />}
    </Pressable>
  );
});

function TabBar({
  children,
  theme,
  bottomInset,
  imageMode,
  imageUri,
  ...props
}: TabListProps & { theme: Theme; bottomInset: number; imageMode: boolean; imageUri?: string }) {
  const content = (
    <View style={[styles.barContent, { paddingBottom: Math.min(bottomInset, 7) }]}>
      {children}
    </View>
  );

  return (
    <View {...props} style={styles.barPosition}>
      {imageMode ? (
        <ImageBackground
          source={imageUri ? { uri: imageUri } : undefined}
          imageStyle={styles.barImage}
          style={[styles.bar, { backgroundColor: theme.navigationBackground, borderColor: `${theme.accent}55` }]}>
          <View style={styles.imageScrim}>{content}</View>
        </ImageBackground>
      ) : (
        <View
          style={[
            styles.bar,
            styles.monoBar,
            { backgroundColor: theme.navigationBackground, borderColor: theme.navigationBorder },
          ]}>
          {content}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barPosition: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bar: { overflow: 'visible', borderTopWidth: StyleSheet.hairlineWidth },
  monoBar: { borderRadius: 0 },
  barImage: { opacity: 0.8 },
  imageScrim: { backgroundColor: '#FFFFFFB8' },
  barContent: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tabButton: { minWidth: 50, flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 2 },
  featuredTab: {
    transform: [{ translateY: -6 }],
  },
  iconFrame: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  featuredIcon: { width: 50, height: 50, borderRadius: 25 },
  tabLabel: { fontSize: 10, fontWeight: '600', lineHeight: 13 },
  activeMark: { position: 'absolute', top: 0, width: 26, height: 2, borderRadius: 2 },
  pressed: { opacity: 0.65 },
});
