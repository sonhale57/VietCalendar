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
