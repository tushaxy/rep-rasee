import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, TextInputProps } from 'react-native';
import { useColors } from '@/hooks/useColors';

type ThemedInputProps = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function ThemedInput({ label, error, leftIcon, rightIcon, style, ...props }: ThemedInputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      ) : null}
      <View style={[
        styles.inputRow,
        {
          backgroundColor: colors.input,
          borderColor: focused ? colors.primary : error ? colors.destructive : colors.border,
          borderRadius: 14,
        },
      ]}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.foreground,
              fontFamily: 'Inter_400Regular',
              flex: 1,
            },
            style,
          ]}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: {
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  icon: {
    marginRight: 8,
  },
  error: {
    fontSize: 12,
    marginTop: 6,
  },
});
