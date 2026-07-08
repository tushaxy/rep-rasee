import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

type StatusBadgeProps = {
  status: string;
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  paid: { bg: '#D1FAE5', text: '#065F46', label: 'Paid' },
  draft: { bg: '#F1F5F9', text: '#475569', label: 'Draft' },
  sent: { bg: '#DBEAFE', text: '#1E40AF', label: 'Sent' },
  partial: { bg: '#FEF3C7', text: '#92400E', label: 'Partial' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
  overdue: { bg: '#FEE2E2', text: '#991B1B', label: 'Overdue' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] ?? { bg: '#F1F5F9', text: '#475569', label: status };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text, fontFamily: 'Inter_600SemiBold' }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
