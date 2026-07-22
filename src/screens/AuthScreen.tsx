import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Field, Screen } from '../components/ui';
import { colors, spacing, typography } from '../constants/theme';

export function AuthScreen() {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    const err =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>Squad Sweat</Text>
          <Text style={styles.tagline}>
            Log workouts. Bank extra days. Keep each other honest.
          </Text>
        </View>

        {!configured ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Supabase not configured</Text>
            <Text style={styles.bannerBody}>
              Copy `.env.example` to `.env`, add your project URL and anon key,
              then restart Expo. Run `supabase/schema.sql` in your project SQL
              editor.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {mode === 'signup' ? (
            <Field
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              placeholder="Alex"
            />
          ) : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={mode === 'signin' ? 'Log in' : 'Create account'}
            onPress={() => void onSubmit()}
            loading={loading}
            disabled={!configured}
          />
          <Button
            label={
              mode === 'signin'
                ? 'Need an account? Sign up'
                : 'Already have an account? Log in'
            }
            variant="ghost"
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
  },
  inner: {
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.sm,
  },
  brand: {
    ...typography.brand,
    color: colors.accent,
  },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  form: {
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  banner: {
    backgroundColor: colors.bgSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerTitle: {
    color: colors.warning,
    fontWeight: '700',
  },
  bannerBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
