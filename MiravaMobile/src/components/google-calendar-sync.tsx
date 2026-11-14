import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text';
import { Card, SectionTitle, commonStyles } from '@/components/calendar-ui';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import type { GoogleCalendarAppEvent, GoogleCalendarEvent } from '@/services/account-api';
import { isFastingDay } from '@/utils/fasting-schedule';
import { getVietnameseLunarDate } from '@/utils/vietnamese-lunar';

const EVENTS_STORAGE_KEY = '@lich-viet/google-calendar-events';
const DELETED_EVENTS_STORAGE_KEY = '@lich-viet/google-calendar-deleted-events';
const DAY_RANGE = 90;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? '';

type PersonalEvent = { id: string; summary: string; date: string; googleEventId: string | null };
type DeletedEvent = { id: string; googleEventId: string | null };

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarClientId() {
  if (Platform.OS === 'ios') return iosClientId;
  if (Platform.OS === 'android') return androidClientId;
  return webClientId;
}

function getDateLabel(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('vi-VN');
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function createFastingEvents(fastingMode: string, startDate: Date, endDate: Date): GoogleCalendarAppEvent[] {
  const start = localDateString(startDate);
  const end = localDateString(endDate);
  if (fastingMode === 'Chay trường') {
    return [{
      id: 'fasting-continuous',
      summary: 'Chay trường · Thanh trai',
      description: 'Lịch Thập trai áp dụng chung trong ứng dụng Lịch Việt.',
      startDate: start,
      endDate: end,
      googleEventId: null,
    }];
  }

  const events: GoogleCalendarAppEvent[] = [];
  for (let offset = 0; offset < DAY_RANGE; offset += 1) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + offset);
    if (!isFastingDay(date, fastingMode)) continue;
    const lunar = getVietnameseLunarDate(date);
    const dateString = localDateString(date);
    events.push({
      id: `fasting-${dateString}`,
      summary: `Ngày Thanh Trai · ${lunar.day}/${lunar.month} âm lịch`,
      description: `Ngày chay theo lịch ${fastingMode} trong ứng dụng Lịch Việt.`,
      startDate: dateString,
      endDate: null,
      googleEventId: null,
    });
  }
  return events;
}

