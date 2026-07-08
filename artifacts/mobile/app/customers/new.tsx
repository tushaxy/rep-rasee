import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateCustomer, getGetCustomersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function NewCustomerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const createCustomer = useCreateCustomer();

  const [form, setForm] = useState({ name: '', phone: '', email: '', gstNumber: '', address: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Customer name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createCustomer.mutate({
      data: {
        name: form.name.trim(),
        phone: form.phone || null,
        email: form.email || null,
        gstNumber: form.gstNumber || null,
        address: form.address || null,
        notes: form.notes || null,
        outstandingBalance: 0,
        isFavorite: false,
      },
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
      onError: () => Alert.alert('Error', 'Failed to add customer'),
    });
  };

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 8 + topPaddingWeb, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>New Customer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Customer Details</Text>
          <ThemedInput label="Full Name *" value={form.name} onChangeText={set('name')} error={errors.name} placeholder="e.g. Rahul Sharma" autoCapitalize="words" />
          <ThemedInput label="Phone" value={form.phone} onChangeText={set('phone')} placeholder="+91 98765 43210" keyboardType="phone-pad" />
          <ThemedInput label="Email" value={form.email} onChangeText={set('email')} placeholder="customer@example.com" keyboardType="email-address" autoCapitalize="none" />
          <ThemedInput label="GST Number" value={form.gstNumber} onChangeText={set('gstNumber')} placeholder="e.g. 29AAAPZ4567R1Z8" autoCapitalize="characters" />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Additional Info</Text>
          <ThemedInput label="Address" value={form.address} onChangeText={set('address')} placeholder="Full address" multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
          <ThemedInput label="Notes" value={form.notes} onChangeText={set('notes')} placeholder="Any notes about this customer..." multiline numberOfLines={2} style={{ height: 60, textAlignVertical: 'top' }} />
        </View>

        <PremiumButton label={createCustomer.isPending ? 'Saving...' : 'Add Customer'} onPress={handleSubmit} loading={createCustomer.isPending} size="lg" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  section: { borderRadius: 20, padding: 20 },
  sectionTitle: { fontSize: 16, marginBottom: 16 },
});
