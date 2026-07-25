import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Lifts content above the software keyboard so composers stay visible.
 * Pair with tabBarHideOnKeyboard and Android softwareKeyboardLayoutMode: "resize".
 * On Android, window resize handles most of the lift — avoid double-offset.
 */
export function KeyboardAvoid({
  children,
  style,
  offset = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra offset (headers, status bars). Usually 0 inside tab screens. */
  offset?: number;
}) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