export function GoogleCalendarSync({ theme }: { theme: (typeof calendarThemes)[number] }) {
  const {
    fastingMode,
    googleCalendarConnected,
    googleCalendarError,
    connectGoogleCalendar,
    syncGoogleCalendar,
  } = useCalendarSettings();
  const clientId = getCalendarClientId();
  const clientConfigured = Boolean(clientId);
  const [request, response, promptAsync] = useAuthRequest({
    clientId: clientId || 'google-client-id-not-configured',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.events'],
    responseType: 'code',
    usePKCE: true,
    shouldAutoExchangeCode: false,
    selectAccount: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  }, {
    scheme: 'lichviet',
    path: 'google-calendar',
  });
  const [personalEvents, setPersonalEvents] = useState<PersonalEvent[]>([]);
  const [deletedEvents, setDeletedEvents] = useState<DeletedEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(localDateString(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const handledResponse = useRef<string | null>(null);
  const responseValidationError = response?.type === 'success' &&
    (!response.params.code || !request?.codeVerifier || !request.redirectUri || !request.clientId)
    ? 'Google không trả về mã OAuth/PKCE hợp lệ. Hãy thử kết nối lại.'
    : null;
  const responseError = response?.type === 'error'
    ? response.error?.message ?? 'Google không cấp quyền truy cập Calendar.'
    : null;

  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(EVENTS_STORAGE_KEY),
      AsyncStorage.getItem(DELETED_EVENTS_STORAGE_KEY),
    ])
      .then(([savedEvents, savedDeletedEvents]) => {
        if (!active) return;
        if (savedEvents) {
          const parsedEvents = JSON.parse(savedEvents) as unknown;
          if (Array.isArray(parsedEvents) && parsedEvents.every((item) =>
            item &&
            typeof item.id === 'string' &&
            typeof item.summary === 'string' &&
            typeof item.date === 'string')) {
            setPersonalEvents((parsedEvents as Partial<PersonalEvent>[]).map((item) => ({
              id: item.id!,
              summary: item.summary!,
              date: item.date!,
              googleEventId: typeof item.googleEventId === 'string' ? item.googleEventId : null,
            })));
          }
        }
        if (savedDeletedEvents) {
          const parsedDeletedEvents = JSON.parse(savedDeletedEvents) as unknown;
          if (Array.isArray(parsedDeletedEvents) && parsedDeletedEvents.every((item) =>
            item && typeof item.id === 'string')) {
            setDeletedEvents((parsedDeletedEvents as Partial<DeletedEvent>[]).map((item) => ({
              id: item.id!,
              googleEventId: typeof item.googleEventId === 'string' ? item.googleEventId : null,
            })));
          }
        }
      })
      .catch(() => {
        if (active) setError('Không đọc được sự kiện cá nhân đã lưu trên thiết bị.');
      })
      .finally(() => {
        if (active) setLoadingEvents(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loadingEvents) return;
    Promise.all([
      AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(personalEvents)),
      AsyncStorage.setItem(DELETED_EVENTS_STORAGE_KEY, JSON.stringify(deletedEvents)),
    ]).catch(() => setError('Không lưu được sự kiện cá nhân trên thiết bị.'));
  }, [deletedEvents, loadingEvents, personalEvents]);

  useEffect(() => {
    if (!response || response.type !== 'success') return;
    const code = response.params.code;
    if (!code || !request?.codeVerifier || !request.redirectUri || !request.clientId) return;

    const responseKey = `${response.params.state ?? ''}:${code}`;
    if (handledResponse.current === responseKey) return;
    handledResponse.current = responseKey;
    setLinking(true);
    setError(null);
    void connectGoogleCalendar({
      code,
      codeVerifier: request.codeVerifier,
      redirectUri: request.redirectUri,
      clientId: request.clientId,
    })
      .catch((linkError: unknown) => {
        setError(linkError instanceof Error ? linkError.message : 'Không thể kết nối Google Calendar.');
      })
      .finally(() => setLinking(false));
  }, [connectGoogleCalendar, request, response]);

  function addPersonalEvent() {
    const trimmedTitle = title.trim();
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(eventDate)
      ? new Date(`${eventDate}T00:00:00`)
      : new Date(Number.NaN);
    if (!trimmedTitle || trimmedTitle.length > 200) {
      setError('Tiêu đề sự kiện cần có từ 1 đến 200 ký tự.');
      return;
    }
    if (Number.isNaN(parsedDate.getTime()) || localDateString(parsedDate) !== eventDate) {
      setError('Ngày sự kiện cần theo định dạng YYYY-MM-DD.');
      return;
    }

    setPersonalEvents((events) => [
      ...events,
      {
        id: `personal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        summary: trimmedTitle,
        date: eventDate,
        googleEventId: null,
      },
    ]);
    setTitle('');
    setError(null);
  }

  async function synchronize() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + DAY_RANGE);
    const startDate = localDateString(start);
    const endDate = localDateString(end);
    const personal = personalEvents
      .filter((event) => event.date >= startDate && event.date < endDate)
      .map((event) => ({
        id: event.id,
        summary: event.summary,
        description: 'Sự kiện cá nhân được tạo trong ứng dụng Lịch Việt.',
        startDate: event.date,
        endDate: null,
        googleEventId: event.googleEventId,
      }));

    setSyncing(true);
    setError(null);
    try {
      const result = await syncGoogleCalendar({
        startDate,
        endDate,
        events: [...personal, ...createFastingEvents(fastingMode, start, end)],
        deletedEvents,
      });
      const syncedPersonalEvents = new Map(
        result
          .filter((event) => event.appEventId?.startsWith('personal-'))
          .map((event) => [event.appEventId!, event]),
      );
      setPersonalEvents((currentEvents) => currentEvents.flatMap((event) => {
        const syncedEvent = syncedPersonalEvents.get(event.id);
        if (syncedEvent) {
          return [{
            ...event,
            googleEventId: syncedEvent.id,
            summary: syncedEvent.summary,
            date: syncedEvent.start.slice(0, 10),
          }];
        }
        if (event.date < startDate || event.date >= endDate) return [event];
        if (!syncedEvent && event.googleEventId) return [];
        return [event];
      }));
      setPersonalEvents((currentEvents) => {
        const currentIds = new Set(currentEvents.map((event) => event.id));
        const importedEvents = Array.from(syncedPersonalEvents.entries())
          .filter(([id]) => !currentIds.has(id))
          .map(([id, event]) => ({
            id,
            summary: event.summary,
            date: event.start.slice(0, 10),
            googleEventId: event.id,
          }));
        return [...currentEvents, ...importedEvents];
      });
      setDeletedEvents([]);
      setGoogleEvents(result.filter((event) => event.appEventId === null));
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Không thể đồng bộ Google Calendar.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <SectionTitle detail="Sự kiện cá nhân, ngày âm và chu kỳ Thanh Trai">Google Calendar</SectionTitle>
      {!googleCalendarConnected ? (
        <View style={styles.section}>
          <Text style={[commonStyles.body, { color: theme.text }]}>
            Cho phép đồng bộ hai chiều trong phạm vi 90 ngày. Quyền truy cập chỉ dùng để đọc và cập nhật sự kiện trên lịch chính.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!request || !clientConfigured || linking}
            onPress={() => {
              setError(null);
              void promptAsync().catch((promptError: unknown) => {
                setError(promptError instanceof Error ? promptError.message : 'Không mở được cửa sổ Google Calendar.');
              });
            }}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accent },
              (!request || !clientConfigured || linking) && styles.disabled,
            ]}>
            <Text style={styles.primaryButtonText}>{linking ? 'Đang kết nối…' : 'Cho phép truy cập Calendar'}</Text>
          </Pressable>
          {!clientConfigured && (
            <Text style={[styles.helper, { color: theme.muted }]}>
              Cần cấu hình Google OAuth Client ID cho nền tảng này.
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.eventForm}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Tên sự kiện cá nhân"
              placeholderTextColor={theme.muted}
              maxLength={200}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            />
            <TextInput
              value={eventDate}
              onChangeText={setEventDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              style={[styles.dateInput, { color: theme.text, backgroundColor: theme.background }]}
            />
            <Pressable accessibilityRole="button" onPress={addPersonalEvent} style={[styles.addButton, { borderColor: theme.accent }]}>
              <Text style={[styles.addButtonText, { color: theme.accent }]}>Thêm</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={syncing}
            onPress={() => void synchronize()}
            style={[styles.primaryButton, { backgroundColor: theme.accent }, syncing && styles.disabled]}>
            <Text style={styles.primaryButtonText}>{syncing ? 'Đang đồng bộ…' : 'Đồng bộ trong 90 ngày tới'}</Text>
          </Pressable>
          <Text style={[styles.helper, { color: theme.muted }]}>
            Sự kiện Google hiển thị trong ứng dụng; sự kiện cá nhân và ngày Thanh Trai được tạo/cập nhật trên Google Calendar.
          </Text>
          {personalEvents.map((event) => (
            <View key={event.id} style={[styles.eventRow, { borderColor: theme.navigationBorder }]}>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>{event.summary}</Text>
                <Text style={[styles.helper, { color: theme.muted }]}>{getDateLabel(event.date)} · Cá nhân</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xóa sự kiện ${event.summary}`}
                onPress={() => {
                  setPersonalEvents((events) => events.filter((item) => item.id !== event.id));
                  setDeletedEvents((events) => [
                    ...events,
                    { id: event.id, googleEventId: event.googleEventId },
                  ]);
                }}>
                <Text style={[styles.removeText, { color: theme.muted }]}>Xóa</Text>
              </Pressable>
            </View>
          ))}
          {googleEvents.map((event) => (
            <View key={event.id} style={[styles.eventRow, { borderColor: theme.navigationBorder }]}>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>{event.summary}</Text>
                <Text style={[styles.helper, { color: theme.muted }]}>{getDateLabel(event.start)} · Google Calendar</Text>
              </View>
            </View>
          ))}
          {personalEvents.length === 0 && googleEvents.length === 0 && (
            <Text style={[styles.helper, { color: theme.muted }]}>Chưa có sự kiện cá nhân hoặc sự kiện Google được tải.</Text>
          )}
        </View>
      )}
      {(error || googleCalendarError || responseValidationError || responseError) && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error ?? googleCalendarError ?? responseValidationError ?? responseError}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  eventForm: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  input: { flex: 1, minHeight: 40, borderRadius: 8, paddingHorizontal: 10, fontSize: 12 },
  dateInput: { width: 103, minHeight: 40, borderRadius: 8, paddingHorizontal: 8, fontSize: 11 },
  addButton: { minHeight: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { fontSize: 11, fontWeight: '700' },
  primaryButton: { minHeight: 43, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  helper: { fontSize: 10, lineHeight: 15 },
  eventRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  eventInfo: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 12, fontWeight: '600' },
  removeText: { fontSize: 11, fontWeight: '600', padding: 5 },
  error: { color: '#B42318', fontSize: 11, lineHeight: 16 },
  disabled: { opacity: 0.55 },
});
