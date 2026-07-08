import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCustomers } from '@workspace/api-client-react';
import { CustomerCard } from '@/components/ui/CustomerCard';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/SkeletonLoader';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function CustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);

  const { data: customers, isLoading, refetch, isRefetching } = useGetCustomers({
    search: search || undefined,
    favorites: showFavorites || undefined,
  });

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 + topPaddingWeb, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Customers</Text>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: showFavorites ? '#FEF3C7' : colors.card }]}
          onPress={() => {
            Haptics.selectionAsync();
            setShowFavorites(!showFavorites);
          }}
        >
          <Feather name="star" size={16} color={showFavorites ? '#F59E0B' : colors.mutedForeground} />
          <Text style={[styles.filterLabel, { color: showFavorites ? '#F59E0B' : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
            Favorites
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <ThemedInput
          placeholder="Search customers..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Feather name="search" size={16} color={colors.mutedForeground} />}
          style={{ marginBottom: 0 }}
        />
      </View>

      {!isLoading && customers && (
        <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {customers.length} customer{customers.length !== 1 ? 's' : ''}
        </Text>
      )}

      <FlatList
        data={isLoading ? [] : (customers ?? [])}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <CustomerCard customer={item} onPress={() => router.push(`/customers/${item.id}`)} />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          isLoading ? (
            <View>{[1,2,3].map(i => <CardSkeleton key={i} />)}</View>
          ) : (
            <EmptyState icon="users" title="No customers yet" subtitle="Add your first customer to get started" />
          )
        }
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => router.push('/customers/new')}
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 26 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  filterLabel: { fontSize: 13 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 4 },
  count: { fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
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
