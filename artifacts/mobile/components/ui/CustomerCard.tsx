import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

type Customer = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  outstandingBalance: number;
  isFavorite: boolean;
};

type CustomerCardProps = {
  customer: Customer;
  onPress: () => void;
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const avatarColors = ['#4F46E5', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const colors = useColors();
  const avatarColor = avatarColors[customer.id % avatarColors.length];
  const hasBalance = customer.outstandingBalance > 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { backgroundColor: `${avatarColor}22` }]}>
        <Text style={[styles.initials, { color: avatarColor, fontFamily: 'Inter_700Bold' }]}>
          {getInitials(customer.name)}
        </Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
            {customer.name}
          </Text>
          {customer.isFavorite && <Feather name="star" size={14} color="#F59E0B" />}
        </View>
        <Text style={[styles.contact, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
          {customer.phone ?? customer.email ?? 'No contact info'}
        </Text>
      </View>
      {hasBalance && (
        <View style={[styles.balancePill, { backgroundColor: `${colors.destructive}18` }]}>
          <Text style={[styles.balanceText, { color: colors.destructive, fontFamily: 'Inter_700Bold' }]}>
            ₹{customer.outstandingBalance.toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.balanceLabel, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>due</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 16 },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, flex: 1 },
  contact: { fontSize: 12 },
  balancePill: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  balanceText: { fontSize: 13 },
  balanceLabel: { fontSize: 10 },
});
