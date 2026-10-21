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
      // No profile for this user → go to profile selector
      router.replace('/profile-select');
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
            Welcome back 👋
          </Text>
          <Text style={[styles.shopName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {business?.shopName ?? 'RASEED'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/settings')}
        >
          <Feather name="settings" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Today stats banner */}
      {isLoading ? (
        <CardSkeleton style={{ height: 100, marginBottom: 16 }} />
      ) : (
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.todayBanner}
        >
          <View>
            <Text style={styles.bannerLabel}>Today's Sales</Text>
            <Text style={styles.bannerValue}>{formatCurrency(stats?.todaySales ?? 0)}</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View>
            <Text style={styles.bannerLabel}>Orders</Text>
            <Text style={styles.bannerValue}>{stats?.todayOrders ?? 0}</Text>
          </View>
        </LinearGradient>
      )}

      {/* Stat cards */}
      <View style={styles.statsGrid}>
        {isLoading ? (
          <>
            <CardSkeleton style={{ flex: 1, height: 90 }} />
            <CardSkeleton style={{ flex: 1, height: 90 }} />
          </>
        ) : (
          <>
            <StatCard
              label="Pending Payments"
              value={formatCurrency(stats?.pendingPayments ?? 0)}
              icon="clock"
              color="#F59E0B"
              colors={colors}
            />
            <StatCard
              label="Inventory Value"
              value={formatCurrency(stats?.inventoryValue ?? 0)}
              icon="package"
              color="#10B981"
              colors={colors}
            />
          </>
        )}
      </View>

      <View style={styles.statsGrid}>
        {isLoading ? (
          <>
            <CardSkeleton style={{ flex: 1, height: 90 }} />
            <CardSkeleton style={{ flex: 1, height: 90 }} />
          </>
        ) : (
          <>
            <StatCard
              label="Low Stock Items"
              value={String(stats?.lowStockCount ?? 0)}
              icon="alert-circle"
              color="#EF4444"
              colors={colors}
            />
            <StatCard
              label="Total Customers"
              value={String(stats?.totalCustomers ?? 0)}
              icon="users"
              color="#6366F1"
              colors={colors}
            />
          </>
        )}
      </View>

      {/* Revenue chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Revenue (Last 6 Months)
        </Text>
        {isLoading ? (
          <CardSkeleton style={{ height: 140 }} />
        ) : (
          <BarChart data={stats?.monthlyRevenue ?? []} colors={colors} />
        )}
      </View>

      {/* Quick actions */}
      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
        Quick Actions
      </Text>
      <View style={styles.quickActions}>
        {[
          { label: 'New Invoice', icon: 'file-plus', route: '/invoices/new', color: '#4F46E5' },
          { label: 'Add Product', icon: 'plus-square', route: '/inventory/new', color: '#10B981' },
          { label: 'Add Customer', icon: 'user-plus', route: '/customers/new', color: '#F59E0B' },
          { label: 'Reports', icon: 'bar-chart-2', route: '/(tabs)/reports', color: '#EF4444' },
        ].map(action => (
          <TouchableOpacity
            key={action.label}
            style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickBtnIcon, { backgroundColor: action.color + '22' }]}>
              <Feather name={action.icon as any} size={20} color={action.color} />
            </View>
            <Text style={[styles.quickBtnLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  greeting: { fontSize: 13, marginBottom: 2 },
  shopName: { fontSize: 22 },
  settingsBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  todayBanner: { borderRadius: 20, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  bannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginBottom: 4 },
  bannerValue: { fontSize: 28, fontWeight: '800', color: '#fff', fontFamily: 'Inter_700Bold' },
  bannerDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  chartCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  chartTitle: { fontSize: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, marginTop: 4 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: { width: '47%', padding: 16, borderRadius: 18, alignItems: 'center', gap: 10, borderWidth: 1 },
  quickBtnIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickBtnLabel: { fontSize: 13, textAlign: 'center' },
});
