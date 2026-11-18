import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text';
import { CalendarPage, Card, SectionTitle, commonStyles } from '@/components/calendar-ui';
import { EmailPasswordAuth } from '@/components/email-password-auth';
import { GoogleSignIn } from '@/components/google-sign-in';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import { getBirthProfile, type BirthProfile } from '@/utils/birth-profile';
import { ChevronDown, UserRound } from 'lucide-react-native';

export default function ProfileScreen() {
  const {
    authUser,
    themeIndex,
    setThemeIndex,
    profileName,
    setProfileName,
    relativeNames,
    setRelativeNames,
    relativeBirthDates,
    setRelativeBirthDates,
    relativeBirthCalendarTypes,
    setRelativeBirthCalendarTypes,
    relativeGenders,
    setRelativeGenders,
    birthDate,
    setBirthDate,
    birthCalendarType,
    setBirthCalendarType,
    gender,
    setGender,
  } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  const [expandedRelative, setExpandedRelative] = useState<number | null>(null);
  const [themePickerVisible, setThemePickerVisible] = useState(false);

  function updateRelative(index: number, value: string) {
    setRelativeNames(relativeNames.map((name, current) => current === index ? value : name));
  }

  function updateRelativeValue(values: string[], setter: (next: string[]) => void, index: number, value: string) {
    const next = [...values];
    while (next.length <= index) next.push('');
    next[index] = value;
    setter(next);
  }

  const birthProfile = getBirthProfile(birthDate, birthCalendarType, gender);

  return (
    <CalendarPage>
      <View>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>THIẾT LẬP CỦA BẠN</Text>
        <Text style={[styles.title, { color: theme.text }]}>Cá nhân hóa</Text>
        <Text style={[commonStyles.muted, { color: theme.muted }]}>Quản lý hồ sơ và đồng bộ thiết lập cá nhân.</Text>
      </View>

      {authUser ? (
        <>
          <GoogleSignIn theme={theme} />
          <EmailPasswordAuth theme={theme} />
        </>
      ) : (
        <AccountLoginEntry theme={theme} />
      )}

      {authUser && (
        <>
      <Card>
        <SectionTitle detail="Dùng để cá nhân hóa phần lịch tham khảo">Hồ sơ bản mệnh</SectionTitle>
        <Text style={[styles.fieldLabel, { color: theme.muted }]}>Tên bản mệnh · mặc định lấy từ Google</Text>
        <TextInput value={profileName} onChangeText={setProfileName} placeholder="Tên của bạn" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, backgroundColor: theme.background }]} />
        <Text style={[styles.fieldLabel, { color: theme.muted }]}>Ngày sinh · YYYY-MM-DD</Text>
        <TextInput value={birthDate} onChangeText={setBirthDate} placeholder="1990-01-01" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.input, { color: theme.text, backgroundColor: theme.background }]} />
        <View style={[styles.optionRow, { marginTop: 9 }]}>
          {['Dương lịch', 'Âm lịch'].map((type) => (
            <Choice key={type} label={type} active={birthCalendarType === type} theme={theme} onPress={() => setBirthCalendarType(type)} />
          ))}
        </View>
        <View style={[styles.optionRow, { marginTop: 9 }]}>
          {['Nam', 'Nữ', 'Chưa chọn'].map((value) => (
            <Choice key={value} label={value} active={gender === value} theme={theme} onPress={() => setGender(value)} />
          ))}
        </View>
        <BirthProfileSummary profile={birthProfile} theme={theme} />
      </Card>

      <Card>
        <SectionTitle detail="Tối đa 3 hồ sơ bổ sung">Người thân</SectionTitle>
        {relativeNames.map((name, index) => (
          <View
            key={`relative-${index}`}
            style={[
              styles.relativeCard,
              {
                backgroundColor: theme.background,
                borderColor: expandedRelative === index ? theme.accent : theme.navigationBorder,
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: expandedRelative === index }}
              onPress={() => setExpandedRelative(expandedRelative === index ? null : index)}
              style={styles.relativeHeader}>
              <View style={[styles.relativeAvatar, { backgroundColor: `${theme.accent}18` }]}>
                {name.trim() ? (
                  <Text style={[styles.relativeInitial, { color: theme.accent }]}>
                    {name.trim().slice(0, 1).toUpperCase()}
                  </Text>
                ) : (
                  <UserRound size={19} color={theme.accent} strokeWidth={1.8} />
                )}
              </View>
              <View style={styles.relativeHeading}>
                <Text style={[styles.relativeName, { color: theme.text }]}>
                  {name.trim() || `Người thân ${index + 1}`}
                </Text>
                <View style={styles.relativeMeta}>
                  <Text style={[styles.relativeHint, { color: theme.muted }]}>
                    {name.trim()
                      ? (relativeBirthDates[index] ? `Ngày sinh ${relativeBirthDates[index]}` : 'Chưa thêm ngày sinh')
                      : 'Chạm để thêm thông tin'}
                  </Text>
                  {relativeBirthDates[index] ? <Text style={[styles.relativeDot, { color: theme.muted }]}>·</Text> : null}
                  {relativeBirthDates[index] ? (
                    <Text style={[styles.relativeHint, { color: theme.muted }]}>
                      {relativeBirthCalendarTypes[index] ?? 'Dương lịch'}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={[styles.relativeChevron, { backgroundColor: theme.card }]}>
                <ChevronDown
                  size={17}
                  color={expandedRelative === index ? theme.accent : theme.muted}
                  style={expandedRelative === index ? styles.chevronExpanded : undefined}
                />
              </View>
            </Pressable>
            {expandedRelative === index && (
              <View style={[styles.relativeDetails, { borderTopColor: theme.navigationBorder }]}>
                <Text style={[styles.relativeSectionLabel, { color: theme.accent }]}>THÔNG TIN HỒ SƠ</Text>
                <TextInput
                  value={name}
                  onChangeText={(value) => updateRelative(index, value)}
                  placeholder={`Tên người thân ${index + 1}`}
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Ngày sinh · YYYY-MM-DD</Text>
                <TextInput
                  value={relativeBirthDates[index] ?? ''}
                  onChangeText={(value) => updateRelativeValue(relativeBirthDates, setRelativeBirthDates, index, value)}
                  placeholder="1990-01-01"
                  placeholderTextColor={theme.muted}
                  autoCapitalize="none"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <View style={[styles.optionRow, { marginTop: 8 }]}>
                  {['Dương lịch', 'Âm lịch'].map((type) => (
                    <Choice
                      key={type}
                      label={type}
                      active={(relativeBirthCalendarTypes[index] ?? 'Dương lịch') === type}
                      theme={theme}
                      onPress={() => updateRelativeValue(relativeBirthCalendarTypes, setRelativeBirthCalendarTypes, index, type)}
                    />
                  ))}
                </View>
                <View style={[styles.optionRow, { marginTop: 8 }]}>
                  {['Nam', 'Nữ', 'Chưa chọn'].map((value) => (
                    <Choice
                      key={value}
                      label={value}
                      active={(relativeGenders[index] ?? 'Chưa chọn') === value}
                      theme={theme}
                      onPress={() => updateRelativeValue(relativeGenders, setRelativeGenders, index, value)}
                    />
                  ))}
                </View>
                <BirthProfileSummary
                  profile={getBirthProfile(
                    relativeBirthDates[index] ?? '',
                    relativeBirthCalendarTypes[index] ?? 'Dương lịch',
                    relativeGenders[index] ?? 'Chưa chọn',
                  )}
                  theme={theme}
                />
                <Text style={[styles.relativeHint, { color: theme.muted }]}>Có thể chọn hồ sơ này trong đầu tab Hôm Nay, Lịch và Tra ngày.</Text>
              </View>
            )}
          </View>
        ))}
        {relativeNames.length < 3 && (
          <Pressable
            onPress={() => {
              setRelativeNames([...relativeNames, '']);
              setRelativeBirthDates([...relativeBirthDates, '']);
              setRelativeBirthCalendarTypes([...relativeBirthCalendarTypes, 'Dương lịch']);
              setRelativeGenders([...relativeGenders, 'Chưa chọn']);
              setExpandedRelative(relativeNames.length);
            }}
            style={[styles.addRelative, { borderColor: theme.accent }]}>
            <Text style={[styles.addRelativeText, { color: theme.accent }]}>＋ Thêm người thân</Text>
          </Pressable>
        )}
      </Card>

        </>
      )}

      <Card>
        <SectionTitle detail="5 chủ đề lễ hội & mùa màng với hiệu ứng khí quyển sống động">Giao diện lễ hội</SectionTitle>
        <View style={{ gap: 8, marginTop: 10 }}>
          {calendarThemes.map((option, index) => {
            const isSelected = themeIndex === index;
            const themeIcons: Record<string, string> = {
              tet: '🏮 🌸',
              trungthu: '🌕 🏮',
              muahe: '☼ 🪷',
              muadong: '❄ ❅',
              giangsinh: '🎄 🔔',
            };
            return (
              <Pressable
                key={option.themeKey}
                accessibilityRole="button"
                onPress={() => setThemeIndex(index)}
                style={[
                  styles.themeSelectCard,
                  {
                    backgroundColor: isSelected ? `${option.accent}14` : option.card,
                    borderColor: isSelected ? option.accent : option.navigationBorder,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}>
                <View style={[styles.themeIconCircle, { backgroundColor: `${option.accent}20` }]}>
                  <Text style={{ fontSize: 16 }}>{themeIcons[option.themeKey] ?? '✨'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={[styles.themeCardName, { color: option.text, fontWeight: isSelected ? '800' : '600' }]}>
                    {option.name}
                  </Text>
                  <Text numberOfLines={1} style={[styles.themeCardSubtitle, { color: option.muted }]}>
                    {option.subtitle}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.selectedCheckBadge, { backgroundColor: option.accent }]}>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>
    </CalendarPage>
  );
}

function AccountLoginEntry({ theme }: { theme: (typeof calendarThemes)[number] }) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={[styles.loginEntry, { backgroundColor: theme.card, borderColor: theme.navigationBorder }]}>
        <View style={[styles.loginEntryIcon, { backgroundColor: `${theme.accent}18` }]}>
          <Text style={[styles.loginEntryMonogram, { color: theme.accent }]}>L</Text>
        </View>
        <View style={styles.loginEntryCopy}>
          <Text style={[styles.loginEntryTitle, { color: theme.text }]}>Đăng nhập</Text>
          <Text style={[styles.loginEntryDescription, { color: theme.muted }]}>
            Đồng bộ hồ sơ và thiết lập cá nhân
          </Text>
        </View>
        <Text style={[styles.loginEntryArrow, { color: theme.accent }]}>›</Text>
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={[styles.loginScreen, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <ScrollView
            contentContainerStyle={styles.loginScreenContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng màn hình đăng nhập"
              onPress={() => setVisible(false)}
              style={[styles.loginClose, { backgroundColor: theme.card, borderColor: theme.navigationBorder }]}>
              <Text style={[styles.loginCloseText, { color: theme.text }]}>×</Text>
            </Pressable>

            <View style={styles.loginHero}>
              <View style={[styles.loginBrandMark, { backgroundColor: theme.accent }]}>
                <Text style={[styles.loginBrandLetter, { color: theme.card }]}>L</Text>
              </View>
              <Text style={[styles.loginEyebrow, { color: theme.accent }]}>LỊCH VIỆT · TÀI KHOẢN</Text>
              <Text style={[styles.loginHeroTitle, { color: theme.text }]}>Không gian của bạn,{"\n"}luôn được đồng bộ</Text>
              <Text style={[styles.loginHeroSubtitle, { color: theme.muted }]}>
                Đăng nhập để lưu hồ sơ và tiếp tục hành trình cá nhân hóa trên mọi thiết bị.
              </Text>
            </View>

            <View style={styles.loginMethods}>
              <GoogleSignIn theme={theme} />
              <View style={styles.loginDivider}>
                <View style={[styles.loginDividerLine, { backgroundColor: theme.navigationBorder }]} />
                <Text style={[styles.loginDividerText, { color: theme.muted }]}>HOẶC DÙNG EMAIL</Text>
                <View style={[styles.loginDividerLine, { backgroundColor: theme.navigationBorder }]} />
              </View>
              <EmailPasswordAuth theme={theme} />
            </View>

            <Text style={[styles.loginSecurityNote, { color: theme.muted }]}>
              Phiên đăng nhập được lưu trên thiết bị. Mật khẩu không được lưu lại.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function BirthProfileSummary({
  profile,
  theme,
}: {
  profile: BirthProfile | null;
  theme: (typeof calendarThemes)[number];
}) {
  return (
    <View style={[styles.resultBox, { backgroundColor: theme.background }]}>
      <Text style={[styles.resultTitle, { color: theme.text }]}>
        {profile ? `Mệnh ${profile.element} · Tuổi ${profile.zodiac}` : 'Thông tin bản mệnh'}
      </Text>
      {profile ? (
        <>
          <Text style={[styles.help, { color: theme.muted }]}>
            Năm âm lịch {profile.lunarYear} · {profile.yearCanChi}{profile.cung ? ` · Cung ${profile.cung} (${profile.cungElement})` : ' · Chọn giới tính để xem cung phi'}
          </Text>
          <Text style={[styles.help, { color: theme.text }]}>Màu hợp: {profile.compatibleColors.join(', ')}</Text>
          <Text style={[styles.help, { color: theme.muted }]}>Nên hạn chế: {profile.avoidColors}. {profile.guidance}</Text>
          <Text style={[styles.relativeHint, { color: theme.muted }]}>Mệnh và can-chi tính theo năm âm lịch; giờ sinh chưa tham gia tính. Theo ngũ hành dân gian, chỉ mang tính tham khảo.</Text>
        </>
      ) : (
        <Text style={[styles.help, { color: theme.muted }]}>Nhập ngày hợp lệ theo định dạng YYYY-MM-DD để xem mệnh và màu sắc tham khảo.</Text>
      )}
    </View>
  );
}

function Choice({ label, active, theme, onPress }: { label: string; active: boolean; theme: (typeof calendarThemes)[number]; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.choice, { backgroundColor: active ? `${theme.accent}18` : theme.background, borderColor: active ? theme.accent : theme.navigationBorder }]}>
      <Text style={[styles.choiceText, { color: active ? theme.accent : theme.text }]}>
        {label}{active ? '  ✓' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 26, fontWeight: '700', marginTop: 3 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { minHeight: 43, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  relativeCard: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, marginBottom: 10 },
  relativeHeader: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 },
  relativeAvatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  relativeInitial: { fontSize: 17, fontWeight: '800' },
  relativeHeading: { flex: 1, gap: 4 },
  relativeName: { fontSize: 13, fontWeight: '700' },
  relativeMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  relativeDetails: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingBottom: 12 },
  relativeSectionLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  relativeChevron: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
  relativeHint: { fontSize: 10 },
  relativeDot: { fontSize: 11 },
  addRelative: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', paddingVertical: 11, marginTop: 3 },
  addRelativeText: { fontSize: 12, fontWeight: '700' },
  optionRow: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  themeSelectCard: {
    minHeight: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  themeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCardName: { fontSize: 13, letterSpacing: 0.2 },
  themeCardSubtitle: { fontSize: 10.5, lineHeight: 14 },
  selectedCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeDropdown: { minHeight: 44, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11 },
  themeDropdownText: { flex: 1, fontSize: 13, fontWeight: '700' },
  themePickerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: '#0007' },
  themePickerPanel: { width: '100%', maxWidth: 420, maxHeight: '82%', borderRadius: 16, padding: 16 },
  themePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  themePickerTitle: { fontSize: 17, fontWeight: '800' },
  themePickerClose: { fontSize: 26, lineHeight: 28, paddingHorizontal: 4 },
  themePickerList: { flexGrow: 0 },
  themeOption: { minHeight: 45, borderWidth: 1.5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, paddingVertical: 8, marginTop: 7 },
  themeSwatch: { width: 15, height: 15, borderRadius: 8 },
  themeText: { flex: 1, fontSize: 11, fontWeight: '600' },
  themeCheck: { fontSize: 12, fontWeight: '800' },
  choice: { flex: 1, minWidth: 0, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10 },
  choiceText: { fontSize: 12, fontWeight: '600' },
  resultBox: { borderRadius: 8, padding: 12, marginTop: 14 },
  resultTitle: { fontSize: 13, fontWeight: '700' },
  help: { fontSize: 10, lineHeight: 15, marginTop: 7 },
  loginEntry: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 12, padding: 14 },
  loginEntryIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loginEntryMonogram: { fontSize: 22, fontWeight: '800' },
  loginEntryCopy: { flex: 1, gap: 4 },
  loginEntryTitle: { fontSize: 15, fontWeight: '700' },
  loginEntryDescription: { fontSize: 11 },
  loginEntryArrow: { fontSize: 27, lineHeight: 30, paddingHorizontal: 3 },
  loginScreen: { flex: 1 },
  loginScreenContent: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30 },
  loginClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 20, alignSelf: 'flex-end' },
  loginCloseText: { fontSize: 27, lineHeight: 30, marginTop: -2 },
  loginHero: { alignItems: 'center', paddingTop: 18, paddingBottom: 24 },
  loginBrandMark: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18, marginBottom: 17 },
  loginBrandLetter: { fontSize: 29, fontWeight: '800' },
  loginEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  loginHeroTitle: { fontSize: 25, lineHeight: 32, textAlign: 'center', fontWeight: '800', marginTop: 11 },
  loginHeroSubtitle: { maxWidth: 340, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 9 },
  loginMethods: { gap: 12 },
  loginDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 1 },
  loginDividerLine: { height: StyleSheet.hairlineWidth, flex: 1 },
  loginDividerText: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  loginSecurityNote: { fontSize: 10, textAlign: 'center', lineHeight: 15, marginTop: 17 },
});
