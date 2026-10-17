import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { api, setTokens, ApiError } from '../lib/api';
import { COLORS, FONTS } from '../theme';

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.login(email.trim().toLowerCase(), password);
      await setTokens(res.data.accessToken, res.data.refreshToken);
      onLogin();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Check your connection.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <Text style={styles.appName}>EPMS Crew</Text>
          <Text style={styles.appSub}>Event Production Management</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="crew@epms.local"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>EPMS © 2026 — Restricted Access</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    fontFamily: FONTS.bold,
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  appSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  form: { gap: 16 },
  field: { gap: 6 },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
  },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.bold,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
    fontFamily: FONTS.regular,
  },
});
