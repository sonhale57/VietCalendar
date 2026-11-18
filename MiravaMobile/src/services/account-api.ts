import type { CalendarUserSettings, GoogleAccount } from '@/contexts/calendar-settings';

export type GoogleSignInResponse = {
  user: GoogleAccount;
  settings: CalendarUserSettings | null;
  accessToken?: string;
  isAdmin?: boolean;
  emailVerified?: boolean;
};

export type AccountAuthResponse = GoogleSignInResponse & { accessToken: string; hasPassword?: boolean };
export type EmailAllowlistRule = { id: number; type: 'email' | 'domain'; value: string };

export type LunarAdviceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type LunarAdviceDay = {
  day: number;
  level: LunarAdviceLevel;
  title: string;
  advice: string;
};
export type LunarAdviceTemplate = {
  badge: string;
  color_hex: string;
  short_advice: string;
  detail: string;
};
export type LunarCalendarAdviceDocument = {
  metadata: {
    version: string;
    description: string;
    short_month_rule: {
      description: string;
      base_days: number[];
      short_month_days: number[];
    };
  };
  common_templates: {
    THAP_TRAI: LunarAdviceTemplate;
    TKBG_GENERAL: LunarAdviceTemplate;
  };
  months: {
    month: number;
    month_name: string;
    month_theme: string;
    full_month_advisory?: string;
    tkbg_days: LunarAdviceDay[];
  }[];
};

export type GoogleCalendarAppEvent = {
  id: string;
  summary: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  googleEventId: string | null;
};

export type GoogleCalendarDeletedEvent = {
  id: string;
  googleEventId: string | null;
};

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  description: string | null;
  start: string;
  end: string;
  isAllDay: boolean;
  htmlLink: string | null;
  appEventId: string | null;
};

export type GoogleCalendarSyncRequest = {
  startDate: string;
  endDate: string;
  events: GoogleCalendarAppEvent[];
  deletedEvents: GoogleCalendarDeletedEvent[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  kind: 'event' | 'reminder';
  calendarType: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  recurrence: 'once' | 'yearly';
  label: string | null;
  countdown: boolean;
  sourceEventId: string | null;
  isSharedCopy: boolean;
};

export type CalendarEventDraft = Omit<CalendarEvent, 'id' | 'sourceEventId' | 'isSharedCopy'>;
export type SharedCalendarEvent = { event: CalendarEvent; ownerName: string };

export class AccountApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AccountApiError';
  }
}

function getApiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Chưa cấu hình EXPO_PUBLIC_API_BASE_URL để kết nối máy chủ.');
  }
  return baseUrl;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => Number.isInteger(item));
}

function isLunarAdviceTemplate(value: unknown): value is LunarAdviceTemplate {
  return isRecord(value) &&
    typeof value.badge === 'string' &&
    typeof value.color_hex === 'string' &&
    typeof value.short_advice === 'string' &&
    typeof value.detail === 'string';
}

function isLunarAdviceDay(value: unknown): value is LunarAdviceDay {
  return isRecord(value) &&
    typeof value.day === 'number' &&
    Number.isInteger(value.day) &&
    value.day >= 1 &&
    value.day <= 30 &&
    (value.level === 'LOW' || value.level === 'MEDIUM' || value.level === 'HIGH') &&
    typeof value.title === 'string' &&
    typeof value.advice === 'string';
}

function isLunarAdviceMonth(value: unknown): value is LunarCalendarAdviceDocument['months'][number] {
  return isRecord(value) &&
    typeof value.month === 'number' &&
    Number.isInteger(value.month) &&
    value.month >= 1 &&
    value.month <= 12 &&
    typeof value.month_name === 'string' &&
    typeof value.month_theme === 'string' &&
    (value.full_month_advisory === undefined || typeof value.full_month_advisory === 'string') &&
    Array.isArray(value.tkbg_days) &&
    value.tkbg_days.every(isLunarAdviceDay) &&
    new Set(value.tkbg_days.map((day) => day.day)).size === value.tkbg_days.length;
}

function isLunarCalendarAdviceDocument(value: unknown): value is LunarCalendarAdviceDocument {
  if (!isRecord(value)) return false;
  if (
    !isRecord(value.metadata) ||
    typeof value.metadata.version !== 'string' ||
    typeof value.metadata.description !== 'string' ||
    !isRecord(value.metadata.short_month_rule) ||
    typeof value.metadata.short_month_rule.description !== 'string' ||
    !isNumberArray(value.metadata.short_month_rule.base_days) ||
    !isNumberArray(value.metadata.short_month_rule.short_month_days) ||
    !isRecord(value.common_templates) ||
    !isLunarAdviceTemplate(value.common_templates.THAP_TRAI) ||
    !isLunarAdviceTemplate(value.common_templates.TKBG_GENERAL) ||
    !Array.isArray(value.months) ||
    value.months.length !== 12 ||
    !value.months.every(isLunarAdviceMonth) ||
    new Set(value.months.map((month) => month.month)).size !== 12 ||
    !value.months.every((month) => month.month >= 1 && month.month <= 12)
  ) return false;

  return true;
}

export function parseLunarCalendarAdvice(value: unknown): LunarCalendarAdviceDocument {
  if (!isLunarCalendarAdviceDocument(value)) {
    throw new Error('Dữ liệu Thập Trai và Thọ Khang từ máy chủ không đúng định dạng.');
  }
  return value;
}

