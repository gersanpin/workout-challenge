import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { REQUIRED_WORKOUT_DAYS } from '../constants/challenge';

/**
 * Stacked weight plates — one plate per completed workout day this week.
 * Filled plates = done (green rim). Empty slots = remaining (bone outline).
 */
export function WeightPlateStack({
  daysDone,
  maxDays = REQUIRED_WORKOUT_DAYS,
}: {
  daysDone: number;
  maxDays?: number;
}) {
  const done = Math.max(0, Math.min(daysDone, maxDays));
  const plates = Array.from({ length: maxDays }, (_, i) => i < done);

  return (
    <View style={styles.wrap}>
      <View style={styles.stack}>
        {plates.map((filled, i) => (
          <View
            key={i}
            style={[
              styles.plate,
              filled ? styles.plateFilled : styles.plateEmpty,
              { zIndex: maxDays - i, marginLeft: i === 0 ? 0 : -18 },
            ]}
          >
            <View style={[styles.hub, filled ? styles.hubFilled : null]} />
          </View>
        ))}
      </View>
      <Text style={styles.label}>
        {done}/{maxDays} DÍAS
      </Text>
    </View>
  );
}

const PLATE = 44;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PLATE + 4,
  },
  plate: {
    width: PLATE,
    height: PLATE,
    borderRadius: PLATE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  plateFilled: {
    borderColor: colors.plateAccent,
    backgroundColor: colors.accentSoft,
  },
  plateEmpty: {
    borderColor: colors.borderMuted,
  },
  hub: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.borderMuted,
  },
  hubFilled: {
    backgroundColor: colors.plateAccent,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    letterSpacing: 1.5,
  },
});
