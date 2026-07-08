import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetProduct, useUpdateProduct, useDeleteProduct, getGetProductsQueryKey, getGetProductQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { CardSkeleton } from '@/components/ui/SkeletonLoader';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: product, isLoading } = useGetProduct(productId);
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [form, setForm] = useState({ name: '', brand: '', sku: '', sellingPrice: '', purchasePrice: '', gstPercent: '', stockQuantity: '', minimumStock: '', unit: '', description: '', hsnCode: '' });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        brand: product.brand ?? '',
        sku: product.sku ?? '',
        sellingPrice: String(product.sellingPrice),
        purchasePrice: String(product.purchasePrice),
        gstPercent: String(product.gstPercent),
        stockQuantity: String(product.stockQuantity),
        minimumStock: String(product.minimumStock),
        unit: product.unit,
        description: product.description ?? '',
        hsnCode: product.hsnCode ?? '',
      });
    }
  }, [product]);

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert('Name required'); return; }
    updateProduct.mutate({
      id: productId,
      data: {
        name: form.name.trim(),
        brand: form.brand || null,
        sku: form.sku || null,
        sellingPrice: Number(form.sellingPrice),
        purchasePrice: Number(form.purchasePrice) || 0,
        gstPercent: Number(form.gstPercent) || 0,
        stockQuantity: Number(form.stockQuantity) || 0,
        minimumStock: Number(form.minimumStock) || 5,
        unit: form.unit || 'pcs',
        description: form.description || null,
        hsnCode: form.hsnCode || null,
      },
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditing(false);
      },
      onError: () => Alert.alert('Error', 'Failed to update product'),
    });
  };

  const handleDelete = () => {
    Alert.alert('Delete Product', `Delete "${product?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteProduct.mutate({ id: productId }, {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
            router.back();
          },
          onError: () => Alert.alert('Error', 'Failed to delete product'),
        });
      }},
    ]);
  };

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;
  const isLowStock = product ? product.stockQuantity <= product.minimumStock : false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 8 + topPaddingWeb, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
          {isLoading ? 'Product' : product?.name ?? 'Product'}
        </Text>
        <View style={styles.navActions}>
          {!editing && (
            <TouchableOpacity style={styles.navBtn} onPress={() => setEditing(true)}>
              <Feather name="edit-2" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.navBtn} onPress={handleDelete}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}><CardSkeleton /><CardSkeleton /></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Stock indicator */}
          {isLowStock && (
            <View style={[styles.lowStockBanner, { backgroundColor: `${colors.warning}22` }]}>
              <Feather name="alert-triangle" size={16} color={colors.warning} />
              <Text style={[styles.lowStockText, { color: colors.warning, fontFamily: 'Inter_500Medium' }]}>
                Low stock: {product?.stockQuantity} {product?.unit} remaining
              </Text>
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Basic Info</Text>
            <ThemedInput label="Product Name" value={form.name} onChangeText={set('name')} editable={editing} />
            <ThemedInput label="Brand" value={form.brand} onChangeText={set('brand')} editable={editing} />
            <ThemedInput label="SKU" value={form.sku} onChangeText={set('sku')} editable={editing} />
            <ThemedInput label="Description" value={form.description} onChangeText={set('description')} editable={editing} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Pricing</Text>
            <View style={styles.row}>
              <View style={styles.half}><ThemedInput label="Selling Price" value={form.sellingPrice} onChangeText={set('sellingPrice')} keyboardType="numeric" editable={editing} /></View>
              <View style={styles.half}><ThemedInput label="Purchase Price" value={form.purchasePrice} onChangeText={set('purchasePrice')} keyboardType="numeric" editable={editing} /></View>
            </View>
            <View style={styles.row}>
              <View style={styles.half}><ThemedInput label="GST %" value={form.gstPercent} onChangeText={set('gstPercent')} keyboardType="numeric" editable={editing} /></View>
              <View style={styles.half}><ThemedInput label="HSN Code" value={form.hsnCode} onChangeText={set('hsnCode')} editable={editing} /></View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Stock</Text>
            <View style={styles.row}>
              <View style={styles.half}><ThemedInput label="Quantity" value={form.stockQuantity} onChangeText={set('stockQuantity')} keyboardType="numeric" editable={editing} /></View>
              <View style={styles.half}><ThemedInput label="Unit" value={form.unit} onChangeText={set('unit')} editable={editing} /></View>
            </View>
            <ThemedInput label="Minimum Stock Alert" value={form.minimumStock} onChangeText={set('minimumStock')} keyboardType="numeric" editable={editing} />
          </View>

          {editing && (
            <View style={styles.editActions}>
              <PremiumButton label="Cancel" variant="ghost" onPress={() => setEditing(false)} size="md" />
              <PremiumButton label={updateProduct.isPending ? 'Saving...' : 'Save Changes'} onPress={handleSave} loading={updateProduct.isPending} size="md" />
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, flex: 1, textAlign: 'center' },
  navActions: { flexDirection: 'row', gap: 4 },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  section: { borderRadius: 20, padding: 20 },
  sectionTitle: { fontSize: 16, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  lowStockBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, marginBottom: 4 },
  lowStockText: { fontSize: 13, flex: 1 },
  editActions: { flexDirection: 'row', gap: 12 },
});
