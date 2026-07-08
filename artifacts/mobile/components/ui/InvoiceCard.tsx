import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { StatusBadge } from './StatusBadge';
import { Feather } from '@expo/vector-icons';

type Invoice = {
  id: number;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  grandTotal: number;
  paidAmount: number;
  status: string;
};

type InvoiceCardProps = {
  invoice: Invoice;
  onPress: () => void;
};

export function InvoiceCard({ invoice, onPress }: InvoiceCardProps) {
  const colors = useColors();
  const due = invoice.grandTotal - invoice.paidAmount;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.number, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            {invoice.invoiceNumber}
          </Text>
          <Text style={[styles.customer, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            {invoice.customerName}
          </Text>
        </View>
        <StatusBadge status={invoice.status} />
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Total</Text>
          <Text style={[styles.footerValue, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            ₹{invoice.grandTotal.toLocaleString('en-IN')}
          </Text>
        </View>
        {due > 0 && (
          <View style={styles.footerItem}>
            <Text style={[styles.footerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Due</Text>
            <Text style={[styles.footerValue, { color: colors.destructive, fontFamily: 'Inter_700Bold' }]}>
              ₹{due.toLocaleString('en-IN')}
            </Text>
          </View>
        )}
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Date</Text>
          <Text style={[styles.footerDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 3px 10px rgba(0,0,0,0.08)' },
    }),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  number: { fontSize: 12, marginBottom: 2, letterSpacing: 0.5 },
  customer: { fontSize: 15 },
  divider: { height: 1, marginBottom: 12 },
  footer: { flexDirection: 'row', gap: 20 },
  footerItem: { gap: 2 },
  footerLabel: { fontSize: 11, letterSpacing: 0.3 },
  footerValue: { fontSize: 15 },
  footerDate: { fontSize: 13 },
});
