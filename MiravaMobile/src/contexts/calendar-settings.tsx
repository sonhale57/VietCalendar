import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import {
  AccountApiError,
  addEmailAllowlistRule as addEmailAllowlistRuleRequest,
  changePassword as changePasswordRequest,
  getCurrentAccount,
  getEmailAllowlist as getEmailAllowlistRequest,
  getGoogleCalendarStatus,
  linkGoogleCalendar as linkGoogleCalendarRequest,
  registerWithEmail as registerWithEmailRequest,
  removeEmailAllowlistRule as removeEmailAllowlistRuleRequest,
  requestEmailVerificationOtp as requestEmailVerificationOtpRequest,
  requestPasswordResetOtp as requestPasswordResetOtpRequest,
  resetPassword as resetPasswordRequest,
  saveCalendarUserSettings,
  signInWithEmail as signInWithEmailRequest,
  signInWithGoogleToken,
  signOutAccount,
  syncGoogleCalendar as syncGoogleCalendarRequest,
  verifyEmail as verifyEmailRequest,
  type EmailAllowlistRule,
  type GoogleCalendarEvent,
  type GoogleCalendarSyncRequest,
} from '@/services/account-api';

export const fastingMode = 'Thập trai' as const;
export type FastingMode = typeof fastingMode;
export type GoogleAccount = { subject: string; email: string; displayName: string; pictureUrl: string | null };
export type CalendarUserSettings = {
  profileName: string;
  relativeNames: string[];
  relativeBirthDates: string[];
  relativeBirthCalendarTypes: string[];
  relativeGenders: string[];
  birthDate: string;
  birthCalendarType: string;
  birthHour: string;
  gender: string;
  themeIndex: number;
  navigationStyle: 'mono' | 'image';
  navigationImage: string;
  fastingMode: FastingMode;
};

const SETTINGS_STORAGE_KEY = '@lich-viet/user-settings';
const AUTH_TOKEN_STORAGE_KEY = '@lich-viet/google-id-token';
const AUTH_USER_STORAGE_KEY = '@lich-viet/google-user';
const AUTH_SETTINGS_OWNER_KEY = '@lich-viet/user-settings-owner';
const WEB_AUTH_STATE_KEY = '@lich-viet/google-web-auth';

async function getStoredAuthToken() {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (storedToken) return storedToken;

    const legacyToken = window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (legacyToken) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, legacyToken);
      window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
    return legacyToken;
  }
  return SecureStore.getItemAsync(AUTH_TOKEN_STORAGE_KEY);
}

async function storeAuthToken(token: string) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') throw new Error('Không thể lưu phiên đăng nhập trong trình duyệt này.');
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    return;
  }
  await SecureStore.setItemAsync(AUTH_TOKEN_STORAGE_KEY, token);
}

async function clearStoredAuthToken() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_TOKEN_STORAGE_KEY);
}

