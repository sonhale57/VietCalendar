import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text';
import { CalendarPage, Card, CardFooter, ImperialButton, SectionTitle, commonStyles } from '@/components/calendar-ui';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import {
  CarFront,
  Coins,
  FileText,
  Heart,
  House,
  Plane,
  Scissors,
  Store,
  TriangleExclamationPoint,
  type LucideIcon,
} from 'lucide-react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { getBirthProfile } from '@/utils/birth-profile';
import { JOB_CATEGORIES, TRUC_NAMES } from '@/utils/job-config';
import { evaluateDayForJob, findGoodDaysForJob } from '@/utils/job-evaluation';

const QUICK_RANGES = [
  { days: 7, label: '7 ngày tới' },
  { days: 14, label: '14 ngày tới' },
  { days: 30, label: '30 ngày tới' },
] as const;
const CUSTOM_RANGE = 'Tùy chọn';
const DAY_INSPECTOR_TITLE = 'Đánh Giá Ngày';
const MAX_RANGE_DAYS = 60;
const JOB_ICONS: Record<string, LucideIcon> = {
  'file-text': FileText,
  plane: Plane,
  store: Store,
  'car-front': CarFront,
  house: House,
  heart: Heart,
  scissors: Scissors,
  coins: Coins,
};

type Person = {
  index: number;
  name: string;
  dateOfBirth: string;
  calendarType: string;
  gender: string;
};

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (year < 1900 || year > 2100) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function formatDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function getScoreTone(score: number, isConflict: boolean) {
  if (isConflict || score < 45) return '#A15C54';
  if (score >= 80) return '#A17A32';
  if (score >= 60) return '#36724A';
  return '#9A7B3A';
}

