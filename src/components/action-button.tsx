import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ActionButton({
  label,
  disabled,
  onPress,
  danger = false,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: theme.backgroundSelected,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: danger ? theme.danger : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function FillButton({
  label,
  onPress,
  disabled = false,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
}) {
  const theme = useTheme();
  const backgroundColor = tone === 'primary' ? theme.accent : tone === 'danger' ? theme.danger : theme.backgroundSelected;
  const color = tone === 'secondary' ? theme.text : '#ffffff';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fill,
        { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
