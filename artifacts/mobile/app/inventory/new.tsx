import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateProduct, getGetProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function NewProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const createProduct = useCreateProduct();

  const [form, setForm] = useState({
    name: '',
    sku: '',
    brand: '',
    sellingPrice: '',
    purchasePrice: '',
    gstPercent: '18',
    stockQuantity: '',
    minimumStock: '5',
    unit: 'pcs',
    description: '',
    hsnCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.sellingPrice || isNaN(Number(form.sellingPrice))) e.sellingPrice = 'Valid selling price required';
    if (!form.stockQuantity || isNaN(Number(form.stockQuantity))) e.stockQuantity = 'Valid quantity required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createProduct.mutate({
      data: {
        name: form.name.trim(),
        sku: form.sku || null,
        brand: form.brand || null,
        sellingPrice: Number(form.sellingPrice),
        purchasePrice: Number(form.purchasePrice) || 0,
        gstPercent: Number(form.gstPercent) || 0,
        stockQuantity: Number(form.stockQuantity) || 0,
        minimumStock: Number(form.minimumStock) || 5,
        unit: form.unit || 'pcs',
        description: form.description || null,
        hsnCode: form.hsnCode || null,
        isArchived: false,
      },
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
      onError: () => {
        Alert.alert('Error', 'Failed to create product. Please try again.');
      },
    });
  };

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 8 + topPaddingWeb, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>New Product</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Basic Info</Text>
          <ThemedInput label="Product Name *" value={form.name} onChangeText={set('name')} error={errors.name} placeholder="e.g. Premium Cotton Shirt" autoCapitalize="words" />
          <ThemedInput label="Brand" value={form.brand} onChangeText={set('brand')} placeholder="e.g. Nike" autoCapitalize="words" />
          <ThemedInput label="SKU / Code" value={form.sku} onChangeText={set('sku')} placeholder="e.g. SKU-001" autoCapitalize="characters" />
          <ThemedInput label="Description" value={form.description} onChangeText={set('description')} placeholder="Brief description..." multiline numberOfLines={3} style={{ textAlignVertical: 'top', height: 80 }} />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Pricing</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <ThemedInput label="Selling Price *" value={form.sellingPrice} onChangeText={set('sellingPrice')} error={errors.sellingPrice} keyboardType="numeric" placeholder="0.00" leftIcon={<Text style={{ color: colors.mutedForeground }}>₹</Text>} />
            </View>
            <View style={styles.half}>
              <ThemedInput label="Purchase Price" value={form.purchasePrice} onChangeText={set('purchasePrice')} keyboardType="numeric" placeholder="0.00" leftIcon={<Text style={{ color: colors.mutedForeground }}>₹</Text>} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <ThemedInput label="GST %" value={form.gstPercent} onChangeText={set('gstPercent')} keyboardType="numeric" placeholder="18" />
            </View>
            <View style={styles.half}>
              <ThemedInput label="HSN Code" value={form.hsnCode} onChangeText={set('hsnCode')} placeholder="e.g. 6205" />
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Stock</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <ThemedInput label="Quantity *" value={form.stockQuantity} onChangeText={set('stockQuantity')} error={errors.stockQuantity} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={styles.half}>
              <ThemedInput label="Unit" value={form.unit} onChangeText={set('unit')} placeholder="pcs" />
            </View>
          </View>
          <ThemedInput label="Minimum Stock Alert" value={form.minimumStock} onChangeText={set('minimumStock')} keyboardType="numeric" placeholder="5" />
        </View>

        <PremiumButton
          label={createProduct.isPending ? 'Saving...' : 'Add Product'}
          onPress={handleSubmit}
          loading={createProduct.isPending}
          size="lg"
        />
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
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});
