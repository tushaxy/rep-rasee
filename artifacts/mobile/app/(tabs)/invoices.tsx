import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetInvoices } from '@workspace/api-client-react';
import { InvoiceCard } from '@/components/ui/InvoiceCard';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/SkeletonLoader';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'paid', 'partial', 'cancelled'];

export default function InvoicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: invoices, isLoading, refetch, isRefetching } = useGetInvoices({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 + topPaddingWeb, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Invoices</Text>
      </View>

      <View style={styles.searchWrap}>
        <ThemedInput
          placeholder="Search invoices..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Feather name="search" size={16} color={colors.mutedForeground} />}
          style={{ marginBottom: 0 }}
        />
      </View>

      {/* Status filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterPill,
              {
                backgroundColor: statusFilter === f ? colors.primary : colors.card,
                borderColor: statusFilter === f ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setStatusFilter(f);
            }}
          >
            <Text style={[
              styles.filterPillText,
              {
                color: statusFilter === f ? '#FFF' : colors.mutedForeground,
                fontFamily: 'Inter_500Medium',
              },
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={isLoading ? [] : (invoices ?? [])}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <InvoiceCard invoice={item} onPress={() => router.push(`/invoices/${item.id}`)} />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          isLoading ? (
            <View>{[1,2,3].map(i => <CardSkeleton key={i} />)}</View>
          ) : (
            <EmptyState icon="file-text" title="No invoices found" subtitle="Create your first invoice to get started" />
          )
        }
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => router.push('/invoices/new')}
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 26 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  filterScroll: { flexGrow: 0, marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'web' ? 100 : 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 6px 20px rgba(79,70,229,0.4)' },
    }),
  },
});
