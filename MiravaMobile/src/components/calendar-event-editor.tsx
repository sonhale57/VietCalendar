import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';

import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import type { CalendarEvent, CalendarEventDraft } from '@/services/account-api';
import { getSolarDateFromLunar } from '@/utils/calendar-events';
import { getVietnameseLunarDate } from '@/utils/vietnamese-lunar';

export function CalendarEventEditor({
  visible,
  selectedDate,
  event,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  selectedDate: Date;
  event?: CalendarEvent;
  onClose: () => void;
  onSave: (draft: CalendarEventDraft) => Promise<void>;
  onDelete?: (event: CalendarEvent) => void;
}) {
  const { themeIndex } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  const [calendarType, setCalendarType] = useState<CalendarEventDraft['calendarType']>(
    event?.calendarType ?? 'solar',
  );
  const [year, setYear] = useState(String(event?.year ?? selectedDate.getFullYear()));
  const [month, setMonth] = useState(String(event?.month ?? selectedDate.getMonth() + 1));
  const [day, setDay] = useState(String(event?.day ?? selectedDate.getDate()));
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [recurrence, setRecurrence] = useState<CalendarEventDraft['recurrence']>(
    event?.recurrence ?? 'once',
  );
  const [label, setLabel] = useState(event?.label ?? '');
  const [countdown, setCountdown] = useState(event?.countdown ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function chooseCalendarType(next: CalendarEventDraft['calendarType']) {
    if (next === calendarType) return;
    if (next === 'lunar') {
      const solarDate = new Date(Number(year), Number(month) - 1, Number(day));
      const lunar = getVietnameseLunarDate(solarDate);
      setYear(String(lunar.year));
      setMonth(String(lunar.month));
      setDay(String(lunar.day));
    } else {
      const solarDate = getSolarDateFromLunar(Number(year), Number(month), Number(day));
      if (!solarDate) {
        setError('Không tìm được ngày dương tương ứng với ngày âm đã chọn.');
        return;
      }
      setYear(String(solarDate.getFullYear()));
      setMonth(String(solarDate.getMonth() + 1));
      setDay(String(solarDate.getDate()));
    }
    setCalendarType(next);
    setError(null);
  }

  async function submit() {
    const numericYear = Number(year);
    const numericMonth = Number(month);
    const numericDay = Number(day);
    if (!title.trim()) {
      setError('Vui lòng nhập tên sự kiện hoặc lời nhắc.');
      return;
    }
    const maximumDay = calendarType === 'lunar'
      ? 30
      : Number.isInteger(numericYear) && Number.isInteger(numericMonth) &&
          numericMonth >= 1 && numericMonth <= 12
        ? new Date(numericYear, numericMonth, 0).getDate()
        : 0;
    if (!Number.isInteger(numericYear) || numericYear < 1900 || numericYear > 2100 ||
        !Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12 ||
        !Number.isInteger(numericDay) || numericDay < 1 || numericDay > maximumDay) {
      setError('Ngày không hợp lệ. Năm hỗ trợ từ 1900 đến 2100.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        kind: event?.kind ?? 'event',
        calendarType,
        year: numericYear,
        month: numericMonth,
        day: numericDay,
        recurrence,
        label: label.trim() || null,
        countdown,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không lưu được sự kiện.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {!saving && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng biểu mẫu"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: theme.text }]}>
              {event ? 'Sửa sự kiện / lời nhắc' : 'Thêm sự kiện / lời nhắc'}
            </Text>

            <Text style={[styles.label, { color: theme.muted }]}>TÊN</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ví dụ: Sinh nhật mẹ"
              placeholderTextColor={theme.muted}
              maxLength={120}
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.navigationBorder }]}
            />

            <Text style={[styles.label, { color: theme.muted }]}>LỊCH NGÀY</Text>
            <View style={styles.choiceRow}>
              <Choice label="Dương lịch" selected={calendarType === 'solar'} themeIndex={themeIndex} onPress={() => chooseCalendarType('solar')} />
              <Choice label="Âm lịch" selected={calendarType === 'lunar'} themeIndex={themeIndex} onPress={() => chooseCalendarType('lunar')} />
            </View>
            <View style={styles.dateRow}>
              <DateInput label="Ngày" value={day} onChangeText={setDay} themeIndex={themeIndex} />
              <DateInput label="Tháng" value={month} onChangeText={setMonth} themeIndex={themeIndex} />
              <DateInput label="Năm" value={year} onChangeText={setYear} themeIndex={themeIndex} year />
            </View>
            {calendarType === 'lunar' && (
              <Text style={[styles.hint, { color: theme.muted }]}>
                Lặp âm lịch chỉ dùng tháng thường; bỏ qua ngày 30 nếu tháng đó chỉ có 29 ngày.
              </Text>
            )}

            <Text style={[styles.label, { color: theme.muted }]}>LẶP LẠI</Text>
            <View style={styles.choiceRow}>
              <Choice label="Một lần" selected={recurrence === 'once'} themeIndex={themeIndex} onPress={() => setRecurrence('once')} />
              <Choice label="Hằng năm" selected={recurrence === 'yearly'} themeIndex={themeIndex} onPress={() => setRecurrence('yearly')} />
            </View>

            <Text style={[styles.label, { color: theme.muted }]}>NHÃN (TÙY CHỌN)</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Ví dụ: Quan trọng"
              placeholderTextColor={theme.muted}
              maxLength={32}
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.navigationBorder }]}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: countdown }}
              onPress={() => setCountdown(!countdown)}
              style={styles.countdownOption}>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: countdown ? theme.accent : theme.card,
                    borderColor: countdown ? theme.accent : theme.navigationBorder,
                  },
                ]}>
                {countdown && <Check size={14} color={theme.card} />}
              </View>
              <View style={styles.countdownCopy}>
                <Text style={[styles.countdownTitle, { color: theme.text }]}>Đếm ngược sự kiện</Text>
              </View>
            </Pressable>

            <Text style={[styles.label, { color: theme.muted }]}>GHI CHÚ (TÙY CHỌN)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Thêm nội dung"
              placeholderTextColor={theme.muted}
              multiline
              maxLength={2000}
              style={[styles.input, styles.description, { color: theme.text, backgroundColor: theme.card, borderColor: theme.navigationBorder }]}
            />

            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.footer}>
              {event && onDelete && (
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => onDelete(event)}
                  style={[styles.footerButton, styles.deleteButton, { backgroundColor: '#A8423B', borderColor: '#A8423B' }]}>
                  <Trash2 size={15} color="#FFFFFF" />
                  <Text style={[styles.footerText, { color: '#FFFFFF' }]}>Xóa</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => void submit()}
                style={[styles.footerButton, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                <Text style={[styles.footerText, { color: theme.card }]}>{saving ? 'Đang lưu…' : 'Lưu'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Choice({
  label,
  selected,
  themeIndex,
  onPress,
}: {
  label: string;
  selected: boolean;
  themeIndex: number;
  onPress: () => void;
}) {
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choice,
        {
          backgroundColor: selected ? `${theme.accent}18` : theme.card,
          borderColor: selected ? theme.accent : theme.navigationBorder,
        },
      ]}>
      <Text style={[styles.choiceText, { color: selected ? theme.accent : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function DateInput({
  label,
  value,
  onChangeText,
  themeIndex,
  year = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  themeIndex: number;
  year?: boolean;
}) {
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  return (
    <View style={styles.dateInput}>
      <Text style={[styles.dateLabel, { color: theme.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        maxLength={year ? 4 : 2}
        style={[styles.input, styles.dateValue, { color: theme.text, backgroundColor: theme.card, borderColor: theme.navigationBorder }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0007' },
  sheet: { maxHeight: '94%', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 13, marginBottom: 6 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 11, borderWidth: 1, borderRadius: 9 },
  choiceText: { fontSize: 12, fontWeight: '700' },
  countdownOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, marginTop: 9 },
  checkbox: { width: 21, height: 21, borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  countdownCopy: { flex: 1, gap: 2 },
  countdownTitle: { fontSize: 12, fontWeight: '700' },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13 },
  dateRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dateInput: { flex: 1, gap: 5 },
  dateLabel: { fontSize: 10, fontWeight: '600' },
  dateValue: { textAlign: 'center' },
  description: { minHeight: 70, textAlignVertical: 'top' },
  hint: { fontSize: 11, lineHeight: 16, marginTop: 7 },
  error: { color: '#A15C54', fontSize: 12, marginTop: 10 },
  footer: { flexDirection: 'row', gap: 8, marginTop: 18 },
  footerButton: { flex: 1, minWidth: 0, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: 9, paddingHorizontal: 8 },
  deleteButton: { flex: 0.9 },
  footerText: { fontSize: 13, fontWeight: '700' },
});
