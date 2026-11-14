import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export function EmailPasswordAuth({ theme }: { theme: (typeof calendarThemes)[number] }) {
  const {
    authUser,
    authBusy,
    authError,
    authHasPassword,
    authEmailVerified,
    requestEmailVerificationOtp,
    verifyEmail,
    registerWithEmail,
    signInWithEmail,
    requestPasswordResetOtp,
    resetPassword,
    changePassword,
  } = useCalendarSettings();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);

  function clearMessage() {
    setNotice(null);
    setError(null);
  }

  async function sendResetCode() {
    clearMessage();
    setBusy(true);
    try {
      await requestPasswordResetOtp(email.trim());
      setMode('reset');
      setNotice('Nếu email có tài khoản mật khẩu, mã OTP sẽ được gửi. Mã có hiệu lực 10 phút.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không gửi được mã OTP.');
    } finally {
      setBusy(false);
    }
  }

  async function completeRegistration() {
    clearMessage();
    if (password !== confirmation) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    setBusy(true);
    try {
      await registerWithEmail({ email: email.trim(), username: username.trim(), password });
      setNotice('Tài khoản đã được tạo. Bạn có thể dùng ứng dụng ngay và xác minh email sau.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tạo được tài khoản.');
    } finally {
      setBusy(false);
    }
  }

  async function sendVerificationCode() {
    clearMessage();
    setBusy(true);
    try {
      await requestEmailVerificationOtp();
      setVerificationCodeSent(true);
      setNotice('Đã gửi mã xác minh. Mã có hiệu lực trong 10 phút.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không gửi được mã xác minh.');
    } finally {
      setBusy(false);
    }
  }

  async function completeEmailVerification() {
    clearMessage();
    setBusy(true);
    try {
      await verifyEmail(code.trim());
      setCode('');
      setVerificationCodeSent(false);
      setNotice('Email đã được xác minh.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không xác minh được email.');
    } finally {
      setBusy(false);
    }
  }

  async function completeReset() {
    clearMessage();
    if (password !== confirmation) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ email: email.trim(), code: code.trim(), newPassword: password });
      setMode('login');
      setPassword('');
      setConfirmation('');
      setCode('');
      setNotice('Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không đặt lại được mật khẩu.');
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword() {
    clearMessage();
    if (password !== confirmation) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, password);
      setCurrentPassword('');
      setPassword('');
      setConfirmation('');
      setNotice('Đã đổi mật khẩu.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không đổi được mật khẩu.');
    } finally {
      setBusy(false);
    }
  }

  const loggedIn = Boolean(authUser);
  const currentTheme = theme;

  if (loggedIn && !authHasPassword && authEmailVerified) return null;

  return (
    <View style={[styles.card, { backgroundColor: currentTheme.card }]}>
      {(!loggedIn || (authHasPassword && authEmailVerified)) && (
        <Text style={[styles.title, { color: currentTheme.text }]}>
          {loggedIn ? 'Mật khẩu tài khoản' : 'Đăng nhập bằng email'}
        </Text>
      )}

      {loggedIn && !authEmailVerified ? (
        <View style={styles.form}>
          <Text style={[styles.title, { color: currentTheme.text }]}>Xác minh email</Text>
          <Text style={[styles.hint, { color: currentTheme.muted }]}>
            Tài khoản đã sẵn sàng. Bạn có thể sử dụng ứng dụng ngay và xác minh email sau để hỗ trợ khôi phục tài khoản.
          </Text>
          {verificationCodeSent ? (
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Mã xác minh 6 chữ số"
              placeholderTextColor={currentTheme.muted}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
            />
          ) : null}
          <ActionButton
            label="Gửi mã xác minh email"
            disabled={busy || authBusy}
            theme={currentTheme}
            onPress={() => void sendVerificationCode()}
          />
          {verificationCodeSent ? (
            <ActionButton
              label="Xác minh email"
              disabled={busy || authBusy || code.trim().length !== 6}
              theme={currentTheme}
              onPress={() => void completeEmailVerification()}
            />
          ) : null}
        </View>
      ) : loggedIn && authHasPassword ? (
        <View style={styles.form}>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Mật khẩu hiện tại"
            placeholderTextColor={currentTheme.muted}
            secureTextEntry
            autoCapitalize="none"
            style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu mới (6–128 ký tự)"
            placeholderTextColor={currentTheme.muted}
            secureTextEntry
            autoCapitalize="none"
            style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
          />
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Nhập lại mật khẩu mới"
            placeholderTextColor={currentTheme.muted}
            secureTextEntry
            autoCapitalize="none"
            style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
          />
          <ActionButton label="Đổi mật khẩu" disabled={busy || authBusy} theme={currentTheme} onPress={() => void updatePassword()} />
        </View>
      ) : !loggedIn ? (
        <>
          <View style={styles.form}>
            {mode === 'forgot' || mode === 'reset' ? (
              <>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={currentTheme.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
                />
                {mode === 'forgot' ? (
                  <ActionButton label="Gửi mã OTP đặt lại mật khẩu" disabled={busy || authBusy} theme={currentTheme} onPress={() => void sendResetCode()} />
                ) : null}
                {mode === 'reset' ? (
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="Mã OTP 6 chữ số"
                    placeholderTextColor={currentTheme.muted}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
                  />
                ) : null}
                {mode === 'reset' ? (
                  <>
                    <PasswordFields
                      password={password}
                      confirmation={confirmation}
                      setPassword={setPassword}
                      setConfirmation={setConfirmation}
                      color={currentTheme.text}
                      borderColor={currentTheme.navigationBorder}
                      muted={currentTheme.muted}
                    />
                    <ActionButton label="Xác minh OTP và đặt lại mật khẩu" disabled={busy || authBusy} theme={currentTheme} onPress={() => void completeReset()} />
                    <ActionButton label="Gửi lại mã OTP" disabled={busy || authBusy} theme={currentTheme} secondary onPress={() => void sendResetCode()} />
                  </>
                ) : null}
              </>
            ) : mode === 'register' ? (
              <>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email đăng ký"
                  placeholderTextColor={currentTheme.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
                />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Tên đăng nhập (3–32 ký tự)"
                  placeholderTextColor={currentTheme.muted}
                  autoCapitalize="none"
                  autoComplete="username"
                  style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
                />
                <PasswordFields
                  password={password}
                  confirmation={confirmation}
                  setPassword={setPassword}
                  setConfirmation={setConfirmation}
                  color={currentTheme.text}
                  borderColor={currentTheme.navigationBorder}
                  muted={currentTheme.muted}
                />
                <ActionButton label="Tạo tài khoản" disabled={busy || authBusy} theme={currentTheme} onPress={() => void completeRegistration()} />
                <Text style={[styles.hint, { color: currentTheme.muted }]}>
                  Mật khẩu từ 6 ký tự. Xác minh email có thể thực hiện sau khi tạo tài khoản.
                </Text>
              </>
            ) : (
              <>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username hoặc email"
                  placeholderTextColor={currentTheme.muted}
                  autoCapitalize="none"
                  autoComplete="username"
                  style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mật khẩu"
                  placeholderTextColor={currentTheme.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  style={[styles.input, { color: currentTheme.text, borderColor: currentTheme.navigationBorder }]}
                />
                <ActionButton
                  label={authBusy ? 'Đang đăng nhập…' : 'Đăng nhập'}
                  disabled={busy || authBusy}
                  theme={currentTheme}
                  onPress={() => {
                    clearMessage();
                    void signInWithEmail(username.trim(), password);
                  }}
                />
              </>
            )}
          </View>
          <View style={styles.links}>
            {mode !== 'login' ? (
              <TextButton label="Quay lại đăng nhập" theme={currentTheme} onPress={() => { setMode('login'); clearMessage(); }} />
            ) : (
              <>
                <TextButton label="Tạo tài khoản" theme={currentTheme} onPress={() => { setMode('register'); clearMessage(); }} />
                <TextButton label="Quên mật khẩu?" theme={currentTheme} onPress={() => { setMode('forgot'); clearMessage(); }} />
              </>
            )}
          </View>
        </>
      ) : null}

      {(error || authError || notice) ? (
        <Text accessibilityRole={error || authError ? 'alert' : 'text'} style={[styles.message, { color: error || authError ? '#B42318' : currentTheme.accent }]}>
          {error ?? authError ?? notice}
        </Text>
      ) : null}
    </View>
  );
}

function PasswordFields({
  password,
  confirmation,
  setPassword,
  setConfirmation,
  color,
  borderColor,
  muted,
}: {
  password: string;
  confirmation: string;
  setPassword: (value: string) => void;
  setConfirmation: (value: string) => void;
  color: string;
  borderColor: string;
  muted: string;
}) {
  return (
    <>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Mật khẩu (6–128 ký tự)"
        placeholderTextColor={muted}
        secureTextEntry
        autoCapitalize="none"
        style={[styles.input, { color, borderColor }]}
      />
      <TextInput
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder="Nhập lại mật khẩu"
        placeholderTextColor={muted}
        secureTextEntry
        autoCapitalize="none"
        style={[styles.input, { color, borderColor }]}
      />
    </>
  );
}

function ActionButton({
  label,
  disabled,
  theme,
  onPress,
  secondary = false,
}: {
  label: string;
  disabled: boolean;
  theme: (typeof calendarThemes)[number];
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { borderColor: theme.accent, backgroundColor: secondary ? 'transparent' : theme.accent },
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.buttonText, { color: secondary ? theme.accent : theme.card }]}>{label}</Text>
    </Pressable>
  );
}

function TextButton({
  label,
  theme,
  onPress,
  active = false,
}: {
  label: string;
  theme: (typeof calendarThemes)[number];
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text style={[styles.link, { color: active ? theme.accent : theme.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, padding: 15, gap: 10 },
  title: { fontSize: 14, fontWeight: '700' },
  form: { gap: 8 },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 12 },
  button: { minHeight: 42, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  buttonText: { fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  link: { fontSize: 12, fontWeight: '700' },
  message: { fontSize: 11, lineHeight: 16 },
  hint: { fontSize: 11, lineHeight: 16 },
});
