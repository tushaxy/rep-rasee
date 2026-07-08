import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetDashboardStats, useGetBusinessProfile } from '@workspace/api-client-react';
import { StatCard } from '@/components/ui/StatCard';
import { BarChart } from '@/components/ui/BarChart';
import { CardSkeleton } from '@/components/ui/SkeletonLoader';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading, refetch, isRefetching } = useGetDashboardStats();
  const { data: business, isError: noProfile } = useGetBusinessProfile();

  useEffect(() => {
    if (noProfile) {
      router.replace('/onboarding');
    }
  }, [noProfile]);

  const formatCurrency = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  };

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16 + topPaddingWeb, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
          </Text>
          <Text style={[styles.shopName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {business?.shopName ?? 'My Business'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.card }]}
          onPress={() => router.push('/settings')}
        >
          <Feather name="settings" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/invoices/new')}
        >
          <Feather name="file-plus" size={18} color="#FFF" />
          <Text style={[styles.quickActionLabel, { fontFamily: 'Inter_600SemiBold', color: '#FFF' }]}>New Invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.card }]}
          onPress={() => router.push('/customers/new')}
        >
          <Feather name="user-plus" size={18} color={colors.primary} />
          <Text style={[styles.quickActionLabel, { fontFamily: 'Inter_600SemiBold', color: colors.primary }]}>Add Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.card }]}
          onPress={() => router.push('/inventory/new')}
        >
          <Feather name="plus-square" size={18} color={colors.primary} />
          <Text style={[styles.quickActionLabel, { fontFamily: 'Inter_600SemiBold', color: colors.primary }]}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Stats grid */}
      {isLoading ? (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard
              label="Today's Sales"
              value={formatCurrency(stats?.todaySales ?? 0)}
              icon="trending-up"
              accent="primary"
              subtitle={`${stats?.todayOrders ?? 0} orders`}
            />
            <StatCard
              label="Pending"
              value={formatCurrency(stats?.pendingPayments ?? 0)}
              icon="clock"
              accent="warning"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Inventory Value"
              value={formatCurrency(stats?.inventoryValue ?? 0)}
              icon="archive"
              accent="info"
            />
            <StatCard
              label="Customers"
              value={String(stats?.totalCustomers ?? 0)}
              icon="users"
              accent="accent"
            />
          </View>
          {(stats?.lowStockCount ?? 0) > 0 && (
            <TouchableOpacity onPress={() => router.push('/inventory')} activeOpacity={0.9}>
              <LinearGradient
                colors={['#FEF3C7', '#FDE68A']}
                style={styles.alertBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Feather name="alert-circle" size={18} color="#92400E" />
                <Text style={[styles.alertText, { fontFamily: 'Inter_500Medium', color: '#92400E' }]}>
                  {stats?.lowStockCount} item{stats?.lowStockCount !== 1 ? 's' : ''} running low on stock
                </Text>
                <Feather name="chevron-right" size={16} color="#92400E" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Revenue chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <Text style={[styles.chartTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Revenue Trend
        </Text>
        <Text style={[styles.chartSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Last 6 months
        </Text>
        {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
          <View style={styles.chartWrap}>
            <BarChart data={stats.monthlyRevenue} height={160} />
          </View>
        ) : (
          <View style={styles.chartEmpty}>
            <Text style={[styles.chartEmptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              No revenue data yet
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 13, marginBottom: 2 },
  shopName: { fontSize: 24 },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 6,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    }),
  },
  quickActionLabel: { fontSize: 11, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  alertText: { flex: 1, fontSize: 13 },
  chartCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 4,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    }),
  },
  chartTitle: { fontSize: 17, marginBottom: 4 },
  chartSubtitle: { fontSize: 12, marginBottom: 16 },
  chartWrap: { alignItems: 'center' },
  chartEmpty: { height: 120, alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { fontSize: 14 },
});