async function ensureSuccess(response: Response) {
  if (response.ok) return;

  let message = `Máy chủ trả về lỗi ${response.status}.`;
  try {
    const body = await response.json() as { title?: string; detail?: string };
    message = body.detail ?? body.title ?? message;
  } catch {
    // Keep the HTTP status message when the server does not return problem details.
  }
  throw new AccountApiError(message, response.status);
}

export async function getLunarCalendarAdvice(): Promise<LunarCalendarAdviceDocument> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/content/lunar-advice`);
  await ensureSuccess(response);
  return parseLunarCalendarAdvice(await response.json() as unknown);
}

export async function signInWithGoogleToken(idToken: string): Promise<GoogleSignInResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/google`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  await ensureSuccess(response);
  return await response.json() as GoogleSignInResponse;
}

export async function getCurrentAccount(token: string): Promise<AccountAuthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureSuccess(response);
  return await response.json() as AccountAuthResponse;
}

export async function registerWithEmail(input: {
  email: string;
  username: string;
  password: string;
}): Promise<AccountAuthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/email/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  await ensureSuccess(response);
  return await response.json() as AccountAuthResponse;
}

export async function requestEmailVerificationOtp(token: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/email/verification/request-otp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureSuccess(response);
}

export async function verifyEmail(token: string, code: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/email/verification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });
  await ensureSuccess(response);
}

export async function signInWithEmail(usernameOrEmail: string, password: string): Promise<AccountAuthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/email/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail, password }),
  });
  await ensureSuccess(response);
  return await response.json() as AccountAuthResponse;
}

export async function requestPasswordResetOtp(email: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/email/forgot-password/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  await ensureSuccess(response);
}

export async function resetPassword(input: { email: string; code: string; newPassword: string }): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/email/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  await ensureSuccess(response);
}

export async function changePassword(token: string, currentPassword: string, newPassword: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/email/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await ensureSuccess(response);
}

export async function signOutAccount(token: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureSuccess(response);
}

export async function getEmailAllowlist(token: string): Promise<EmailAllowlistRule[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/admin/email-allowlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureSuccess(response);
  return await response.json() as EmailAllowlistRule[];
}

export async function addEmailAllowlistRule(
  token: string,
  rule: Pick<EmailAllowlistRule, 'type' | 'value'>,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/admin/email-allowlist`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rule),
  });
  await ensureSuccess(response);
}

export async function removeEmailAllowlistRule(token: string, id: number): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/admin/email-allowlist/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureSuccess(response);
}

export async function saveCalendarUserSettings(idToken: string, settings: CalendarUserSettings) {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/account/settings`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  await ensureSuccess(response);
}

export async function getGoogleCalendarStatus(idToken: string): Promise<boolean> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/google-calendar/status`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  await ensureSuccess(response);
  const body = await response.json() as { connected?: boolean };
  return body.connected === true;
}

export async function linkGoogleCalendar(
  idToken: string,
  authorization: { code: string; codeVerifier: string; redirectUri: string; clientId: string },
) {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/google-calendar/link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(authorization),
  });
  await ensureSuccess(response);
}

export async function syncGoogleCalendar(
  idToken: string,
  request: GoogleCalendarSyncRequest,
): Promise<GoogleCalendarEvent[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/google-calendar/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  await ensureSuccess(response);
  const body = await response.json() as { events: GoogleCalendarEvent[] };
  return body.events;
}

export async function getCalendarEvents(token: string): Promise<CalendarEvent[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/calendar/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureSuccess(response);
  return await response.json() as CalendarEvent[];
}

export async function createCalendarEvent(
  token: string,
  event: CalendarEventDraft & { id: string },
): Promise<CalendarEvent> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/calendar/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  await ensureSuccess(response);
  return await response.json() as CalendarEvent;
}

export async function updateCalendarEvent(
  token: string,
  id: string,
  event: CalendarEventDraft & { updateSharedCopies: boolean },
): Promise<CalendarEvent> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/calendar/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  await ensureSuccess(response);
  return await response.json() as CalendarEvent;
}

export async function deleteCalendarEvent(token: string, id: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/calendar/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureSuccess(response);
}

export async function createCalendarEventShareLink(token: string, id: string): Promise<string> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/calendar/events/${encodeURIComponent(id)}/share-link`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  await ensureSuccess(response);
  const body = await response.json() as { token: string };
  return body.token;
}

export async function inviteCalendarEventUser(
  token: string,
  id: string,
  identifier: string,
): Promise<CalendarEvent> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/calendar/events/${encodeURIComponent(id)}/invite`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier }),
    },
  );
  await ensureSuccess(response);
  return await response.json() as CalendarEvent;
}

export async function getSharedCalendarEvent(token: string): Promise<SharedCalendarEvent> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/shared-events/${encodeURIComponent(token)}`,
  );
  await ensureSuccess(response);
  return await response.json() as SharedCalendarEvent;
}

export async function importSharedCalendarEvent(
  token: string,
  shareToken: string,
): Promise<CalendarEvent> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/shared-events/${encodeURIComponent(shareToken)}/import`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  await ensureSuccess(response);
  const body = await response.json() as { event: CalendarEvent; alreadyImported: boolean };
  return body.event;
}
