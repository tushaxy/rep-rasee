import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetDashboardStats, useGetProducts, useGetInvoices } from '@workspace/api-client-react';
import { BarChart } from '@/components/ui/BarChart';
import { StatCard } from '@/components/ui/StatCard';
import { CardSkeleton } from '@/components/ui/SkeletonLoader';
import { ProductCard } from '@/components/ui/ProductCard';
import { router } from 'expo-router';

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: lowStockProducts } = useGetProducts({ lowStock: true });
  const { data: invoices } = useGetInvoices();

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;

  const totalRevenue = invoices?.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.grandTotal, 0) ?? 0;
  const totalOutstanding = invoices?.filter(i => ['sent', 'partial'].includes(i.status)).reduce((s, i) => s + (i.grandTotal - i.paidAmount), 0) ?? 0;
  const totalInvoices = invoices?.length ?? 0;
  const paidInvoices = invoices?.filter(i => i.status === 'paid').length ?? 0;

  const formatCurrency = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16 + topPaddingWeb, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Reports</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Business overview
      </Text>

      {isLoading ? (
        <><CardSkeleton /><CardSkeleton /></>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon="trending-up" accent="primary" />
            <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon="clock" accent="warning" />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Total Invoices" value={String(totalInvoices)} icon="file-text" accent="info" />
            <StatCard label="Paid" value={String(paidInvoices)} icon="check-circle" accent="accent" />
          </View>
        </>
      )}

      {/* Revenue chart */}
      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Monthly Revenue</Text>
        {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <BarChart data={stats.monthlyRevenue} height={160} />
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              No data yet
            </Text>
          </View>
        )}
      </View>

      {/* Invoice breakdown */}
      {invoices && invoices.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Invoice Status</Text>
          {['paid', 'sent', 'partial', 'draft', 'cancelled'].map(status => {
            const count = invoices.filter(i => i.status === status).length;
            if (count === 0) return null;
            const pct = Math.round((count / invoices.length) * 100);
            const statusColors: Record<string, string> = {
              paid: colors.success, sent: colors.info, partial: colors.warning,
              draft: colors.mutedForeground, cancelled: colors.destructive,
            };
            return (
              <View key={status} style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
                <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: statusColors[status] }]} />
                </View>
                <Text style={[styles.breakdownCount, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {count}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Low stock */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Low Stock Alert</Text>
          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {lowStockProducts.length} item{lowStockProducts.length !== 1 ? 's' : ''} need restocking
          </Text>
          {lowStockProducts.slice(0, 5).map(p => (
            <ProductCard key={p.id} product={p} onPress={() => router.push(`/inventory/${p.id}`)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 26, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    borderRadius: 20, padding: 18, marginBottom: 16,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    }),
  },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, marginBottom: 12 },
  emptyChart: { height: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  breakdownLabel: { width: 70, fontSize: 13 },
  progressBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  breakdownCount: { width: 24, textAlign: 'right', fontSize: 13 },
});