type CalendarSettings = CalendarUserSettings & {
  setThemeIndex: (index: number) => void;
  setNavigationStyle: (style: 'mono' | 'image') => void;
  setNavigationImage: (uri: string) => void;
  note: string;
  setNote: (value: string) => void;
  selectedProfile: number;
  setSelectedProfile: (index: number) => void;
  setProfileName: (name: string) => void;
  setRelativeNames: (names: string[]) => void;
  setRelativeBirthDates: (dates: string[]) => void;
  setRelativeBirthCalendarTypes: (types: string[]) => void;
  setRelativeGenders: (genders: string[]) => void;
  setBirthDate: (date: string) => void;
  setBirthCalendarType: (type: string) => void;
  setGender: (value: string) => void;
  fastingConfirmedToday: boolean;
  setFastingConfirmedToday: (confirmed: boolean) => void;
  fastingStreak: number;
  setFastingStreak: (streak: number) => void;
  authUser: GoogleAccount | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  authIsAdmin: boolean;
  authHasPassword: boolean;
  authEmailVerified: boolean;
  requestEmailVerificationOtp: () => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  registerWithEmail: (input: { email: string; username: string; password: string }) => Promise<void>;
  signInWithEmail: (usernameOrEmail: string, password: string) => Promise<void>;
  requestPasswordResetOtp: (email: string) => Promise<void>;
  resetPassword: (input: { email: string; code: string; newPassword: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getEmailAllowlist: () => Promise<EmailAllowlistRule[]>;
  addEmailAllowlistRule: (type: 'email' | 'domain', value: string) => Promise<void>;
  removeEmailAllowlistRule: (id: number) => Promise<void>;
  googleCalendarConnected: boolean;
  googleCalendarError: string | null;
  connectGoogleCalendar: (authorization: { code: string; codeVerifier: string; redirectUri: string; clientId: string }) => Promise<void>;
  syncGoogleCalendar: (request: GoogleCalendarSyncRequest) => Promise<GoogleCalendarEvent[]>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const CalendarSettingsContext = createContext<CalendarSettings | null>(null);

function getAccountErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) {
    return 'Không kết nối được máy chủ tài khoản. Hãy kiểm tra API đang chạy và EXPO_PUBLIC_API_BASE_URL.';
  }
  return error instanceof Error ? error.message : fallback;
}

function settingsFromUnknown(value: unknown): Partial<CalendarUserSettings> {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as Partial<CalendarUserSettings>;
  return {
    ...(typeof candidate.profileName === 'string' ? { profileName: candidate.profileName } : {}),
    ...(Array.isArray(candidate.relativeNames) &&
      candidate.relativeNames.every((name) => typeof name === 'string')
      ? { relativeNames: candidate.relativeNames.slice(0, 3) }
      : {}),
    ...(Array.isArray(candidate.relativeBirthDates) &&
      candidate.relativeBirthDates.every((date) => typeof date === 'string')
      ? { relativeBirthDates: candidate.relativeBirthDates.slice(0, 3) }
      : {}),
    ...(Array.isArray(candidate.relativeBirthCalendarTypes) &&
      candidate.relativeBirthCalendarTypes.every((type) => type === 'Dương lịch' || type === 'Âm lịch')
      ? { relativeBirthCalendarTypes: candidate.relativeBirthCalendarTypes.slice(0, 3) }
      : {}),
    ...(Array.isArray(candidate.relativeGenders) &&
      candidate.relativeGenders.every((value) => value === 'Nam' || value === 'Nữ' || value === 'Chưa chọn')
      ? { relativeGenders: candidate.relativeGenders.slice(0, 3) }
      : {}),
    ...(typeof candidate.birthDate === 'string' ? { birthDate: candidate.birthDate } : {}),
    ...(candidate.birthCalendarType === 'Dương lịch' || candidate.birthCalendarType === 'Âm lịch'
      ? { birthCalendarType: candidate.birthCalendarType }
      : {}),
    ...(candidate.gender === 'Nam' || candidate.gender === 'Nữ' || candidate.gender === 'Chưa chọn'
      ? { gender: candidate.gender }
      : {}),
    ...(typeof candidate.themeIndex === 'number' &&
      Number.isInteger(candidate.themeIndex) &&
      candidate.themeIndex >= 0 &&
      candidate.themeIndex <= 3
      ? { themeIndex: candidate.themeIndex }
      : {}),
    ...(candidate.navigationStyle === 'mono' || candidate.navigationStyle === 'image'
      ? { navigationStyle: candidate.navigationStyle }
      : {}),
    ...(typeof candidate.navigationImage === 'string' ? { navigationImage: candidate.navigationImage } : {}),
    fastingMode,
  };
}

function settingsWithGoogleProfileName(
  settings: CalendarUserSettings,
  account: GoogleAccount,
): CalendarUserSettings {
  const profileName = settings.profileName.trim();
  const googleName = account.displayName.trim();
  return {
    ...settings,
    fastingMode,
    ...(!googleName || (profileName && profileName !== 'Bản thân') ? {} : { profileName: googleName }),
  };
}

function settingsForNewAccount(
  settings: CalendarUserSettings,
  account: GoogleAccount,
): CalendarUserSettings {
  return {
    ...settings,
    profileName: account.displayName,
    relativeNames: [''],
    relativeBirthDates: [''],
    relativeBirthCalendarTypes: ['Dương lịch'],
    relativeGenders: ['Chưa chọn'],
    birthDate: '',
    birthCalendarType: 'Dương lịch',
    birthHour: '',
    gender: 'Chưa chọn',
    navigationStyle: 'mono',
    navigationImage: '',
    fastingMode,
  };
}

function parseGoogleAccount(value: string | null): GoogleAccount | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<GoogleAccount>;
    if (
      typeof candidate.subject !== 'string' ||
      typeof candidate.email !== 'string' ||
      typeof candidate.displayName !== 'string' ||
      (candidate.pictureUrl !== null && typeof candidate.pictureUrl !== 'string')
    ) return null;
    return {
      subject: candidate.subject,
      email: candidate.email,
      displayName: candidate.displayName,
      pictureUrl: candidate.pictureUrl,
    };
  } catch {
    return null;
  }
}

