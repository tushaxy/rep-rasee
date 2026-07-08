import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

type PremiumButtonProps = {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function PremiumButton({
  onPress,
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  size = 'md',
}: PremiumButtonProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const heights = { sm: 40, md: 52, lg: 60 };
  const fontSizes = { sm: 13, md: 15, lg: 17 };

  if (variant === 'primary') {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled || loading}
        >
          <LinearGradient
            colors={disabled ? [colors.muted, colors.muted] : ['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.button, { height: heights[size], borderRadius: 16 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.labelPrimary, { fontSize: fontSizes[size], fontFamily: 'Inter_600SemiBold' }]}>
                {label}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const variantStyles = {
    secondary: { bg: colors.secondary, textColor: colors.primary },
    destructive: { bg: colors.destructive, textColor: colors.destructiveForeground },
    ghost: { bg: 'transparent', textColor: colors.primary },
  };
  const vs = variantStyles[variant as keyof typeof variantStyles] ?? variantStyles.secondary;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: vs.bg, height: heights[size], borderRadius: 16 },
          variant === 'ghost' && { borderWidth: 1.5, borderColor: colors.primary },
        ]}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={vs.textColor} />
        ) : (
          <Text style={[styles.label, { color: vs.textColor, fontSize: fontSizes[size], fontFamily: 'Inter_600SemiBold' }]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  labelPrimary: {
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  label: {
    letterSpacing: 0.3,
  },
});
