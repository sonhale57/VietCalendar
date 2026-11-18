import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocalSearchParams } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text';
import { CalendarHeader } from '@/components/calendar-header';
import { CalendarEventEditor } from '@/components/calendar-event-editor';
import { CalendarPage, Card, CardFooter } from '@/components/calendar-ui';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import { ArrowRight, ChevronLeft, ChevronRight, Leaf, Moon, Share2, UserPlus } from 'lucide-react-native';
import { evaluateLongevityBadges } from '@/utils/destiny-engine';
import { getEventsOnCalendarDate } from '@/utils/calendar-events';
import { getSeasonalAvoidanceNotes, getVietnameseLunarDate, getVietnameseLunarMonthLength } from '@/utils/vietnamese-lunar';
import { getVietnameseSpecialDays } from '@/utils/vietnamese-special-days';
import type { CalendarEvent, CalendarEventDraft, SharedCalendarEvent } from '@/services/account-api';

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const monthNames = ['Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu', 'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'];
const formatDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export default function CalendarScreen() {
  const { shareToken } = useLocalSearchParams<{ shareToken?: string }>();
  const activeShareToken = typeof shareToken === 'string' ? shareToken : null;
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const {
    themeIndex,
    authUser,
    lunarCalendarAdvice,
    lunarCalendarAdviceError,
    calendarEvents,
    calendarEventsReady,
    calendarEventsError,
    calendarNotificationWarning,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    createCalendarEventShareLink,
    inviteCalendarEventUser,
    getSharedCalendarEvent,
    addSharedEventToCalendar,
    requestCalendarNotifications,
  } = useCalendarSettings();
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ id: string; draft: CalendarEventDraft } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [deleteReturnsToEditor, setDeleteReturnsToEditor] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<CalendarEvent | null>(null);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [sharedEventState, setSharedEventState] = useState<{
    token: string;
    preview?: SharedCalendarEvent;
    error?: string;
  } | null>(null);
  const [dismissedShareToken, setDismissedShareToken] = useState<string | null>(null);
  const [addedShareToken, setAddedShareToken] = useState<string | null>(null);
  const [addingSharedEvent, setAddingSharedEvent] = useState(false);
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
        lunarCalendarAdvice,
      );
      return [formatDateKey(date), { longevity, specialDays: getVietnameseSpecialDays(date) }] as const;
    }));
  }, [days, lunarCalendarAdvice]);
  const selectedLunar = getVietnameseLunarDate(selectedDate);
  const selectedInfo = dayInfoByDate.get(formatDateKey(selectedDate));
  const selectedSpecialDays = selectedInfo?.specialDays ?? [];
  const selectedEvents = getEventsOnCalendarDate(calendarEvents, selectedDate);
  const eventsByDate = useMemo(
    () => new Map(days.map((date) => [formatDateKey(date), getEventsOnCalendarDate(calendarEvents, date)] as const)),
    [days, calendarEvents],
  );
  const sharedPreview = sharedEventState?.token === activeShareToken ? sharedEventState.preview : undefined;
  const sharedEventError = sharedEventState?.token === activeShareToken ? sharedEventState.error : undefined;
  const sharedEventLoading = activeShareToken !== null && sharedEventState?.token !== activeShareToken;
  const sharedEventAlreadyAdded = sharedPreview
    ? calendarEvents.some((event) => event.isSharedCopy && event.sourceEventId === sharedPreview.event.id)
    : false;

  useEffect(() => {
    let active = true;
    if (!activeShareToken) return () => { active = false; };
    getSharedCalendarEvent(activeShareToken)
      .then((preview) => {
        if (active) setSharedEventState({ token: activeShareToken, preview });
      })
      .catch((error: unknown) => {
        if (active) {
          setSharedEventState({
            token: activeShareToken,
            error: error instanceof Error ? error.message : 'Không tải được sự kiện chia sẻ.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [activeShareToken, getSharedCalendarEvent]);
  const selectedLongevity = selectedInfo?.longevity ?? evaluateLongevityBadges(
    selectedLunar.day,
    selectedLunar.month,
    selectedLunar.isLeapMonth,
    getVietnameseLunarMonthLength(selectedDate) === 29,
    getSeasonalAvoidanceNotes(selectedDate),
    lunarCalendarAdvice,
  );
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;

  function changeMonth(amount: number) {
    setSelectedDate(new Date(year, month + amount, 1));
  }

  function openNewEventEditor() {
    setEditingEvent(null);
    setEditorVisible(true);
  }

  function openEventEditor(event: CalendarEvent) {
    setEditingEvent(event);
    setEditorVisible(true);
  }

  async function saveEvent(draft: CalendarEventDraft) {
    if (editingEvent && authUser) {
      setPendingEdit({ id: editingEvent.id, draft });
      setEditorVisible(false);
      return;
    }

    if (editingEvent) {
      await updateCalendarEvent(editingEvent.id, draft, false);
    } else {
      await createCalendarEvent(draft);
    }
    setEditorVisible(false);
    setEditingEvent(null);
    void requestCalendarNotifications().catch((error: unknown) => {
      setActionError(error instanceof Error ? error.message : 'Không lập được lịch notification.');
    });
  }

  async function saveEditedEvent(updateSharedCopies: boolean) {
    if (!pendingEdit) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await updateCalendarEvent(pendingEdit.id, pendingEdit.draft, updateSharedCopies);
      setPendingEdit(null);
      void requestCalendarNotifications().catch((error: unknown) => {
        setActionError(error instanceof Error ? error.message : 'Không lập được lịch notification.');
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không cập nhật được sự kiện.');
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmDeleteEvent() {
    if (!deleteTarget) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await deleteCalendarEvent(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteReturnsToEditor(false);
      setEditingEvent(null);
      setNotice('Đã xóa khỏi lịch của bạn. Bản đã được người khác thêm sẽ vẫn còn trong lịch của họ.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không xóa được sự kiện.');
    } finally {
      setActionBusy(false);
    }
  }

  function requestDeleteFromEditor(event: CalendarEvent) {
    setDeleteTarget(event);
    setDeleteReturnsToEditor(true);
    setEditorVisible(false);
    setActionError(null);
  }

  function dismissDeleteConfirmation() {
    if (actionBusy) return;
    setDeleteTarget(null);
    if (deleteReturnsToEditor) setEditorVisible(true);
    setDeleteReturnsToEditor(false);
  }

  async function createShareLink(event: CalendarEvent) {
    setActionBusy(true);
    setActionError(null);
    try {
      const token = await createCalendarEventShareLink(event.id);
      const path = `/calendar?shareToken=${encodeURIComponent(token)}`;
      setShareLink(typeof window !== 'undefined' ? `${window.location.origin}${path}` : ExpoLinking.createURL(path));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không tạo được link chia sẻ.');
    } finally {
      setActionBusy(false);
    }
  }

  async function copyOrShareLink() {
    if (!shareLink) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setNotice('Đã sao chép link sự kiện.');
        return;
      } catch {
        setActionError('Không sao chép được link. Hãy chọn và sao chép trực tiếp.');
      }
    }
    try {
      await Share.share({ message: shareLink });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không mở được bảng chia sẻ.');
    }
  }

  async function addInvitedUser() {
    if (!inviteTarget) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await inviteCalendarEventUser(inviteTarget.id, inviteIdentifier);
      setInviteTarget(null);
      setInviteIdentifier('');
      setNotice('Đã thêm sự kiện vào lịch tài khoản được mời.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không thêm được người dùng.');
    } finally {
      setActionBusy(false);
    }
  }

  async function addSharedEvent() {
    if (!activeShareToken || !sharedPreview) return;
    setAddingSharedEvent(true);
    try {
      await addSharedEventToCalendar(activeShareToken, sharedPreview);
      setAddedShareToken(activeShareToken);
      setDismissedShareToken(activeShareToken);
      setNotice(`Đã thêm "${sharedPreview.event.title}" vào lịch của bạn.`);
    } catch (error) {
      setSharedEventState({
        token: activeShareToken,
        preview: sharedPreview,
        error: error instanceof Error ? error.message : 'Không thêm được sự kiện vào lịch.',
      });
    } finally {
      setAddingSharedEvent(false);
    }
  }

  return (
    <CalendarPage>
      <CalendarHeader
        title="Lịch Tháng"
        onTodayPress={() => setSelectedDate(new Date())}
        onAddEventPress={openNewEventEditor}
      />
      {lunarCalendarAdviceError && (
        <Text style={{ color: '#A15C54', fontSize: 10, lineHeight: 15, marginTop: -7 }}>
          {lunarCalendarAdviceError}
        </Text>
      )}
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
            const dayInfo = dayInfoByDate.get(formatDateKey(date));
            const longevity = dayInfo?.longevity;
            const specialDays = dayInfo?.specialDays ?? [];
            const dayEvents = eventsByDate.get(formatDateKey(date)) ?? [];
            return (
              <View key={formatDateKey(date)} style={styles.daySlot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${date.getDate()} dương lịch, ngày âm ${lunar.day} tháng ${lunar.month}${specialDays.length > 0 ? `, ${specialDays.join(', ')}` : ''}${longevity?.isThapTrai ? ', ngày Thập Trai' : ''}${longevity?.isDaiKy ? `, ${longevity.daiKyBadge}` : ''}${dayEvents.length > 0 ? `, ${dayEvents.length} sự kiện hoặc lời nhắc` : ''}`}
                  onPress={() => setSelectedDate(date)}
                  style={[styles.dayCell, selected && { backgroundColor: theme.accent }, isToday && !selected && { borderColor: theme.accent, borderWidth: 1 }]}>
                  <Text style={[styles.solar, { color: selected ? '#FFFFFF' : theme.text }]}>{date.getDate()}</Text>
                  <Text style={[styles.lunar, { color: selected ? '#FFFFFFCC' : theme.muted }]}>{lunar.day}</Text>
                  <View style={styles.badges}>
                    {specialDays.length > 0 && (
                      <View style={[styles.specialMark, { backgroundColor: selected ? '#F4D591' : '#C28A1A' }]} />
                    )}
                    {longevity?.isThapTrai && <View style={[styles.vitalityMark, { backgroundColor: selected ? '#C6F0D2' : '#39724C' }]} />}
                    {longevity?.isDaiKy && (
                      <View style={[styles.vitalityMark, { backgroundColor: selected ? '#FFD2B8' : '#C45A37' }]} />
                    )}
                    {dayEvents.slice(0, 2).map((event) => (
                      <View
                        key={event.id}
                        style={[
                          styles.eventMark,
                          {
                            backgroundColor: selected ? '#FFFFFF' : '#527CBA',
                            borderRadius: event.kind === 'reminder' ? 1 : 4,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#C28A1A' }]} />
            <Text style={[styles.legendText, { color: theme.muted }]}>Ngày lễ</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#39724C' }]} />
            <Text style={[styles.legendText, { color: theme.muted }]}>Thanh trai</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#C45A37' }]} />
            <Text style={[styles.legendText, { color: theme.muted }]}>Bảo thọ</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#527CBA' }]} />
            <Text style={[styles.legendText, { color: theme.muted }]}>Sự kiện</Text>
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
        {selectedSpecialDays.length > 0 && (
          <Text style={[styles.specialDayNames, { color: '#A47718' }]}>
            ✦ {selectedSpecialDays.join(' · ')}
          </Text>
        )}
      </Card>
      {(!calendarEventsReady || selectedEvents.length > 0) && <Card>
        <View style={styles.eventsHeader}>
          <Text style={[styles.eventsTitle, { color: theme.text }]}>Sự kiện & lời nhắc</Text>
          <Text style={[styles.eventsCount, { color: theme.muted }]}>
            {calendarEventsReady ? `${selectedEvents.length}` : '…'}
          </Text>
        </View>
        {calendarEventsError && <Text style={styles.actionError}>{calendarEventsError}</Text>}
        {calendarNotificationWarning && (
          <Text style={[styles.eventHint, { color: theme.muted }]}>{calendarNotificationWarning}</Text>
        )}
        {notice && <Text style={[styles.eventHint, { color: theme.accent }]}>{notice}</Text>}
        {actionError && <Text style={styles.actionError}>{actionError}</Text>}
        {selectedEvents.map((event) => (
          <View key={event.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chỉnh sửa ${event.title}`}
              onPress={() => openEventEditor(event)}
              style={({ pressed }) => [
                styles.eventItem,
                { backgroundColor: theme.background, borderLeftColor: theme.accent },
                pressed && styles.eventPressed,
              ]}>
              <View style={styles.eventCopy}>
                <Text style={[styles.eventName, { color: theme.text }]}>
                  ◷ {event.title}
                </Text>
                <Text style={[styles.eventMeta, { color: theme.muted }]}>
                  {event.label ? `Nhãn: ${event.label} · ` : ''}
                  {event.calendarType === 'lunar' ? 'Âm lịch' : 'Dương lịch'}
                  {event.recurrence === 'yearly' ? ' · Hằng năm' : ' · Một lần'}
                  {event.countdown ? ' · Đếm ngược' : ''}
                  {event.isSharedCopy ? ' · Được chia sẻ' : ''}
                </Text>
                {event.description && <Text style={[styles.eventDescription, { color: theme.text }]}>{event.description}</Text>}
              </View>
              <ArrowRight size={20} color={theme.muted} />
            </Pressable>
            {authUser && (
              <View style={styles.eventActions}>
                <EventAction label="Chia sẻ link" onPress={() => void createShareLink(event)} color={theme.accent}>
                  <Share2 size={14} color={theme.accent} />
                </EventAction>
                <EventAction
                  label="Thêm user"
                  onPress={() => { setInviteTarget(event); setActionError(null); }}
                  color={theme.accent}>
                  <UserPlus size={14} color={theme.accent} />
                </EventAction>
              </View>
            )}
          </View>
        ))}
        <CardFooter>
          {!authUser && calendarEventsReady && selectedEvents.length > 0 && (
            <Text style={[styles.eventHint, { color: theme.muted }]}>Đăng nhập để chia sẻ sự kiện với người khác.</Text>
          )}
        </CardFooter>
      </Card>}
      {selectedLongevity.isThapTrai && (
        <Card style={{ ...styles.detailPanel, borderLeftColor: '#39724C' }}>
          <View style={styles.detailHeading}>
            <Leaf size={17} color="#39724C" />
            <Text style={[styles.detailTitle, { color: '#39724C' }]}>Thanh trai</Text>
          </View>
          <Text style={[styles.detailBody, { color: theme.text }]}>{selectedLongevity.thapTraiAdvice}</Text>
        </Card>
      )}
      {selectedLongevity.isDaiKy && (
        <Card style={{ ...styles.detailPanel, borderLeftColor: selectedLongevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#A17A32' }}>
          <View style={styles.detailHeading}>
            <Moon size={17} color={selectedLongevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#9A7331'} />
            <Text style={[styles.detailTitle, { color: selectedLongevity.daiKyLevel === 'CRITICAL' ? '#A15C54' : '#9A7331' }]}>Bảo thọ, Tiết dục</Text>
          </View>
          {selectedLongevity.daiKyReason && (
            <Text style={[styles.detailBody, { color: theme.text }]}>{selectedLongevity.daiKyReason}</Text>
          )}
          <Text style={[styles.detailBody, { color: theme.text }]}>{selectedLongevity.daiKyAdvice}</Text>
        </Card>
      )}
      {editorVisible && (
        <CalendarEventEditor
          visible
          selectedDate={selectedDate}
          event={editingEvent ?? undefined}
          onClose={() => setEditorVisible(false)}
          onSave={saveEvent}
          onDelete={requestDeleteFromEditor}
        />
      )}
      <Modal visible={pendingEdit !== null} transparent animationType="fade" onRequestClose={() => setPendingEdit(null)}>
        <ModalBackdrop onPress={() => setPendingEdit(null)}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Cập nhật sự kiện đã chia sẻ?</Text>
            <Text style={[styles.eventHint, { color: theme.muted }]}>
              Bạn có muốn áp dụng nội dung vừa sửa cho các bản đã được thêm vào lịch của người nhận không?
            </Text>
            {actionError && <Text style={styles.actionError}>{actionError}</Text>}
            <View style={styles.confirmActions}>
              <ModalAction
                label="Chỉ lịch của tôi"
                compact
                disabled={actionBusy}
                onPress={() => void saveEditedEvent(false)}
                color={theme.accent}
              />
              <ModalAction
                label="Cả bản chia sẻ"
                compact
                disabled={actionBusy}
                onPress={() => void saveEditedEvent(true)}
                color={theme.accent}
              />
            </View>
            <ModalAction label="Hủy" disabled={actionBusy} onPress={() => setPendingEdit(null)} color={theme.muted} />
          </View>
        </ModalBackdrop>
      </Modal>
      <Modal visible={deleteTarget !== null} transparent animationType="fade" onRequestClose={dismissDeleteConfirmation}>
        <ModalBackdrop onPress={dismissDeleteConfirmation}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Xóa khỏi lịch?</Text>
            <Text style={[styles.eventHint, { color: theme.muted }]}>
              {deleteTarget?.title} sẽ bị xóa khỏi lịch của bạn. Các bản người khác đã thêm sẽ được giữ lại.
            </Text>
            {actionError && <Text style={styles.actionError}>{actionError}</Text>}
            <View style={styles.confirmActions}>
              <ModalAction
                label="Hủy"
                compact
                disabled={actionBusy}
                onPress={dismissDeleteConfirmation}
                color={theme.muted}
              />
              <ModalAction
                label={actionBusy ? 'Đang xóa…' : 'Xóa'}
                compact
                filled
                disabled={actionBusy}
                onPress={() => void confirmDeleteEvent()}
                color="#A8423B"
              />
            </View>
          </View>
        </ModalBackdrop>
      </Modal>
      <Modal visible={inviteTarget !== null} transparent animationType="fade" onRequestClose={() => setInviteTarget(null)}>
        <ModalBackdrop onPress={() => setInviteTarget(null)}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Thêm người dùng</Text>
            <Text style={[styles.eventHint, { color: theme.muted }]}>
              Nhập email hoặc username đã đăng ký. Sự kiện sẽ được thêm vào lịch của họ ngay.
            </Text>
            <TextInput
              value={inviteIdentifier}
              onChangeText={setInviteIdentifier}
              autoCapitalize="none"
              placeholder="Email hoặc username"
              placeholderTextColor={theme.muted}
              style={[styles.modalInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.navigationBorder }]}
            />
            {actionError && <Text style={styles.actionError}>{actionError}</Text>}
            <ModalAction label={actionBusy ? 'Đang thêm…' : 'Thêm vào lịch'} disabled={actionBusy || !inviteIdentifier.trim()} onPress={() => void addInvitedUser()} color={theme.accent} />
            <ModalAction label="Hủy" disabled={actionBusy} onPress={() => setInviteTarget(null)} color={theme.muted} />
          </View>
        </ModalBackdrop>
      </Modal>
      <Modal visible={shareLink !== null} transparent animationType="fade" onRequestClose={() => setShareLink(null)}>
        <ModalBackdrop onPress={() => setShareLink(null)}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Link chia sẻ sự kiện</Text>
            <Text style={[styles.eventHint, { color: theme.muted }]}>
              Người mở link có thể thêm một bản sao vào lịch của họ.
            </Text>
            <TextInput
              value={shareLink ?? ''}
              editable={false}
              selectTextOnFocus
              multiline
              style={[styles.modalInput, styles.shareLinkInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.navigationBorder }]}
            />
            {actionError && <Text style={styles.actionError}>{actionError}</Text>}
            <ModalAction label="Sao chép / chia sẻ link" onPress={() => void copyOrShareLink()} color={theme.accent} />
            <ModalAction label="Đóng" onPress={() => setShareLink(null)} color={theme.muted} />
          </View>
        </ModalBackdrop>
      </Modal>
      <Modal
        visible={activeShareToken !== null && dismissedShareToken !== activeShareToken}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (activeShareToken) setDismissedShareToken(activeShareToken);
        }}>
        <ModalBackdrop onPress={() => {
          if (activeShareToken) setDismissedShareToken(activeShareToken);
        }}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sự kiện được chia sẻ</Text>
            {sharedEventLoading ? (
              <Text style={[styles.eventHint, { color: theme.muted }]}>Đang tải thông tin sự kiện…</Text>
            ) : sharedPreview ? (
              <>
                <Text style={[styles.eventName, { color: theme.text }]}>{sharedPreview.event.title}</Text>
                <Text style={[styles.eventHint, { color: theme.muted }]}>
                  Chia sẻ bởi {sharedPreview.ownerName} · {sharedPreview.event.day}/{sharedPreview.event.month}/{sharedPreview.event.year}
                  {' · '}{sharedPreview.event.calendarType === 'lunar' ? 'Âm lịch' : 'Dương lịch'}
                </Text>
                <Text style={[styles.eventHint, { color: theme.muted }]}>
                  {sharedPreview.event.kind === 'reminder' ? 'Lời nhắc' : 'Sự kiện'}
                  {sharedPreview.event.label ? ` · Nhãn: ${sharedPreview.event.label}` : ''}
                </Text>
                {sharedPreview.event.description && (
                  <Text style={[styles.eventHint, { color: theme.text }]}>{sharedPreview.event.description}</Text>
                )}
              </>
            ) : null}
            {sharedEventError && <Text style={styles.actionError}>{sharedEventError}</Text>}
            {sharedEventAlreadyAdded || addedShareToken === activeShareToken ? (
              <Text style={[styles.eventHint, { color: theme.accent }]}>Sự kiện này đã có trong lịch của bạn.</Text>
            ) : (
              <ModalAction
                label={addingSharedEvent ? 'Đang thêm…' : 'Thêm vào lịch của tôi'}
                disabled={!sharedPreview || sharedEventLoading || addingSharedEvent}
                onPress={() => void addSharedEvent()}
                color={theme.accent}
              />
            )}
            <ModalAction
              label="Đóng"
              onPress={() => activeShareToken && setDismissedShareToken(activeShareToken)}
              color={theme.muted}
            />
          </View>
        </ModalBackdrop>
      </Modal>
    </CalendarPage>
  );
}

function EventAction({
  label,
  color,
  onPress,
  children,
}: {
  label: string;
  color: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.eventAction}>
      {children}
      <Text style={[styles.eventActionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function ModalAction({
  label,
  color,
  disabled = false,
  compact = false,
  filled = false,
  onPress,
}: {
  label: string;
  color: string;
  disabled?: boolean;
  compact?: boolean;
  filled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.modalAction,
        compact && styles.modalActionCompact,
        filled
          ? { backgroundColor: color, borderColor: color }
          : { borderColor: color },
        { opacity: disabled ? 0.5 : 1 },
      ]}>
      <Text
        style={[
          styles.modalActionText,
          compact && styles.modalActionTextCompact,
          { color: filled ? '#FFFFFF' : color },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ModalBackdrop({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <View style={styles.modalBackdrop}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng hộp thoại"
        onPress={onPress}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
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
  specialMark: { width: 6, height: 6, borderRadius: 1, transform: [{ rotate: '45deg' }] },
  eventMark: { width: 5, height: 5 },
  detailDate: { fontSize: 14, fontWeight: '700' },
  detailHint: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  specialDayNames: { fontSize: 11, fontWeight: '700', marginTop: 6 },
  detailPanel: { borderLeftWidth: 3, paddingLeft: 13 },
  detailTitle: { fontSize: 14, fontWeight: '800' },
  detailHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailBadge: { fontSize: 11, fontWeight: '700', marginTop: 7 },
  detailBody: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#8884', paddingTop: 10, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10 },
  eventsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  eventsTitle: { fontSize: 14, fontWeight: '800' },
  eventsCount: { fontSize: 11, fontWeight: '700' },
  eventHint: { fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 5 },
  eventItem: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, borderRadius: 8, padding: 10, marginTop: 8 },
  eventCopy: { flex: 1, minWidth: 0, gap: 3 },
  eventName: { fontSize: 13, fontWeight: '700' },
  eventMeta: { fontSize: 10, lineHeight: 14 },
  eventDescription: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  eventPressed: { opacity: 0.72 },
  eventActions: { flexDirection: 'row', gap: 12, marginLeft: 11, marginTop: 3 },
  eventAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 2 },
  eventActionText: { fontSize: 10, fontWeight: '700' },
  confirmActions: { flexDirection: 'row', gap: 8, marginTop: 5 },
  actionError: { color: '#A15C54', fontSize: 11, lineHeight: 15, marginTop: 6 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: '#0007' },
  modalCard: { borderRadius: 16, padding: 18, gap: 8 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalInput: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, marginTop: 7 },
  shareLinkInput: { minHeight: 64, textAlignVertical: 'top' },
  modalAction: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, marginTop: 3 },
  modalActionCompact: { flex: 1, minHeight: 36, paddingHorizontal: 8, marginTop: 0 },
  modalActionText: { fontSize: 12, fontWeight: '700' },
  modalActionTextCompact: { fontSize: 11 },
});
