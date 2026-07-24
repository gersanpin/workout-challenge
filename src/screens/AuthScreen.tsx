import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Brand, Button, Field, Screen } from '../components/ui';
import { APP_NAME } from '../constants/challenge';
import { borderWidth, colors, spacing, typography } from '../constants/theme';

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
      setError('Correo y contraseña requeridos.');
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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.hero}>
          <Image
            source={require('../../assets/fortachones-logo.png')}
            style={styles.logo}
          />
          <Brand>{APP_NAME}</Brand>
          <Text style={styles.tagline}>
            Registra. Acumula. Paga o pelea. El chat del grupo vive aquí.
          </Text>
        </View>

        {!configured ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>SUPABASE APAGADO</Text>
            <Text style={styles.bannerBody}>
              Copia `.env.example` → `.env` y corre `supabase/schema.sql`.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {mode === 'signup' ? (
            <Field
              label="Nombre"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              placeholder="Gerardo"
            />
          ) : null}
          <Field
            label="Correo"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tu@correo.com"
          />
          <Field
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={mode === 'signin' ? 'ENTRAR' : 'CREAR CUENTA'}
            onPress={() => void onSubmit()}
            loading={loading}
            disabled={!configured}
          />
          <Button
            label={
              mode === 'signin' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'
            }
            variant="ghost"
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center' },
  inner: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  hero: { alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 120,
    height: 120,
    borderWidth: borderWidth.thick,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  form: { gap: spacing.md },
  error: { color: colors.danger, fontFamily: 'Inter_400Regular' },
  banner: {
    backgroundColor: colors.bgElevated,
    borderWidth: borderWidth.thick,
    borderColor: colors.danger,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.danger,
    fontSize: 20,
    letterSpacing: 1,
  },
  bannerBody: { ...typography.body, color: colors.textMuted },
});
