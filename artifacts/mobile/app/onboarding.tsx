import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUpdateBusinessProfile, getGetBusinessProfileQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const updateProfile = useUpdateBusinessProfile();

  const [form, setForm] = useState({ shopName: '', ownerName: '', phone: '', email: '', gstNumber: '', address: '', state: '', city: '', pincode: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.shopName.trim()) e.shopName = 'Business name required';
    if (!form.ownerName.trim()) e.ownerName = 'Owner name required';
    if (!form.phone.trim()) e.phone = 'Phone required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleComplete = () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    updateProfile.mutate({
      data: {
        shopName: form.shopName.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        email: form.email || null,
        gstNumber: form.gstNumber || null,
        address: form.address || null,
        state: form.state || null,
        city: form.city || null,
        pincode: form.pincode || null,
        defaultTaxPercent: 18,
        currency: 'INR',
      },
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBusinessProfileQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      },
      onError: () => Alert.alert('Error', 'Failed to save profile. Please try again.'),
    });
  };

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED', colors.background]}
        style={[styles.gradient, { paddingTop: insets.top + 40 + topPaddingWeb }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <Text style={[styles.welcomeTitle, { fontFamily: 'Inter_700Bold' }]}>Welcome to</Text>
        <Text style={[styles.appName, { fontFamily: 'Inter_700Bold' }]}>BizInvoice</Text>
        <Text style={[styles.welcomeSub, { fontFamily: 'Inter_400Regular' }]}>
          Set up your business profile to get started
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Business Info</Text>
          <ThemedInput label="Business Name *" value={form.shopName} onChangeText={set('shopName')} error={errors.shopName} placeholder="e.g. Sharma Traders" autoCapitalize="words" />
          <ThemedInput label="Owner Name *" value={form.ownerName} onChangeText={set('ownerName')} error={errors.ownerName} placeholder="Your full name" autoCapitalize="words" />
          <ThemedInput label="Phone *" value={form.phone} onChangeText={set('phone')} error={errors.phone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
          <ThemedInput label="Email" value={form.email} onChangeText={set('email')} placeholder="business@example.com" keyboardType="email-address" autoCapitalize="none" />
          <ThemedInput label="GST Number" value={form.gstNumber} onChangeText={set('gstNumber')} placeholder="Optional" autoCapitalize="characters" />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Address</Text>
          <ThemedInput label="Address" value={form.address} onChangeText={set('address')} placeholder="Street address" multiline numberOfLines={2} style={{ height: 70, textAlignVertical: 'top' }} />
          <View style={styles.row}>
            <View style={styles.half}><ThemedInput label="City" value={form.city} onChangeText={set('city')} autoCapitalize="words" /></View>
            <View style={styles.half}><ThemedInput label="State" value={form.state} onChangeText={set('state')} autoCapitalize="words" /></View>
          </View>
          <ThemedInput label="Pincode" value={form.pincode} onChangeText={set('pincode')} keyboardType="numeric" />
        </View>

        <PremiumButton label={updateProfile.isPending ? 'Setting up...' : 'Get Started'} onPress={handleComplete} loading={updateProfile.isPending} size="lg" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { paddingHorizontal: 24, paddingBottom: 40 },
  welcomeTitle: { fontSize: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  appName: { fontSize: 40, color: '#FFFFFF', marginBottom: 12 },
  welcomeSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  card: { borderRadius: 20, padding: 20 },
  cardTitle: { fontSize: 17, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});
