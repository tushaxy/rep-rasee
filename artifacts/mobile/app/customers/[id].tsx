import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCustomer, useUpdateCustomer, useDeleteCustomer, getGetCustomersQueryKey, getGetCustomerQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { CardSkeleton } from '@/components/ui/SkeletonLoader';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
const avatarColors = ['#4F46E5', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B'];

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: customer, isLoading } = useGetCustomer(customerId);
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [form, setForm] = useState({ name: '', phone: '', email: '', gstNumber: '', address: '', notes: '', outstandingBalance: '' });
  const [editing, setEditing] = useState(false);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({ name: customer.name, phone: customer.phone ?? '', email: customer.email ?? '', gstNumber: customer.gstNumber ?? '', address: customer.address ?? '', notes: customer.notes ?? '', outstandingBalance: String(customer.outstandingBalance) });
      setIsFav(customer.isFavorite);
    }
  }, [customer]);

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert('Name required'); return; }
    updateCustomer.mutate({ id: customerId, data: { name: form.name.trim(), phone: form.phone || null, email: form.email || null, gstNumber: form.gstNumber || null, address: form.address || null, notes: form.notes || null, outstandingBalance: Number(form.outstandingBalance) || 0, isFavorite: isFav } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetCustomersQueryKey() }); qc.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setEditing(false); },
      onError: () => Alert.alert('Error', 'Failed to update customer'),
    });
  };

  const toggleFav = () => {
    const newFav = !isFav;
    setIsFav(newFav);
    updateCustomer.mutate({ id: customerId, data: { isFavorite: newFav } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetCustomersQueryKey() }); },
    });
    Haptics.selectionAsync();
  };

  const handleDelete = () => {
    Alert.alert('Delete Customer', `Delete "${customer?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteCustomer.mutate({ id: customerId }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetCustomersQueryKey() }); router.back(); }, onError: () => Alert.alert('Error', 'Failed to delete customer') });
      }},
    ]);
  };

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;
  const avatarColor = avatarColors[(customerId ?? 0) % avatarColors.length];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 8 + topPaddingWeb, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Customer</Text>
        <View style={styles.navRight}>
          <TouchableOpacity style={styles.navBtn} onPress={toggleFav}>
            <Feather name="star" size={20} color={isFav ? '#F59E0B' : colors.mutedForeground} />
          </TouchableOpacity>
          {!editing && <TouchableOpacity style={styles.navBtn} onPress={() => setEditing(true)}><Feather name="edit-2" size={18} color={colors.primary} /></TouchableOpacity>}
          <TouchableOpacity style={styles.navBtn} onPress={handleDelete}><Feather name="trash-2" size={18} color={colors.destructive} /></TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}><CardSkeleton /><CardSkeleton /></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: `${avatarColor}22` }]}>
              <Text style={[styles.initials, { color: avatarColor, fontFamily: 'Inter_700Bold' }]}>
                {getInitials(customer?.name ?? 'C')}
              </Text>
            </View>
            <Text style={[styles.customerName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{customer?.name}</Text>
            {(customer?.outstandingBalance ?? 0) > 0 && (
              <View style={[styles.balancePill, { backgroundColor: `${colors.destructive}18` }]}>
                <Text style={[styles.balanceText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>
                  ₹{customer?.outstandingBalance.toLocaleString('en-IN')} outstanding
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Contact Info</Text>
            <ThemedInput label="Name" value={form.name} onChangeText={set('name')} editable={editing} />
            <ThemedInput label="Phone" value={form.phone} onChangeText={set('phone')} editable={editing} keyboardType="phone-pad" />
            <ThemedInput label="Email" value={form.email} onChangeText={set('email')} editable={editing} keyboardType="email-address" autoCapitalize="none" />
            <ThemedInput label="GST Number" value={form.gstNumber} onChangeText={set('gstNumber')} editable={editing} autoCapitalize="characters" />
            <ThemedInput label="Address" value={form.address} onChangeText={set('address')} editable={editing} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Notes</Text>
            <ThemedInput label="Notes" value={form.notes} onChangeText={set('notes')} editable={editing} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
            <ThemedInput label="Outstanding Balance (₹)" value={form.outstandingBalance} onChangeText={set('outstandingBalance')} editable={editing} keyboardType="numeric" />
          </View>

          {editing && (
            <View style={styles.editActions}>
              <PremiumButton label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
              <PremiumButton label={updateCustomer.isPending ? 'Saving...' : 'Save'} onPress={handleSave} loading={updateCustomer.isPending} />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, flex: 1, textAlign: 'center' },
  navRight: { flexDirection: 'row' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  avatarSection: { alignItems: 'center', marginBottom: 8, gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 28 },
  customerName: { fontSize: 20 },
  balancePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  balanceText: { fontSize: 13 },
  section: { borderRadius: 20, padding: 20 },
  sectionTitle: { fontSize: 16, marginBottom: 16 },
  editActions: { flexDirection: 'row', gap: 12 },
});
