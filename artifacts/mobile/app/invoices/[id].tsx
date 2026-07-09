import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetInvoice, useUpdateInvoice, useDeleteInvoice, useGetBusinessProfile, getGetInvoicesQueryKey, getGetDashboardStatsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { CardSkeleton } from '@/components/ui/SkeletonLoader';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { generateInvoicePdf } from '@/utils/generateInvoicePdf';

const STATUS_OPTIONS = ['draft', 'sent', 'paid', 'partial', 'cancelled'];

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: invoice, isLoading } = useGetInvoice(invoiceId);
  const { data: business } = useGetBusinessProfile();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const [paidAmount, setPaidAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleStatusChange = (status: string) => {
    updateInvoice.mutate({ id: invoiceId, data: { status } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        Haptics.selectionAsync();
      },
    });
  };

  const handleRecordPayment = () => {
    const amount = Number(paidAmount);
    if (!amount) { Alert.alert('Enter amount'); return; }
    const newPaid = (invoice?.paidAmount ?? 0) + amount;
    const newStatus = newPaid >= (invoice?.grandTotal ?? 0) ? 'paid' : 'partial';
    updateInvoice.mutate({ id: invoiceId, data: { paidAmount: newPaid, status: newStatus } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setPaidAmount('');
        setShowPayment(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  const handleDelete = () => {
    Alert.alert('Delete Invoice', `Delete ${invoice?.invoiceNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteInvoice.mutate({ id: invoiceId }, {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
            router.back();
          },
        });
      }},
    ]);
  };

  const handleShare = async () => {
    if (!invoice) return;
    const text = `Invoice: ${invoice.invoiceNumber}\nCustomer: ${invoice.customerName}\nDate: ${invoice.invoiceDate}\nTotal: ₹${invoice.grandTotal.toLocaleString('en-IN')}\nStatus: ${invoice.status.toUpperCase()}\n\n${business?.shopName ?? ''}\nGST: ${business?.gstNumber ?? 'N/A'}`;
    Share.share({ message: text, title: invoice.invoiceNumber });
  };

  const handleDownloadPdf = async () => {
    if (!invoice || !business) return;
    setPdfLoading(true);
    try {
      const uri = await generateInvoicePdf(invoice, business);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${invoice.invoiceNumber}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF saved', uri);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const topPaddingWeb = Platform.OS === 'web' ? 67 : 0;
  const due = (invoice?.grandTotal ?? 0) - (invoice?.paidAmount ?? 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 8 + topPaddingWeb, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Invoice</Text>
        <View style={styles.navRight}>
          <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
            <Feather name="share-2" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={handleDelete}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}><CardSkeleton /><CardSkeleton /><CardSkeleton /></View>
      ) : invoice ? (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>

          {/* Invoice header */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.invHeader}>
              <View>
                <Text style={[styles.invNumber, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{invoice.invoiceNumber}</Text>
                <Text style={[styles.invDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
              </View>
              <StatusBadge status={invoice.status} />
            </View>
            {business && (
              <View style={[styles.businessInfo, { borderTopColor: colors.border }]}>
                <Text style={[styles.businessName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{business.shopName}</Text>
                {business.gstNumber ? <Text style={[styles.businessDetail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>GST: {business.gstNumber}</Text> : null}
                {business.phone ? <Text style={[styles.businessDetail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{business.phone}</Text> : null}
              </View>
            )}
          </View>

          {/* ── PDF Download button ── */}
          <TouchableOpacity
            style={[styles.pdfBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={handleDownloadPdf}
            disabled={pdfLoading}
            activeOpacity={0.75}
          >
            {pdfLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="download" size={18} color={colors.primary} />
            )}
            <Text style={[styles.pdfBtnText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {pdfLoading ? 'Generating PDF…' : 'Download GST Invoice PDF'}
            </Text>
          </TouchableOpacity>

          {/* Customer */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>BILL TO</Text>
            <Text style={[styles.customerName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{invoice.customerName}</Text>
            {invoice.customerPhone ? <Text style={[styles.customerInfo, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{invoice.customerPhone}</Text> : null}
            {invoice.customerAddress ? <Text style={[styles.customerInfo, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{invoice.customerAddress}</Text> : null}
          </View>

          {/* Items */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>ITEMS</Text>
            {invoice.items.map((item, idx) => (
              <View key={idx} style={[styles.itemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 }]}>
                <Text style={[styles.itemName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{item.productName}</Text>
                <View style={styles.itemDetails}>
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.quantity} × ₹{item.unitPrice} + {item.gstPercent}% GST</Text>
                  <Text style={[styles.itemTotal, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>₹{item.totalAmount.toFixed(2)}</Text>
                </View>
              </View>
            ))}
            <View style={[styles.totalsSection, { borderTopColor: colors.border }]}>
              <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Subtotal</Text><Text style={[styles.totalVal, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>₹{invoice.subtotal.toFixed(2)}</Text></View>
              <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>GST</Text><Text style={[styles.totalVal, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>₹{invoice.taxAmount.toFixed(2)}</Text></View>
              {invoice.discountAmount > 0 && <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Discount</Text><Text style={[styles.totalVal, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>-₹{invoice.discountAmount.toFixed(2)}</Text></View>}
              {invoice.shippingAmount > 0 && <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Shipping</Text><Text style={[styles.totalVal, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>₹{invoice.shippingAmount.toFixed(2)}</Text></View>}
              <View style={[styles.totalRow, styles.grandRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.grandLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Grand Total</Text>
                <Text style={[styles.grandVal, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>₹{invoice.grandTotal.toFixed(2)}</Text>
              </View>
              {invoice.paidAmount > 0 && <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Paid</Text><Text style={[styles.totalVal, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>₹{invoice.paidAmount.toFixed(2)}</Text></View>}
              {due > 0 && <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>Due</Text><Text style={[styles.totalVal, { color: colors.destructive, fontFamily: 'Inter_700Bold' }]}>₹{due.toFixed(2)}</Text></View>}
            </View>
          </View>

          {/* Status actions */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>UPDATE STATUS</Text>
            <View style={styles.statusPills}>
              {STATUS_OPTIONS.map(s => (
                <TouchableOpacity key={s} style={[styles.statusPill, { backgroundColor: invoice.status === s ? colors.primary : colors.muted }]} onPress={() => handleStatusChange(s)}>
                  <Text style={[styles.statusPillText, { color: invoice.status === s ? '#FFF' : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Record payment */}
          {due > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>RECORD PAYMENT</Text>
              {!showPayment ? (
                <PremiumButton label={`Record Payment (₹${due.toFixed(2)} due)`} variant="secondary" onPress={() => setShowPayment(true)} />
              ) : (
                <>
                  <View style={styles.paymentRow}>
                    <View style={styles.flex}>
                      <ThemedInput
                        label="Amount ₹"
                        value={paidAmount}
                        onChangeText={setPaidAmount}
                        keyboardType="numeric"
                        placeholder={String(due.toFixed(2))}
                      />
                    </View>
                    <TouchableOpacity style={styles.fullPayBtn} onPress={() => setPaidAmount(due.toFixed(2))}>
                      <Text style={[styles.fullPayText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Full</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row}>
                    <PremiumButton label="Cancel" variant="ghost" onPress={() => setShowPayment(false)} />
                    <PremiumButton label={updateInvoice.isPending ? 'Saving...' : 'Save Payment'} onPress={handleRecordPayment} loading={updateInvoice.isPending} />
                  </View>
                </>
              )}
            </View>
          )}

          {invoice.notes ? (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>NOTES</Text>
              <Text style={[styles.notes, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{invoice.notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
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
  card: { borderRadius: 20, padding: 18 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 0 },
  pdfBtnText: { fontSize: 15 },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  invNumber: { fontSize: 20, marginBottom: 2 },
  invDate: { fontSize: 13 },
  businessInfo: { borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  businessName: { fontSize: 15, marginBottom: 2 },
  businessDetail: { fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  customerName: { fontSize: 16, marginBottom: 4 },
  customerInfo: { fontSize: 13, marginTop: 2 },
  itemRow: { marginBottom: 4 },
  itemName: { fontSize: 14, marginBottom: 4 },
  itemDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemMeta: { fontSize: 12, flex: 1 },
  itemTotal: { fontSize: 14 },
  totalsSection: { borderTopWidth: 1, paddingTop: 12, marginTop: 12, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13 },
  totalVal: { fontSize: 13 },
  grandRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  grandLabel: { fontSize: 16 },
  grandVal: { fontSize: 20 },
  statusPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  statusPillText: { fontSize: 13 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  fullPayBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  fullPayText: { fontSize: 13 },
  row: { flexDirection: 'row', gap: 12 },
  notes: { fontSize: 14, lineHeight: 20 },
});
