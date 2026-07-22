import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '../components/ui';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';

export function ProfileScreen() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { myTotals } = useChallengeData();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  const onSave = async () => {
    setSaving(true);
    const err = await updateProfile({ display_name: name.trim() || 'Athlete' });
    setSaving(false);
    if (err) Alert.alert('Update failed', err);
    else Alert.alert('Saved', 'Profile updated.');
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Title>Profile</Title>
        <Muted>{user?.email}</Muted>

        <Card style={styles.card}>
          <Field
            label="Display name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Button
            label="Save name"
            onPress={() => void onSave()}
            loading={saving}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.heading}>Challenge snapshot</Text>
          <Row
            label="Banked extra-day credits"
            value={String(myTotals?.bankedCredits ?? 0)}
          />
          <Row
            label="Missed days (YTD)"
            value={String(myTotals?.totalMissedDays ?? 0)}
          />
          <Row
            label="Money owed (YTD)"
            value={`$${myTotals?.totalMoneyOwedMxn ?? 0} MXN`}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.heading}>Rules reminder</Text>
          <Muted>
            5 workout days / week (Mon–Sun). A same-day second workout unlocks a
            banked credit when you also hit 5 days and 6+ total workouts. Credits
            apply forward-only to cancel future missed days ($100 MXN each).
          </Muted>
        </Card>

        <Button
          label="Sign out"
          variant="danger"
          onPress={() => void signOut()}
        />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Muted>{label}</Muted>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  heading: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 16,
  },
});