export function CalendarSettingsProvider({ children }: { children: ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(0);
  const [navigationStyle, setNavigationStyle] = useState<'mono' | 'image'>('mono');
  const [navigationImage, setNavigationImage] = useState('');
  const [note, setNote] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(0);
  const [profileName, setProfileName] = useState('Bản thân');
  const [relativeNames, setRelativeNames] = useState(['']);
  const [relativeBirthDates, setRelativeBirthDates] = useState(['']);
  const [relativeBirthCalendarTypes, setRelativeBirthCalendarTypes] = useState(['Dương lịch']);
  const [relativeGenders, setRelativeGenders] = useState(['Chưa chọn']);
  const [birthDate, setBirthDate] = useState('');
  const [birthCalendarType, setBirthCalendarType] = useState('Dương lịch');
  const [gender, setGender] = useState('Chưa chọn');
  const [fastingConfirmedToday, setFastingConfirmedToday] = useState(false);
  const [fastingStreak, setFastingStreak] = useState(0);
  const [authUser, setAuthUser] = useState<GoogleAccount | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authIsAdmin, setAuthIsAdmin] = useState(false);
  const [authHasPassword, setAuthHasPassword] = useState(false);
  const [authEmailVerified, setAuthEmailVerified] = useState(true);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleCalendarError, setGoogleCalendarError] = useState<string | null>(null);
  const [settingsReady, setSettingsReady] = useState(false);

  const settings = useMemo<CalendarUserSettings>(() => ({
    profileName,
    relativeNames,
    relativeBirthDates,
    relativeBirthCalendarTypes,
    relativeGenders,
    birthDate,
    birthCalendarType,
    birthHour: '',
    gender,
    themeIndex,
    navigationStyle,
    navigationImage,
    fastingMode,
  }), [
    profileName,
    relativeNames,
    relativeBirthDates,
    relativeBirthCalendarTypes,
    relativeGenders,
    birthDate,
    birthCalendarType,
    gender,
    themeIndex,
    navigationStyle,
    navigationImage,
  ]);
  const settingsRef = useRef(settings);
  const webAuthCallbackHandled = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const applySettings = useCallback((value: unknown) => {
    const saved = settingsFromUnknown(value);
    if (saved.profileName !== undefined) setProfileName(saved.profileName);
    if (saved.relativeNames !== undefined) setRelativeNames(saved.relativeNames);
    if (saved.relativeBirthDates !== undefined) setRelativeBirthDates(saved.relativeBirthDates);
    if (saved.relativeBirthCalendarTypes !== undefined) setRelativeBirthCalendarTypes(saved.relativeBirthCalendarTypes);
    if (saved.relativeGenders !== undefined) setRelativeGenders(saved.relativeGenders);
    if (saved.birthDate !== undefined) setBirthDate(saved.birthDate);
    if (saved.birthCalendarType !== undefined) setBirthCalendarType(saved.birthCalendarType);
    if (saved.gender !== undefined) setGender(saved.gender);
    if (saved.themeIndex !== undefined) setThemeIndex(saved.themeIndex);
    if (saved.navigationStyle !== undefined) setNavigationStyle(saved.navigationStyle);
    if (saved.navigationImage !== undefined) setNavigationImage(saved.navigationImage);
  }, []);

  const acceptAuthenticatedAccount = useCallback(async (
    account: {
      user: GoogleAccount;
      settings: CalendarUserSettings | null;
      accessToken?: string;
      isAdmin?: boolean;
      hasPassword?: boolean;
      emailVerified?: boolean;
    },
    fallbackToken: string,
  ) => {
    const token = account.accessToken ?? fallbackToken;
    const [settingsOwner, savedUser] = await Promise.all([
      AsyncStorage.getItem(AUTH_SETTINGS_OWNER_KEY),
      AsyncStorage.getItem(AUTH_USER_STORAGE_KEY),
    ]);
    const cachedAccount = parseGoogleAccount(savedUser);
    const ownsLocalSettings =
      settingsOwner === account.user.subject || cachedAccount?.subject === account.user.subject;
    const accountSettings = settingsWithGoogleProfileName(
      account.settings ?? (
        ownsLocalSettings ? settingsRef.current : settingsForNewAccount(settingsRef.current, account.user)
      ),
      account.user,
    );

    await saveCalendarUserSettings(token, accountSettings);
    await storeAuthToken(token);
    await AsyncStorage.multiSet([
      [AUTH_USER_STORAGE_KEY, JSON.stringify(account.user)],
      [AUTH_SETTINGS_OWNER_KEY, account.user.subject],
    ]);
    applySettings(accountSettings);
    setAuthUser(account.user);
    setAuthToken(token);
    setAuthIsAdmin(account.isAdmin === true);
    setAuthHasPassword(account.hasPassword === true);
    setAuthEmailVerified(account.emailVerified !== false);
    setAuthError(null);
    setGoogleCalendarConnected(false);
    setGoogleCalendarError(null);
    if (!account.user.subject.startsWith('local:')) {
      try {
        setGoogleCalendarConnected(await getGoogleCalendarStatus(token));
      } catch (calendarError) {
        setGoogleCalendarError(
          calendarError instanceof Error ? calendarError.message : 'Không kiểm tra được kết nối Google Calendar.',
        );
      }
    }
  }, [applySettings]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then((savedSettings) => {
        if (!active) return;
        if (savedSettings) applySettings(JSON.parse(savedSettings));
      })
      .catch(() => {
        if (active) setAuthError('Không đọc được thiết lập đã lưu trên thiết bị.');
      })
      .finally(() => {
        if (active) {
          setSettingsReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [applySettings]);

  useEffect(() => {
    if (!settingsReady) return;
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      .catch(() => setAuthError('Không lưu được thiết lập trên thiết bị. Hãy kiểm tra dung lượng rồi thử lại.'));
  }, [settingsReady, settings]);

  useEffect(() => {
    if (!settingsReady) return;
    let active = true;

    async function restoreSession() {
      try {
        const [token, savedUser] = await Promise.all([
          getStoredAuthToken(),
          AsyncStorage.getItem(AUTH_USER_STORAGE_KEY),
        ]);
        if (!active) return;
        if (!token) {
          setAuthReady(true);
          return;
        }

        const cachedAccount = parseGoogleAccount(savedUser);
        if (cachedAccount) {
          setAuthUser(cachedAccount);
        } else if (savedUser) {
          await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
        }

        const account = await getCurrentAccount(token);
        if (!active) return;
        setAuthUser(account.user);
        await acceptAuthenticatedAccount(account, token);
      } catch (error) {
        if (active) {
          if (error instanceof AccountApiError && error.status === 401) {
            try {
              await clearStoredAuthToken();
              await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
              setAuthUser(null);
              setAuthToken(null);
              setAuthIsAdmin(false);
              setAuthHasPassword(false);
              setAuthError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục đồng bộ.');
            } catch {
              setAuthError('Phiên đăng nhập đã hết hạn nhưng chưa thể xóa khỏi thiết bị.');
            }
          } else {
            setAuthError(getAccountErrorMessage(error, 'Không khôi phục được phiên đăng nhập.'));
          }
        }
      } finally {
        if (active) setAuthReady(true);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, [settingsReady, acceptAuthenticatedAccount]);

  useEffect(() => {
    if (!authToken || !settingsReady) return;
    const timer = setTimeout(() => {
      saveCalendarUserSettings(authToken, settings)
        .then(() => setAuthError(null))
        .catch((error: unknown) => {
          if (error instanceof AccountApiError && error.status === 401) {
            setAuthToken(null);
            setAuthUser(null);
            setAuthIsAdmin(false);
            setAuthHasPassword(false);
            Promise.all([clearStoredAuthToken(), AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY)])
              .then(() => setAuthError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục đồng bộ.'))
              .catch(() => setAuthError('Phiên đăng nhập đã hết hạn nhưng chưa thể xóa khỏi thiết bị.'));
            return;
          }
          setAuthError(getAccountErrorMessage(error, 'Không đồng bộ được thiết lập lên máy chủ.'));
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [authToken, settingsReady, settings]);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const account = await signInWithGoogleToken(idToken);
      await acceptAuthenticatedAccount(account, idToken);
    } catch (error) {
      setAuthError(getAccountErrorMessage(error, 'Đăng nhập Google thất bại.'));
    } finally {
      setAuthBusy(false);
    }
  }, [acceptAuthenticatedAccount]);

  const registerWithEmail = useCallback(async (input: {
    email: string;
    username: string;
    password: string;
  }) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const account = await registerWithEmailRequest(input);
      await acceptAuthenticatedAccount(account, account.accessToken);
    } finally {
      setAuthBusy(false);
    }
  }, [acceptAuthenticatedAccount]);

  const signInWithEmail = useCallback(async (usernameOrEmail: string, password: string) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const account = await signInWithEmailRequest(usernameOrEmail, password);
      await acceptAuthenticatedAccount(account, account.accessToken);
    } catch (error) {
      setAuthError(getAccountErrorMessage(error, 'Đăng nhập thất bại.'));
    } finally {
      setAuthBusy(false);
    }
  }, [acceptAuthenticatedAccount]);

  const requestEmailVerificationOtp = useCallback(async () => {
    if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn.');
    setAuthError(null);
    await requestEmailVerificationOtpRequest(authToken);
  }, [authToken]);

  const verifyEmail = useCallback(async (code: string) => {
    if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn.');
    setAuthError(null);
    await verifyEmailRequest(authToken, code);
    setAuthEmailVerified(true);
  }, [authToken]);

  const requestPasswordResetOtp = useCallback(async (email: string) => {
    setAuthError(null);
    await requestPasswordResetOtpRequest(email);
  }, []);

  const resetPassword = useCallback(async (input: { email: string; code: string; newPassword: string }) => {
    setAuthError(null);
    await resetPasswordRequest(input);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn.');
    await changePasswordRequest(authToken, currentPassword, newPassword);
  }, [authToken]);

  const getEmailAllowlist = useCallback(async () => {
    if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn.');
    return await getEmailAllowlistRequest(authToken);
  }, [authToken]);

  const addEmailAllowlistRule = useCallback(async (type: 'email' | 'domain', value: string) => {
    if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn.');
    await addEmailAllowlistRuleRequest(authToken, { type, value });
  }, [authToken]);

  const removeEmailAllowlistRule = useCallback(async (id: number) => {
    if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn.');
    await removeEmailAllowlistRuleRequest(authToken, id);
  }, [authToken]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location.hash) return;
    if (webAuthCallbackHandled.current) return;
    webAuthCallbackHandled.current = true;

    queueMicrotask(() => {
      const callback = new URLSearchParams(window.location.hash.slice(1));
      const idToken = callback.get('id_token');
      const callbackState = callback.get('state');
      const authorizationError = callback.get('error');
      let expected: { state?: string; nonce?: string } | null = null;

      try {
        const stored = sessionStorage.getItem(WEB_AUTH_STATE_KEY);
        if (stored) expected = JSON.parse(stored) as { state?: string; nonce?: string };
        sessionStorage.removeItem(WEB_AUTH_STATE_KEY);
      } catch {
        setAuthError('Không đọc được trạng thái đăng nhập Google. Hãy thử đăng nhập lại.');
        return;
      }

      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

      if (authorizationError) {
        setAuthError('Bạn đã hủy hoặc Google từ chối yêu cầu đăng nhập.');
        return;
      }

      if (!idToken || !callbackState || !expected?.state || !expected.nonce ||
          callbackState !== expected.state) {
        setAuthError('Phản hồi đăng nhập Google không hợp lệ hoặc đã hết hạn. Hãy thử lại.');
        return;
      }

      try {
        const encodedPayload = idToken.split('.')[1];
        if (!encodedPayload) throw new Error('Invalid Google token.');
        const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'))) as {
          nonce?: unknown;
        };
        if (payload.nonce !== expected.nonce) throw new Error('Google token nonce mismatch.');
      } catch {
        setAuthError('Không xác minh được phản hồi Google. Hãy thử đăng nhập lại.');
        return;
      }

      void signInWithGoogle(idToken);
    });
  }, [signInWithGoogle]);

  const connectGoogleCalendar = useCallback(async (authorization: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    clientId: string;
  }) => {
    if (!authToken) throw new Error('Hãy đăng nhập Google trước khi kết nối Calendar.');
    setGoogleCalendarError(null);
    try {
      await linkGoogleCalendarRequest(authToken, authorization);
      setGoogleCalendarConnected(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể kết nối Google Calendar.';
      setGoogleCalendarError(message);
      throw error;
    }
  }, [authToken]);

  const syncGoogleCalendar = useCallback(async (request: GoogleCalendarSyncRequest) => {
    if (!authToken) throw new Error('Hãy đăng nhập Google trước khi đồng bộ Calendar.');
    try {
      const events = await syncGoogleCalendarRequest(authToken, request);
      setGoogleCalendarError(null);
      return events;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đồng bộ Google Calendar.';
      setGoogleCalendarError(message);
      throw error;
    }
  }, [authToken]);

  const signOut = useCallback(async () => {
    setAuthBusy(true);
    try {
      if (authToken?.startsWith('lv_')) await signOutAccount(authToken);
      await clearStoredAuthToken();
      await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
      setAuthUser(null);
      setAuthToken(null);
      setAuthIsAdmin(false);
      setAuthHasPassword(false);
      setAuthEmailVerified(true);
      setAuthError(null);
      setGoogleCalendarConnected(false);
      setGoogleCalendarError(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Không thể đăng xuất khỏi thiết bị.');
    } finally {
      setAuthBusy(false);
    }
  }, [authToken]);

  const value = useMemo(
    () => ({
      ...settings,
      setThemeIndex,
      setNavigationStyle,
      setNavigationImage,
      note,
      setNote,
      selectedProfile,
      setSelectedProfile,
      setProfileName,
      setRelativeNames,
      setRelativeBirthDates,
      setRelativeBirthCalendarTypes,
      setRelativeGenders,
      setBirthDate,
      setBirthCalendarType,
      setGender,
      fastingConfirmedToday,
      setFastingConfirmedToday,
      fastingStreak,
      setFastingStreak,
      authUser,
      authReady,
      authBusy,
      authError,
      authIsAdmin,
      authHasPassword,
      authEmailVerified,
      requestEmailVerificationOtp,
      verifyEmail,
      registerWithEmail,
      signInWithEmail,
      requestPasswordResetOtp,
      resetPassword,
      changePassword,
      getEmailAllowlist,
      addEmailAllowlistRule,
      removeEmailAllowlistRule,
      googleCalendarConnected,
      googleCalendarError,
      connectGoogleCalendar,
      syncGoogleCalendar,
      signInWithGoogle,
      signOut,
    }),
    [
      settings,
      note,
      selectedProfile,
      fastingConfirmedToday,
      fastingStreak,
      authUser,
      authReady,
      authBusy,
      authError,
      authIsAdmin,
      authHasPassword,
      authEmailVerified,
      requestEmailVerificationOtp,
      verifyEmail,
      registerWithEmail,
      signInWithEmail,
      requestPasswordResetOtp,
      resetPassword,
      changePassword,
      getEmailAllowlist,
      addEmailAllowlistRule,
      removeEmailAllowlistRule,
      googleCalendarConnected,
      googleCalendarError,
      connectGoogleCalendar,
      syncGoogleCalendar,
      signInWithGoogle,
      signOut,
    ],
  );

  return <CalendarSettingsContext.Provider value={value}>{children}</CalendarSettingsContext.Provider>;
}

export function useCalendarSettings(): CalendarSettings {
  const context = useContext(CalendarSettingsContext);
  if (!context) {
    throw new Error('useCalendarSettings must be used within CalendarSettingsProvider.');
  }
  return context;
}
