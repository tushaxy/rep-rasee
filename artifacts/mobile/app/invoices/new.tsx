import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, Modal, Platform } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateInvoice, useGetCustomers, useGetProducts, getGetInvoicesQueryKey, getGetDashboardStatsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type LineItem = { productId?: number | null; productName: string; quantity: number; unitPrice: number; discountPercent: number; gstPercent: number };

export default function NewInvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const createInvoice = useCreateInvoice();

  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string; phone?: string | null; address?: string | null } | null>(null);
  const [manualCustomer, setManualCustomer] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [shipping, setShipping] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [invoiceDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: customers } = useGetCustomers({ search: customerSearch || undefined });
  const { data: products } = useGetProducts({ search: productSearch || undefined });

  const addProduct = (p: { id: number; name: string; sellingPrice: number; gstPercent: number }) => {
    const existing = lineItems.findIndex(i => i.productId === p.id);
    if (existing >= 0) {
      setLineItems(items => items.map((item, idx) => idx === existing ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setLineItems(items => [...items, { productId: p.id, productName: p.name, quantity: 1, unitPrice: p.sellingPrice, discountPercent: 0, gstPercent: p.gstPercent }]);
    }
    Haptics.selectionAsync();
  };

  const removeItem = (idx: number) => setLineItems(items => items.filter((_, i) => i !== idx));
  const updateQty = (idx: number, qty: string) => setLineItems(items => items.map((item, i) => i === idx ? { ...item, quantity: Number(qty) || 1 } : item));
  const updatePrice = (idx: number, price: string) => setLineItems(items => items.map((item, i) => i === idx ? { ...item, unitPrice: Number(price) || 0 } : item));

  const calcTotals = () => {
    let subtotal = 0, tax = 0;
    lineItems.forEach(item => {
      const base = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
      subtotal += base;
      tax += base * (item.gstPercent / 100);
    });
    const grand = subtotal + tax - Number(discount) + Number(shipping);
    return { subtotal, tax, grand };
  };

  const { subtotal, tax, grand } = calcTotals();

  const handleSubmit = () => {
    const customerName = selectedCustomer?.name || manualCustomer;
    if (!customerName.trim()) { Alert.alert('Error', 'Please select or enter a customer'); return; }
    if (lineItems.length === 0) { Alert.alert('Error', 'Add at least one product'); return; }

    createInvoice.mutate({
      data: {
        customerId: selectedCustomer?.id ?? null,
        customerName,
        customerPhone: selectedCustomer?.phone ?? null,
        customerAddress: selectedCustomer?.address ?? null,
        invoiceDate,
        status: Number(paidAmount) >= grand ? 'paid' : Number(paidAmount) > 0 ? 'partial' : 'sent',
        discountAmount: Number(discount) || 0,
        shippingAmount: Number(shipping) || 0,
        paidAmount: Number(paidAmount) || 0,
        paymentMode: paymentMode || null,
        notes: notes || null,
        items: lineItems,
      },
    }, {
      onSuccess: (inv) => {
        qc.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/invoices/${inv.id}`);
      },
      onError: () => Alert.alert('Error', 'Failed to create invoice'),
    });
  };

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 8 + topPaddingWeb, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>New Invoice</Text>
          <Text style={[styles.stepLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Step {step} of 3</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.steps}>
        {[1, 2, 3].map(s => (
          <View key={s} style={[styles.stepDot, { backgroundColor: s <= step ? colors.primary : colors.border }]} />
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* STEP 1: Customer */}
        {step === 1 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Select Customer</Text>
            <ThemedInput placeholder="Search customers..." value={customerSearch} onChangeText={setCustomerSearch} leftIcon={<Feather name="search" size={16} color={colors.mutedForeground} />} />
            {selectedCustomer ? (
              <View style={[styles.selectedCustomer, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}>
                <View style={styles.flex}>
                  <Text style={[styles.selectedName, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{selectedCustomer.name}</Text>
                  {selectedCustomer.phone ? <Text style={[styles.selectedPhone, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{selectedCustomer.phone}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                  <Feather name="x" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {customers?.slice(0, 5).map(c => (
                  <TouchableOpacity key={c.id} style={[styles.customerItem, { backgroundColor: colors.card }]} onPress={() => { setSelectedCustomer(c); setCustomerSearch(''); Haptics.selectionAsync(); }}>
                    <Feather name="user" size={16} color={colors.primary} />
                    <View style={styles.flex}>
                      <Text style={[styles.customerItemName, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{c.name}</Text>
                      {c.phone ? <Text style={[styles.customerItemPhone, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{c.phone}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))}
                <Text style={[styles.orText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>— or enter manually —</Text>
                <ThemedInput label="Customer Name" placeholder="Walk-in customer" value={manualCustomer} onChangeText={setManualCustomer} />
              </>
            )}
            <PremiumButton label="Continue" onPress={() => { const n = selectedCustomer?.name || manualCustomer; if (!n.trim()) { Alert.alert('Enter customer'); return; } setStep(2); }} size="lg" />
          </>
        )}

        {/* STEP 2: Products */}
        {step === 2 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Add Products</Text>
            <TouchableOpacity style={[styles.addProductBtn, { backgroundColor: colors.primary }]} onPress={() => setShowProductPicker(true)}>
              <Feather name="plus" size={18} color="#FFF" />
              <Text style={[styles.addProductLabel, { fontFamily: 'Inter_600SemiBold', color: '#FFF' }]}>Add Product</Text>
            </TouchableOpacity>

            {lineItems.map((item, idx) => (
              <View key={idx} style={[styles.lineItem, { backgroundColor: colors.card }]}>
                <View style={styles.lineItemHeader}>
                  <Text style={[styles.lineItemName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{item.productName}</Text>
                  <TouchableOpacity onPress={() => removeItem(idx)}><Feather name="x" size={16} color={colors.destructive} /></TouchableOpacity>
                </View>
                <View style={styles.lineItemRow}>
                  <View style={styles.lineItemField}>
                    <Text style={[styles.lineItemLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Qty</Text>
                    <ThemedInput value={String(item.quantity)} onChangeText={v => updateQty(idx, v)} keyboardType="numeric" style={{ marginBottom: 0, textAlign: 'center' }} />
                  </View>
                  <View style={styles.lineItemField}>
                    <Text style={[styles.lineItemLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Price ₹</Text>
                    <ThemedInput value={String(item.unitPrice)} onChangeText={v => updatePrice(idx, v)} keyboardType="numeric" style={{ marginBottom: 0 }} />
                  </View>
                  <View style={styles.lineItemField}>
                    <Text style={[styles.lineItemLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>GST %</Text>
                    <ThemedInput value={String(item.gstPercent)} onChangeText={v => setLineItems(items => items.map((it, i) => i === idx ? { ...it, gstPercent: Number(v) || 0 } : it))} keyboardType="numeric" style={{ marginBottom: 0 }} />
                  </View>
                </View>
                <Text style={[styles.lineTotal, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                  ₹{(item.quantity * item.unitPrice * (1 + item.gstPercent / 100)).toFixed(2)}
                </Text>
              </View>
            ))}

            {lineItems.length > 0 && (
              <View style={[styles.totalsCard, { backgroundColor: colors.card }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Subtotal</Text>
                  <Text style={[styles.totalValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>₹{subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>GST</Text>
                  <Text style={[styles.totalValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>₹{tax.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, styles.grandRow]}>
                  <Text style={[styles.grandLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Grand Total</Text>
                  <Text style={[styles.grandValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>₹{grand.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <PremiumButton label={lineItems.length === 0 ? 'Add at least one product' : 'Continue'} onPress={() => { if (lineItems.length === 0) { Alert.alert('Add products'); return; } setStep(3); }} disabled={lineItems.length === 0} size="lg" />
          </>
        )}

        {/* STEP 3: Payment */}
        {step === 3 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Payment Details</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Customer</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{selectedCustomer?.name || manualCustomer}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginTop: 8 }]}>Grand Total</Text>
              <Text style={[styles.summaryGrand, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>₹{grand.toFixed(2)}</Text>
            </View>
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.row}>
                <View style={styles.half}><ThemedInput label="Discount ₹" value={discount} onChangeText={setDiscount} keyboardType="numeric" /></View>
                <View style={styles.half}><ThemedInput label="Shipping ₹" value={shipping} onChangeText={setShipping} keyboardType="numeric" /></View>
              </View>
              <ThemedInput label={`Paid Amount ₹ (Total: ₹${grand.toFixed(2)})`} value={paidAmount} onChangeText={setPaidAmount} keyboardType="numeric" />
              <Text style={[styles.payLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Payment Mode</Text>
              <View style={styles.payModes}>
                {['cash', 'upi', 'bank', 'cheque', 'credit'].map(m => (
                  <TouchableOpacity key={m} style={[styles.payMode, { backgroundColor: paymentMode === m ? colors.primary : colors.muted }]} onPress={() => setPaymentMode(m)}>
                    <Text style={[styles.payModeText, { color: paymentMode === m ? '#FFF' : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ThemedInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Any payment or delivery notes..." multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
            </View>
            <PremiumButton label={createInvoice.isPending ? 'Creating...' : 'Create Invoice'} onPress={handleSubmit} loading={createInvoice.isPending} size="lg" />
          </>
        )}
      </ScrollView>

      {/* Product picker modal */}
      <Modal visible={showProductPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <ThemedInput placeholder="Search products..." value={productSearch} onChangeText={setProductSearch} leftIcon={<Feather name="search" size={16} color={colors.mutedForeground} />} />
          </View>
          <FlatList
            data={products ?? []}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.productItem, { borderBottomColor: colors.border }]} onPress={() => { addProduct(item); setShowProductPicker(false); setProductSearch(''); }}>
                <View style={styles.flex}>
                  <Text style={[styles.productItemName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{item.name}</Text>
                  <Text style={[styles.productItemStock, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.stockQuantity} {item.unit} in stock</Text>
                </View>
                <Text style={[styles.productItemPrice, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>₹{item.sellingPrice}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, textAlign: 'center' },
  stepLabel: { fontSize: 11, textAlign: 'center' },
  steps: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  stepTitle: { fontSize: 20, marginBottom: 4 },
  selectedCustomer: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1.5, marginBottom: 16 },
  flex: { flex: 1 },
  selectedName: { fontSize: 15 },
  selectedPhone: { fontSize: 12, marginTop: 2 },
  customerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, marginBottom: 8 },
  customerItemName: { fontSize: 14 },
  customerItemPhone: { fontSize: 12 },
  orText: { textAlign: 'center', fontSize: 13, marginVertical: 12 },
  addProductBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 14, marginBottom: 4 },
  addProductLabel: { fontSize: 15 },
  lineItem: { borderRadius: 14, padding: 14, marginBottom: 8 },
  lineItemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  lineItemName: { flex: 1, fontSize: 14 },
  lineItemRow: { flexDirection: 'row', gap: 8 },
  lineItemField: { flex: 1 },
  lineItemLabel: { fontSize: 11, marginBottom: 4 },
  lineTotal: { fontSize: 15, textAlign: 'right', marginTop: 4 },
  totalsCard: { borderRadius: 16, padding: 16, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 13 },
  grandRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  grandLabel: { fontSize: 15 },
  grandValue: { fontSize: 18 },
  summaryCard: { borderRadius: 16, padding: 16, marginBottom: 8 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 16, marginTop: 2 },
  summaryGrand: { fontSize: 28, marginTop: 2 },
  section: { borderRadius: 16, padding: 16 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  payLabel: { fontSize: 13, marginBottom: 10 },
  payModes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  payMode: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  payModeText: { fontSize: 12 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  productItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  productItemName: { fontSize: 14 },
  productItemStock: { fontSize: 12, marginTop: 2 },
  productItemPrice: { fontSize: 15 },
});
