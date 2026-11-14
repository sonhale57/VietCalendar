import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';

import { AppText as Text } from '@/components/app-text';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? '';
const fallbackClientId = iosClientId || androidClientId || webClientId || 'google-client-id-not-configured';
const WEB_AUTH_STATE_KEY = '@lich-viet/google-web-auth';

export function GoogleSignIn({ theme }: { theme: (typeof calendarThemes)[number] }) {
  const { themeIndex, authUser, authReady, authBusy, signInWithGoogle, signOut } = useCalendarSettings();
  const [requestError, setRequestError] = useState<string | null>(null);
  const handledResponse = useRef<string | null>(null);
  const [request, response, promptAsync] = useIdTokenAuthRequest({
    clientId: Platform.select({
      ios: iosClientId || fallbackClientId,
      android: androidClientId || fallbackClientId,
      default: webClientId || fallbackClientId,
    }),
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
    selectAccount: true,
  });

  const clientConfigured = Platform.OS === 'ios'
    ? Boolean(iosClientId)
    : Platform.OS === 'android'
      ? Boolean(androidClientId)
      : Boolean(webClientId);
  const nativeOAuthAvailable = Platform.OS === 'web' || Constants.executionEnvironment !== 'storeClient';
  const unavailableMessage = !clientConfigured
    ? `Chưa cấu hình Google OAuth Client ID cho ${Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}.`
    : !nativeOAuthAvailable
      ? 'Đăng nhập Google trên iOS/Android cần development build; Expo Go không hỗ trợ luồng OAuth này.'
      : null;

  useEffect(() => {
    if (!response || response.type !== 'success') return;
    const responseKey = response.params.id_token ?? response.authentication?.idToken ?? response.params.code;
    if (!responseKey || handledResponse.current === responseKey) return;
    handledResponse.current = responseKey;

    const idToken = response.params.id_token ?? response.authentication?.idToken;
    if (idToken) void signInWithGoogle(idToken);
  }, [response, signInWithGoogle]);

  const currentTheme = calendarThemes[themeIndex] ?? theme;
  const missingIdToken = response?.type === 'success' &&
    !response.params.id_token &&
    !response.authentication?.idToken
    ? 'Google không trả về mã định danh. Kiểm tra cấu hình OAuth và thử lại.'
    : null;

  return (
    <View style={[styles.card, { backgroundColor: currentTheme.card }]}>
      {authUser ? (
        <>
          <Text style={[styles.title, { color: currentTheme.text }]}>Tài khoản</Text>
          <View style={styles.accountRow}>
            <View style={[styles.avatar, { backgroundColor: `${currentTheme.accent}20` }]}>
              <Text style={[styles.avatarText, { color: currentTheme.accent }]}>
                {authUser.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={[styles.name, { color: currentTheme.text }]} numberOfLines={1}>{authUser.displayName}</Text>
              <Text style={[styles.description, { color: currentTheme.muted }]} numberOfLines={1}>{authUser.email}</Text>
              <Text style={[styles.description, { color: currentTheme.muted }]}>Hồ sơ và giao diện đồng bộ khi máy chủ khả dụng</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={authBusy}
              onPress={() => void signOut()}
              style={[styles.signOut, { borderColor: currentTheme.navigationBorder }]}>
              <Text style={[styles.signOutText, { color: currentTheme.text }]}>{authBusy ? '...' : 'Đăng xuất'}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={!request || !clientConfigured || !nativeOAuthAvailable || !authReady || authBusy}
          onPress={() => {
            setRequestError(null);
            if (Platform.OS === 'web') {
              if (!request?.url || !request.state || !request.nonce || typeof window === 'undefined') {
                setRequestError('Không tạo được yêu cầu Google an toàn. Hãy tải lại trang và thử lại.');
                return;
              }

              try {
                sessionStorage.setItem(WEB_AUTH_STATE_KEY, JSON.stringify({
                  state: request.state,
                  nonce: request.nonce,
                }));
              } catch {
                setRequestError('Trình duyệt không cho phép lưu trạng thái đăng nhập tạm thời.');
                return;
              }

              window.location.assign(request.url);
              return;
            }

            void promptAsync().catch((error: unknown) => {
              setRequestError(error instanceof Error ? error.message : 'Không mở được cửa sổ đăng nhập Google.');
            });
          }}
          style={[
            styles.googleButton,
            { borderColor: currentTheme.navigationBorder },
            (!request || !clientConfigured || !nativeOAuthAvailable || !authReady || authBusy) && styles.disabled,
          ]}>
          <Text style={[styles.googleMark, { color: currentTheme.accent }]}>G</Text>
          <Text style={[styles.buttonText, { color: currentTheme.text }]}>
            {authBusy || !authReady ? 'Đang xử lý…' : 'Tiếp tục với Google'}
          </Text>
        </Pressable>
      )}
      {(requestError || missingIdToken) && (
        <Text accessibilityRole="alert" style={[styles.message, { color: '#B42318' }]}>{requestError ?? missingIdToken}</Text>
      )}
      {!authUser && unavailableMessage && (
        <Text style={[styles.message, { color: currentTheme.muted }]}>{unavailableMessage}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, padding: 15, gap: 10 },
  title: { fontSize: 14, fontWeight: '700' },
  description: { fontSize: 11, lineHeight: 16 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800' },
  accountInfo: { flex: 1, gap: 2 },
  name: { fontSize: 12, fontWeight: '700' },
  signOut: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  signOutText: { fontSize: 10, fontWeight: '600' },
  googleButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  googleMark: { fontSize: 16, fontWeight: '800' },
  buttonText: { fontSize: 12, fontWeight: '700' },
  message: { fontSize: 10, lineHeight: 15 },
  disabled: { opacity: 0.55 },
});
