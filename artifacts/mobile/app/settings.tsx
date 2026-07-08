import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetBusinessProfile, useUpdateBusinessProfile, getGetBusinessProfileQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'react-native';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useGetBusinessProfile();
  const updateProfile = useUpdateBusinessProfile();

  const [form, setForm] = useState({ shopName: '', ownerName: '', phone: '', email: '', gstNumber: '', panNumber: '', address: '', state: '', city: '', pincode: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '', defaultTaxPercent: '18', currency: 'INR', termsAndConditions: '', invoiceNotes: '' });

  useEffect(() => {
    if (profile) {
      setForm({
        shopName: profile.shopName,
        ownerName: profile.ownerName,
        phone: profile.phone,
        email: profile.email ?? '',
        gstNumber: profile.gstNumber ?? '',
        panNumber: profile.panNumber ?? '',
        address: profile.address ?? '',
        state: profile.state ?? '',
        city: profile.city ?? '',
        pincode: profile.pincode ?? '',
        bankName: profile.bankName ?? '',
        accountNumber: profile.accountNumber ?? '',
        ifscCode: profile.ifscCode ?? '',
        upiId: profile.upiId ?? '',
        defaultTaxPercent: String(profile.defaultTaxPercent),
        currency: profile.currency,
        termsAndConditions: profile.termsAndConditions ?? '',
        invoiceNotes: profile.invoiceNotes ?? '',
      });
    }
  }, [profile]);

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.shopName.trim()) { Alert.alert('Shop name required'); return; }
    if (!form.ownerName.trim()) { Alert.alert('Owner name required'); return; }
    if (!form.phone.trim()) { Alert.alert('Phone required'); return; }

    updateProfile.mutate({
      data: {
        shopName: form.shopName.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        email: form.email || null,
        gstNumber: form.gstNumber || null,
        panNumber: form.panNumber || null,
        address: form.address || null,
        state: form.state || null,
        city: form.city || null,
        pincode: form.pincode || null,
        bankName: form.bankName || null,
        accountNumber: form.accountNumber || null,
        ifscCode: form.ifscCode || null,
        upiId: form.upiId || null,
        defaultTaxPercent: Number(form.defaultTaxPercent) || 18,
        currency: form.currency || 'INR',
        termsAndConditions: form.termsAndConditions || null,
        invoiceNotes: form.invoiceNotes || null,
      },
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBusinessProfileQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved', 'Business profile updated');
      },
      onError: () => Alert.alert('Error', 'Failed to save profile'),
    });
  };

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 8 + topPaddingWeb, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Business Profile</Text>
          <ThemedInput label="Shop Name *" value={form.shopName} onChangeText={set('shopName')} placeholder="Your Business Name" autoCapitalize="words" />
          <ThemedInput label="Owner Name *" value={form.ownerName} onChangeText={set('ownerName')} autoCapitalize="words" />
          <ThemedInput label="Phone *" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          <ThemedInput label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Tax & Compliance</Text>
          <ThemedInput label="GST Number" value={form.gstNumber} onChangeText={set('gstNumber')} autoCapitalize="characters" placeholder="29AAAPZ4567R1Z8" />
          <ThemedInput label="PAN Number" value={form.panNumber} onChangeText={set('panNumber')} autoCapitalize="characters" />
          <View style={styles.row}>
            <View style={styles.half}><ThemedInput label="Default GST %" value={form.defaultTaxPercent} onChangeText={set('defaultTaxPercent')} keyboardType="numeric" /></View>
            <View style={styles.half}><ThemedInput label="Currency" value={form.currency} onChangeText={set('currency')} autoCapitalize="characters" /></View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Address</Text>
          <ThemedInput label="Address" value={form.address} onChangeText={set('address')} multiline numberOfLines={2} style={{ height: 70, textAlignVertical: 'top' }} />
          <View style={styles.row}>
            <View style={styles.half}><ThemedInput label="City" value={form.city} onChangeText={set('city')} autoCapitalize="words" /></View>
            <View style={styles.half}><ThemedInput label="State" value={form.state} onChangeText={set('state')} autoCapitalize="words" /></View>
          </View>
          <ThemedInput label="Pincode" value={form.pincode} onChangeText={set('pincode')} keyboardType="numeric" />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Bank Details</Text>
          <ThemedInput label="Bank Name" value={form.bankName} onChangeText={set('bankName')} autoCapitalize="words" />
          <ThemedInput label="Account Number" value={form.accountNumber} onChangeText={set('accountNumber')} keyboardType="numeric" />
          <ThemedInput label="IFSC Code" value={form.ifscCode} onChangeText={set('ifscCode')} autoCapitalize="characters" />
          <ThemedInput label="UPI ID" value={form.upiId} onChangeText={set('upiId')} autoCapitalize="none" />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Invoice Settings</Text>
          <ThemedInput label="Terms & Conditions" value={form.termsAndConditions} onChangeText={set('termsAndConditions')} multiline numberOfLines={4} style={{ height: 100, textAlignVertical: 'top' }} placeholder="e.g. Payment due within 30 days..." />
          <ThemedInput label="Invoice Notes" value={form.invoiceNotes} onChangeText={set('invoiceNotes')} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} placeholder="e.g. Thank you for your business!" />
        </View>

        <PremiumButton label={updateProfile.isPending ? 'Saving...' : 'Save Settings'} onPress={handleSave} loading={updateProfile.isPending} size="lg" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  section: { borderRadius: 20, padding: 20 },
  sectionTitle: { fontSize: 16, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});