function DatePickerField({
  accessibilityLabel,
  label = 'Ngày muốn tra',
  value,
  valueText,
  theme,
  onChange,
  onChangeText,
}: {
  accessibilityLabel: string;
  label?: string;
  value: Date | null;
  valueText?: string;
  theme: (typeof calendarThemes)[number];
  onChange: (date: Date) => void;
  onChangeText?: (text: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const pickerValue = value ?? new Date();
  const displayedDate = value
    ? value.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Chọn ngày';
  const picker = visible ? (
    <DateTimePicker
      value={pickerValue}
      mode="date"
      display={Platform.OS === 'ios' ? 'inline' : 'default'}
      presentation={Platform.OS === 'ios' ? 'inline' : 'dialog'}
      locale="vi_VN"
      accentColor={theme.accent}
      onValueChange={(_event, date) => {
        onChange(date);
        if (Platform.OS === 'android') setVisible(false);
      }}
      onDismiss={() => setVisible(false)}
    />
  ) : null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.datePickerField}>
        <Text style={[styles.datePickerLabel, { color: theme.muted }]}>{label}</Text>
        <TextInput
          accessibilityLabel={`${accessibilityLabel}, định dạng năm-tháng-ngày`}
          value={valueText ?? (value ? formatDate(value) : '')}
          onChangeText={(text) => {
            onChangeText?.(text);
            const date = parseDate(text);
            if (date) onChange(date);
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          style={[styles.dateInput, { color: theme.text, backgroundColor: theme.background }]}
        />
      </View>
    );
  }

  return (
    <View style={styles.datePickerField}>
      <Text style={[styles.datePickerLabel, { color: theme.muted }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setVisible(true)}
        style={[styles.datePickerButton, { backgroundColor: theme.background }]}>
        <Text style={[styles.datePickerValue, { color: theme.text }]}>{displayedDate}</Text>
        <Text style={{ color: theme.accent }}>Chọn</Text>
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <View style={styles.datePickerOverlay}>
            <View style={[styles.datePickerModal, { backgroundColor: theme.card }]}>
              <Text style={[styles.analysisTitle, { color: theme.text }]}>{label}</Text>
              {picker}
              <Pressable onPress={() => setVisible(false)} style={[styles.searchButton, { backgroundColor: theme.accent }]}>
                <Text style={styles.searchButtonText}>Xong</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : picker}
    </View>
  );
}

export default function DayFinderScreen() {
  const {
    themeIndex,
    authUser,
    selectedProfile,
    setSelectedProfile,
    profileName,
    birthDate,
    birthCalendarType,
    gender,
    relativeNames,
    relativeBirthDates,
    relativeBirthCalendarTypes,
    relativeGenders,
    lunarCalendarAdvice,
    lunarCalendarAdviceError,
  } = useCalendarSettings();
  const [jobCode, setJobCode] = useState('KHAI_TRUONG');
  const [period, setPeriod] = useState<string>(QUICK_RANGES[0].label);
  const [lookupDate, setLookupDate] = useState(() => formatDate(new Date()));
  const [lookedUp, setLookedUp] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searched, setSearched] = useState(false);
  const [lookupMode, setLookupMode] = useState<'recommend' | 'specific'>('recommend');
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];

  const people = useMemo<Person[]>(() => [
    {
      index: 0,
      name: profileName || 'Bản thân',
      dateOfBirth: birthDate,
      calendarType: birthCalendarType,
      gender,
    },
    ...relativeNames
      .map((name, index) => ({
        name: name.trim(),
        dateOfBirth: relativeBirthDates[index] ?? '',
        calendarType: relativeBirthCalendarTypes[index] ?? 'Dương lịch',
        gender: relativeGenders[index] ?? 'Chưa chọn',
      }))
      .filter((person) => person.name.length > 0)
      .map((person, index) => ({ ...person, index: index + 1 })),
  ], [
    profileName,
    birthDate,
    birthCalendarType,
    gender,
    relativeNames,
    relativeBirthDates,
    relativeBirthCalendarTypes,
    relativeGenders,
  ]);
  const person = people.find((item) => item.index === selectedProfile) ?? people[0];
  const birthProfile = authUser
    ? getBirthProfile(person.dateOfBirth, person.calendarType, person.gender)
    : null;
  const evaluationProfile = birthProfile ? { ...birthProfile, name: person.name } : null;
  const selectedJob = JOB_CATEGORIES[jobCode];

  const dateRange = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const quickRange = QUICK_RANGES.find((range) => range.label === period);
    if (quickRange) {
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + quickRange.days - 1);
      return { from: startOfToday, to: end, error: null };
    }
    const from = parseDate(customStart);
    const to = parseDate(customEnd);
    if (!from || !to) return { from: null, to: null, error: 'Nhập ngày bắt đầu và kết thúc hợp lệ theo YYYY-MM-DD.' };
    if (from > to) return { from: null, to: null, error: 'Ngày kết thúc cần bằng hoặc sau ngày bắt đầu.' };
    const dayCount = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    if (dayCount > MAX_RANGE_DAYS) return { from: null, to: null, error: `Khoảng tra cứu tối đa là ${MAX_RANGE_DAYS} ngày.` };
    return { from, to, error: null };
  }, [period, customStart, customEnd]);

  const lookupDateValue = parseDate(lookupDate);
  const dayEvaluation = lookedUp && lookupDateValue
    ? evaluateDayForJob(lookupDateValue, jobCode, evaluationProfile, lunarCalendarAdvice)
    : null;
  const results = searched && dateRange.from && dateRange.to
    ? findGoodDaysForJob(dateRange.from, dateRange.to, jobCode, evaluationProfile, lunarCalendarAdvice)
    : [];

  return (
    <CalendarPage>
      <View>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>LỊCH VIỆT</Text>
        <Text style={[styles.title, { color: theme.text }]}>Tra ngày</Text>
        <Text style={[commonStyles.muted, { color: theme.muted }]}>Chọn cách tra cứu để xem thông tin ngày theo nhu cầu.</Text>
        {lunarCalendarAdviceError && (
          <Text style={[commonStyles.muted, { color: '#A15C54', marginTop: 6 }]}>{lunarCalendarAdviceError}</Text>
        )}
      </View>

      <Card>
        <SectionTitle detail="Chọn một cách tra cứu">Bạn muốn làm gì?</SectionTitle>
        <View style={styles.modeTabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: lookupMode === 'recommend' }}
            onPress={() => setLookupMode('recommend')}
            style={[styles.modeTab, { backgroundColor: lookupMode === 'recommend' ? theme.accent : theme.background }]}>
            <Text style={[styles.modeTabText, { color: lookupMode === 'recommend' ? '#FFFFFF' : theme.text }]}>Tìm ngày phù hợp</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: lookupMode === 'specific' }}
            onPress={() => setLookupMode('specific')}
            style={[styles.modeTab, { backgroundColor: lookupMode === 'specific' ? theme.accent : theme.background }]}>
            <Text style={[styles.modeTabText, { color: lookupMode === 'specific' ? '#FFFFFF' : theme.text }]}>Xem ngày cụ thể</Text>
          </Pressable>
        </View>
      </Card>

      {authUser && (
        <Card>
          <SectionTitle detail={person.name}>Chọn hồ sơ</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
            {people.map((item) => {
              const active = item.index === person.index;
              const profile = getBirthProfile(item.dateOfBirth, item.calendarType, item.gender);
              return (
                <Pressable
                  key={`${item.index}-${item.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setSelectedProfile(item.index);
                    setSearched(false);
                    setLookedUp(false);
                  }}
                  style={[styles.profileChip, { backgroundColor: active ? `${theme.accent}18` : theme.background, borderColor: active ? theme.accent : 'transparent' }]}>
                  <Text style={[styles.chipText, { color: active ? theme.accent : theme.text }]}>{item.name}</Text>
                  <Text style={[styles.profileChipDetail, { color: active ? theme.accent : theme.muted }]}>
                    {profile ? `${profile.yearCanChi} · Mệnh ${profile.element}` : 'Thêm ngày sinh trong Cá nhân'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {birthProfile ? (
            <Text style={[styles.profileDetail, { color: theme.muted }]}>
              Tuổi {birthProfile.zodiac} · Mệnh {birthProfile.element}{birthProfile.cung ? ` · Cung ${birthProfile.cung}` : ''}
            </Text>
          ) : (
            <Text style={[styles.profileDetail, { color: theme.muted }]}>Nhập ngày sinh và giới tính trong Cá nhân để tính hợp/xung theo hồ sơ.</Text>
          )}
        </Card>
      )}

      <Card>
        <SectionTitle detail="Chọn một trong tám nhóm việc">Công việc cần tra</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
          {Object.values(JOB_CATEGORIES).map((job) => {
            const active = jobCode === job.code;
            const Icon = JOB_ICONS[job.icon];
            return (
              <Pressable
                key={job.code}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setJobCode(job.code);
                  setSearched(false);
                  setLookedUp(false);
                }}
                style={[styles.jobChip, { borderColor: active ? theme.accent : '#8885', backgroundColor: active ? `${theme.accent}16` : theme.background }]}>
                <Icon size={18} color={active ? theme.accent : theme.muted} strokeWidth={2} />
                <Text style={[styles.chipText, { color: active ? theme.accent : theme.text }]}>{job.name}</Text>
                <Text style={[styles.jobDetail, { color: theme.muted }]}>
                  Trực hợp: {job.goodTruc.map((index) => TRUC_NAMES[index]).join(' · ')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>

      {lookupMode === 'specific' ? (
        <>
          <Card>
            <SectionTitle detail={evaluationProfile ? `Đang xem cho: ${evaluationProfile.name}` : 'Đánh giá theo lịch chung'}>
              Chọn ngày muốn tra
            </SectionTitle>
            <DatePickerField
              accessibilityLabel="Ngày cần tra cứu"
              value={lookupDateValue ?? new Date()}
              valueText={lookupDate}
              theme={theme}
              onChange={(date) => {
                setLookupDate(formatDate(date));
                setLookedUp(false);
              }}
              onChangeText={(value) => {
                setLookupDate(value);
                setLookedUp(false);
              }}
            />
            <ImperialButton
              title={DAY_INSPECTOR_TITLE}
              onPress={() => setLookedUp(true)}
              style={{ marginTop: 12 }}
            />
            {lookedUp && !lookupDateValue && (
              <Text style={[styles.emptyMessage, { color: '#B42318' }]}>Ngày không hợp lệ. Chọn ngày trong khoảng năm 1900–2100.</Text>
            )}
          </Card>

          {dayEvaluation && lookupDateValue && (
            <Card>
              <SectionTitle detail={`${lookupDateValue.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${selectedJob.name}`}>
                Đánh giá ngày
              </SectionTitle>
              <View style={styles.scoreHeader}>
                <Text style={[styles.scoreValue, { color: getScoreTone(dayEvaluation.score, dayEvaluation.isConflictAge) }]}>
                  {dayEvaluation.score}/100
                </Text>
                <Text style={[styles.scoreClassification, { color: getScoreTone(dayEvaluation.score, dayEvaluation.isConflictAge) }]}>
                  {dayEvaluation.classificationLabel}
                </Text>
              </View>
              <View style={[styles.scoreTrack, { backgroundColor: `${theme.accent}20` }]}>
                <View style={[styles.scoreProgress, { width: `${dayEvaluation.score}%`, backgroundColor: getScoreTone(dayEvaluation.score, dayEvaluation.isConflictAge) }]} />
              </View>
              <Text style={[styles.daySummary, { color: theme.text, marginTop: 12 }]}>
                Âm lịch {dayEvaluation.lunarDate} · Ngày {dayEvaluation.canChiDay} · Mệnh ngày {dayEvaluation.elementDay}
              </Text>
              {dayEvaluation.isConflictAge && dayEvaluation.personalizedHighlights && (
                <View style={styles.conflictBanner}>
                  <View style={styles.conflictHeading}>
                    <TriangleExclamationPoint size={16} color="#A15C54" />
                    <Text style={styles.conflictTitle}>Cảnh báo xung tuổi</Text>
                  </View>
                  <Text style={styles.conflictBody}>
                    {dayEvaluation.canChiDay.split(' ')[1]} Lục Xung với tuổi {dayEvaluation.personalizedHighlights.profileName} ({evaluationProfile?.yearCanChi.split(' ')[1]}). Theo quan niệm lịch cổ, nên cân nhắc đổi ngày nếu có thể.
                  </Text>
                  <Text style={styles.conflictBody}>
                    {dayEvaluation.personalizedHighlights.favorableHours[0]
                      ? `Nếu cần thực hiện, có thể tham khảo ${dayEvaluation.personalizedHighlights.favorableHours[0]} là giờ Hoàng đạo hợp tuổi. Đây không phải cách bảo đảm hóa giải rủi ro.`
                      : 'Không có khung giờ Hoàng đạo vừa hợp tuổi trong ngày này; giờ tốt không bảo đảm hóa giải xung tuổi.'}
                  </Text>
                </View>
              )}
              <View style={styles.analysisBlock}>
                <Text style={[styles.analysisTitle, { color: theme.text }]}>1 · Độ hợp công việc</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {dayEvaluation.isHoangDao ? 'Ngày Hoàng đạo' : 'Ngày Hắc đạo'} · Trực {dayEvaluation.jobHighlights.trucName}: {dayEvaluation.jobHighlights.jobFit}.
                </Text>
                <Text style={[styles.detailValue, { color: dayEvaluation.jobHighlights.isTrucGood ? '#36724A' : dayEvaluation.jobHighlights.isTrucBad ? '#A15C54' : theme.text }]}>
                  {dayEvaluation.jobHighlights.isTrucGood
                    ? `Nên làm: ${selectedJob.name}.`
                    : dayEvaluation.jobHighlights.isTrucBad
                      ? `Nên tránh hoặc cân nhắc đổi ngày cho việc: ${selectedJob.name}.`
                      : `Trực trung tính với việc ${selectedJob.name}; cân nhắc các yếu tố khác.`}
                </Text>
                {dayEvaluation.jobHighlights.fixedBadDays.length > 0 && (
                  <Text style={[styles.detailValue, { color: '#A15C54', marginTop: 4 }]}>
                    Ngày kỵ với công việc: {dayEvaluation.jobHighlights.fixedBadDays.join(', ')}.
                  </Text>
                )}
                {dayEvaluation.jobHighlights.unsupportedBadFlags.length > 0 && (
                  <Text style={[styles.disclaimer, { color: theme.muted, marginTop: 4 }]}>
                    Chưa có dữ liệu ngày để tự động xét: {dayEvaluation.jobHighlights.unsupportedBadFlags.join(', ')}.
                  </Text>
                )}
              </View>
              {dayEvaluation.personalizedHighlights && (
                <>
                  <View style={styles.analysisBlock}>
                    <Text style={[styles.analysisTitle, { color: theme.text }]}>2 · Độ hợp tuổi · {dayEvaluation.personalizedHighlights.profileName}</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{dayEvaluation.personalizedHighlights.chiRelation}</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{dayEvaluation.personalizedHighlights.stemRelation}</Text>
                  </View>
                  <View style={styles.analysisBlock}>
                    <Text style={[styles.analysisTitle, { color: theme.text }]}>3 · Trợ lực ngũ hành</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{dayEvaluation.personalizedHighlights.elementRelation}</Text>
                  </View>
                </>
              )}
              <View style={styles.analysisBlock}>
                <Text style={[styles.analysisTitle, { color: theme.text }]}>
                  {dayEvaluation.personalizedHighlights ? '4 · Thọ Khang Bảo Giám' : '2 · Thọ Khang Bảo Giám'}
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {dayEvaluation.longevityNotes.isThapTrai ? 'Ngày Thập Trai: tùy tâm ăn chay trước việc lớn theo tín ngưỡng cá nhân.' : 'Không thuộc ngày Thập Trai.'}
                </Text>
                {dayEvaluation.longevityNotes.daiKyNote && (
                  <Text style={[styles.detailValue, { color: '#A15C54', marginTop: 4 }]}>
                    {dayEvaluation.longevityNotes.daiKyNote}
                  </Text>
                )}
              </View>
              <View style={styles.analysisBlock}>
                <Text style={[styles.analysisTitle, { color: theme.text }]}>Khung giờ trong ngày</Text>
                <View style={styles.hourGrid}>
                  {dayEvaluation.hours.map((hour) => (
                    <View key={hour.chiName} style={[styles.hourBadge, { backgroundColor: hour.isHoangDao ? '#E8F3EC' : theme.background }]}>
                      <Text style={[styles.hourBadgeName, { color: hour.isHoangDao ? '#39724C' : theme.text }]}>{hour.chiName}</Text>
                      <Text style={[styles.hourBadgeTime, { color: theme.muted }]}>{hour.timeRange}</Text>
                      <Text style={[styles.hourBadgeTime, { color: hour.isHoangDao ? '#39724C' : theme.muted }]}>
                        {hour.isHoangDao ? 'Hoàng đạo' : 'Hắc đạo'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={[styles.disclaimer, { color: theme.muted, marginTop: 12 }]}>
                Điểm số là cách xếp hạng theo quy tắc lịch cổ đã chọn, chỉ để tham khảo và không bảo đảm kết quả công việc.
              </Text>
            </Card>
          )}
        </>
      ) : (
        <>
          <Card>
            <SectionTitle detail="Tìm trong tối đa 60 ngày">Khoảng thời gian</SectionTitle>
            <View style={commonStyles.chipRow}>
              {[...QUICK_RANGES.map((range) => range.label), CUSTOM_RANGE].map((item) => {
                const active = period === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setPeriod(item);
                      setSearched(false);
                    }}
                    style={[styles.periodChip, { borderColor: active ? theme.accent : '#8885', backgroundColor: active ? `${theme.accent}16` : 'transparent' }]}>
                    <Text style={[styles.chipText, { color: active ? theme.accent : theme.text }]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
            {period === CUSTOM_RANGE && (
              <View style={styles.customRange}>
                <DatePickerField
                  accessibilityLabel="Ngày bắt đầu"
                  label="Từ ngày"
                  value={parseDate(customStart) ?? new Date()}
                  valueText={customStart}
                  theme={theme}
                  onChange={(date) => {
                    setCustomStart(formatDate(date));
                    setSearched(false);
                  }}
                  onChangeText={(value) => {
                    setCustomStart(value);
                    setSearched(false);
                  }}
                />
                <DatePickerField
                  accessibilityLabel="Ngày kết thúc"
                  label="Đến ngày"
                  value={parseDate(customEnd) ?? new Date()}
                  valueText={customEnd}
                  theme={theme}
                  onChange={(date) => {
                    setCustomEnd(formatDate(date));
                    setSearched(false);
                  }}
                  onChangeText={(value) => {
                    setCustomEnd(value);
                    setSearched(false);
                  }}
                />
              </View>
            )}
            <ImperialButton
              title="Tìm Ngày Tốt"
              onPress={() => setSearched(true)}
              style={{ marginTop: 12 }}
            />
          </Card>

          {searched && (
            <Card>
              <SectionTitle detail={`${selectedJob.name} · ${period}`}>Ngày phù hợp</SectionTitle>
              {evaluationProfile && (
                <View style={[styles.profileHighlight, { backgroundColor: `${theme.accent}12` }]}>
                  <Text style={[styles.analysisTitle, { color: theme.accent }]}>Tìm ngày cho: {evaluationProfile.name}</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {evaluationProfile.yearCanChi} · Mệnh {evaluationProfile.element}
                  </Text>
                </View>
              )}
              {dateRange.error && (
                <Text style={[styles.emptyMessage, { color: '#B42318' }]}>{dateRange.error}</Text>
              )}
              {!dateRange.error && results.length === 0 && (
                <Text style={[styles.emptyMessage, { color: theme.muted }]}>
                  Không có ngày đạt từ 50 điểm trở lên và không xung tuổi trong khoảng này. Hãy mở rộng khoảng ngày để tìm thêm lựa chọn.
                </Text>
              )}
              {results.map((item) => {
                const date = parseDate(item.date);
                if (!date) return null;
                const tone = getScoreTone(item.score, item.isConflictAge);
                const goodHours = item.hours.filter((hour) => hour.isHoangDao).slice(0, 3);
                return (
                  <Pressable
                    key={item.date}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem chi tiết ${date.toLocaleDateString('vi-VN')}, ${item.score} điểm`}
                    onPress={() => {
                      setLookupDate(item.date);
                      setLookedUp(true);
                      setLookupMode('specific');
                    }}
                    style={[styles.resultCard, { borderColor: `${tone}80`, backgroundColor: theme.card }]}>
                    <View style={[styles.dateBadge, { backgroundColor: `${tone}18` }]}>
                      <Text style={[styles.dateDay, { color: tone }]}>{date.getDate()}</Text>
                      <Text style={[styles.dateMonth, { color: tone }]}>TH{date.getMonth() + 1}</Text>
                    </View>
                    <View style={styles.resultText}>
                      <Text style={[styles.resultDate, { color: theme.text }]}>
                        {date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                      <Text style={[styles.resultTime, { color: theme.muted }]}>
                        {item.canChiDay} · Âm {item.lunarDate} · Trực {item.jobHighlights.trucName}
                      </Text>
                      <Text style={[styles.resultTime, { color: tone }]}>{item.classificationLabel} · {item.score} điểm</Text>
                      {item.personalizedHighlights && (
                        <Text style={[styles.resultTime, { color: theme.muted }]}>
                          {item.personalizedHighlights.chiRelation} · {item.personalizedHighlights.elementRelation}
                        </Text>
                      )}
                      <Text style={[styles.resultTime, { color: theme.muted }]}>
                        Giờ Hoàng đạo: {item.personalizedHighlights?.favorableHours.length
                          ? item.personalizedHighlights.favorableHours.slice(0, 3).join(' · ')
                          : goodHours.map((hour) => `${hour.chiName} ${hour.timeRange}`).join(' · ')}
                      </Text>
                    </View>
                    <Text style={[styles.rating, { color: tone }]}>{item.score}</Text>
                  </Pressable>
                );
              })}
              <CardFooter>
                <Text style={[styles.disclaimer, { color: theme.muted }]}>
                  Các ngày kỵ tự động xét hiện gồm Tam Nương và Nguyệt Kỵ; những Thần sát chưa có lịch đối chiếu được nêu rõ trong chi tiết ngày.
                  {!birthProfile && authUser ? ' Thêm ngày sinh trong Cá nhân để xếp hạng theo tuổi.' : ''}
                </Text>
              </CardFooter>
            </Card>
          )}
        </>
      )}
    </CalendarPage>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontSize: 26, fontWeight: '700', marginTop: 2 },
  modeTabs: { flexDirection: 'row', gap: 8 },
  modeTab: { flex: 1, minHeight: 48, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  modeTabText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  selectorRow: { gap: 8, paddingRight: 4 },
  profileChip: { minWidth: 150, borderWidth: 1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, gap: 3 },
  profileChipDetail: { fontSize: 10 },
  jobChip: { width: 188, minHeight: 82, borderWidth: 1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 11, gap: 4 },
  jobDetail: { fontSize: 9 },
  periodChip: { paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  profileDetail: { fontSize: 11, lineHeight: 16, marginTop: 9 },
  daySummary: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  customRange: { gap: 8, marginTop: 10 },
  datePickerField: { gap: 5 },
  datePickerLabel: { fontSize: 11, fontWeight: '600' },
  datePickerButton: { minHeight: 44, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  datePickerValue: { flex: 1, fontSize: 12, textTransform: 'capitalize' },
  datePickerOverlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 18 },
  datePickerModal: { borderRadius: 12, padding: 16, gap: 12 },
  dateInput: { minHeight: 42, borderRadius: 8, paddingHorizontal: 12, fontSize: 13 },
  searchButton: { alignItems: 'center', borderRadius: 8, paddingVertical: 13, marginTop: 20 },
  searchButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  scoreHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 5 },
  scoreValue: { fontSize: 28, fontWeight: '800' },
  scoreClassification: { flex: 1, fontSize: 11, fontWeight: '800' },
  scoreTrack: { height: 7, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  scoreProgress: { height: '100%', borderRadius: 4 },
  analysisBlock: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#7774', paddingTop: 10, marginTop: 10, gap: 4 },
  analysisTitle: { fontSize: 12, lineHeight: 17, fontWeight: '800' },
  conflictBanner: { backgroundColor: '#F8E9E5', borderLeftWidth: 3, borderLeftColor: '#A15C54', padding: 12, marginTop: 12, gap: 5 },
  conflictTitle: { color: '#A15C54', fontSize: 13, fontWeight: '800' },
  conflictHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  conflictBody: { color: '#633C38', fontSize: 11, lineHeight: 16 },
  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  hourBadge: { width: '31.5%', minHeight: 58, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingVertical: 5, paddingHorizontal: 2 },
  hourBadgeName: { fontSize: 11, fontWeight: '800' },
  hourBadgeTime: { fontSize: 8, marginTop: 2, textAlign: 'center' },
  profileHighlight: { borderRadius: 8, padding: 11, marginBottom: 8, gap: 3 },
  loginHint: { borderRadius: 8, padding: 11, marginTop: 8 },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginTop: 9, borderWidth: 1, borderRadius: 8 },
  dateBadge: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 20, fontWeight: '800' },
  dateMonth: { fontSize: 8, fontWeight: '700' },
  resultText: { flex: 1, gap: 4 },
  resultDate: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  resultTime: { fontSize: 11 },
  detailValue: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '500' },
  rating: { fontSize: 11, fontWeight: '700' },
  emptyMessage: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  disclaimer: { fontSize: 10, lineHeight: 15 },
});
