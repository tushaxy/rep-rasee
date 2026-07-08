import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

type StatCardProps = {
  label: string;
  value: string;
  icon: string;
  accent?: 'primary' | 'accent' | 'warning' | 'destructive' | 'info';
  subtitle?: string;
};

const accentGradients = {
  primary: ['#4F46E5', '#7C3AED'] as const,
  accent: ['#00C896', '#059669'] as const,
  warning: ['#F59E0B', '#D97706'] as const,
  destructive: ['#EF4444', '#DC2626'] as const,
  info: ['#3B82F6', '#2563EB'] as const,
};

export function StatCard({ label, value, icon, accent = 'primary', subtitle }: StatCardProps) {
  const colors = useColors();
  const gradient = accentGradients[accent];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <LinearGradient
        colors={gradient}
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Feather name={icon as any} size={18} color="#FFFFFF" />
      </LinearGradient>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    flex: 1,
    minWidth: 140,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    }),
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 22,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
  },
});
