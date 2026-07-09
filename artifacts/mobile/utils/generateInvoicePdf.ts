/** Builds a professional GST-compliant HTML invoice and returns the PDF URI. */

import * as Print from 'expo-print';

export type InvoiceForPdf = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  status: string;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
  paidAmount: number;
  paymentMode?: string | null;
  notes?: string | null;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    gstPercent: number;
    totalAmount: number;
  }>;
};

export type BusinessForPdf = {
  shopName: string;
  ownerName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  termsAndConditions?: string | null;
  invoiceNotes?: string | null;
};

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusLabel(s: string) {
  const map: Record<string, { bg: string; color: string }> = {
    paid: { bg: '#D1FAE5', color: '#065F46' },
    partial: { bg: '#FEF3C7', color: '#92400E' },
    sent: { bg: '#DBEAFE', color: '#1E40AF' },
    draft: { bg: '#F1F5F9', color: '#475569' },
    cancelled: { bg: '#FEE2E2', color: '#991B1B' },
    overdue: { bg: '#FFE4E6', color: '#9F1239' },
  };
  return map[s] ?? { bg: '#F1F5F9', color: '#475569' };
}

function buildItemsRows(inv: InvoiceForPdf) {
  return inv.items.map((item, i) => {
    const gstHalf = item.gstPercent / 2;
    const base = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
    const gstAmt = base * (item.gstPercent / 100);
    const sgst = gstAmt / 2;
    return `
      <tr class="${i % 2 === 1 ? 'alt' : ''}">
        <td>${i + 1}</td>
        <td class="left"><strong>${item.productName}</strong></td>
        <td>${item.quantity}</td>
        <td>₹${fmt(item.unitPrice)}</td>
        <td>${item.discountPercent > 0 ? item.discountPercent + '%' : '—'}</td>
        <td>${gstHalf > 0 ? gstHalf + '%' : '—'}</td>
        <td>${gstHalf > 0 ? gstHalf + '%' : '—'}</td>
        <td class="right"><strong>₹${fmt(item.totalAmount)}</strong></td>
      </tr>`;
  }).join('');
}

export async function generateInvoicePdf(inv: InvoiceForPdf, biz: BusinessForPdf): Promise<string> {
  const st = statusLabel(inv.status);
  const due = inv.grandTotal - inv.paidAmount;
  const dateStr = new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const dueDateStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${inv.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111827; background: #fff; font-size: 13px; line-height: 1.5; }

  .page { max-width: 800px; margin: 0 auto; padding: 40px; }

  /* ── Header ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #4F46E5; }
  .biz-name { font-size: 22px; font-weight: 800; color: #1E1B4B; letter-spacing: -0.5px; }
  .biz-meta { font-size: 11px; color: #6B7280; margin-top: 4px; line-height: 1.8; }
  .inv-block { text-align: right; }
  .inv-title { font-size: 28px; font-weight: 900; color: #4F46E5; letter-spacing: -1px; text-transform: uppercase; }
  .inv-number { font-size: 13px; font-weight: 600; color: #374151; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${st.bg}; color: ${st.color}; margin-top: 6px; }

  /* ── Meta row ── */
  .meta-row { display: flex; gap: 12px; margin-bottom: 28px; }
  .meta-box { flex: 1; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px; }
  .meta-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
  .meta-value { font-size: 13px; font-weight: 600; color: #111827; }
  .meta-sub { font-size: 11px; color: #6B7280; margin-top: 2px; }

  /* ── Party boxes ── */
  .parties { display: flex; gap: 20px; margin-bottom: 28px; }
  .party { flex: 1; border-radius: 10px; padding: 16px; }
  .from-box { background: linear-gradient(135deg, #EEF2FF, #E0E7FF); border: 1px solid #C7D2FE; }
  .to-box { background: #F9FAFB; border: 1px solid #E5E7EB; }
  .party-label { font-size: 10px; font-weight: 800; color: #4F46E5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .party-name { font-size: 15px; font-weight: 800; color: #111827; margin-bottom: 4px; }
  .party-detail { font-size: 11px; color: #6B7280; line-height: 1.7; }
  .gst-badge { display: inline-block; background: #4F46E5; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-top: 6px; letter-spacing: 0.4px; }

  /* ── Items table ── */
  .table-wrap { margin-bottom: 24px; border-radius: 10px; overflow: hidden; border: 1px solid #E5E7EB; }
  table { width: 100%; border-collapse: collapse; }
  thead { background: #1E1B4B; }
  thead th { color: #E0E7FF; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; padding: 10px 10px; text-align: center; }
  thead th.left { text-align: left; }
  tbody td { padding: 9px 10px; text-align: center; color: #374151; font-size: 12px; border-bottom: 1px solid #F3F4F6; }
  tbody td.left { text-align: left; }
  tbody td.right { text-align: right; }
  tbody tr.alt { background: #F9FAFB; }
  tbody tr:last-child td { border-bottom: none; }

  /* ── Totals ── */
  .bottom { display: flex; gap: 24px; margin-bottom: 28px; }
  .tax-summary { flex: 1; }
  .tax-table { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; border: 1px solid #E5E7EB; font-size: 12px; }
  .tax-table thead th { background: #F3F4F6; color: #374151; font-weight: 700; font-size: 10px; text-transform: uppercase; padding: 8px 12px; text-align: center; border-bottom: 1px solid #E5E7EB; }
  .tax-table tbody td { padding: 7px 12px; text-align: center; border-bottom: 1px solid #F3F4F6; color: #374151; }
  .tax-table tbody tr:last-child td { border-bottom: none; }
  .totals-box { width: 240px; flex-shrink: 0; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; color: #6B7280; border-bottom: 1px solid #F3F4F6; }
  .total-row:last-child { border-bottom: none; }
  .total-row .val { font-weight: 600; color: #111827; }
  .grand-row { background: #4F46E5; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .grand-label { color: #C7D2FE; font-size: 12px; font-weight: 600; }
  .grand-val { color: #fff; font-size: 18px; font-weight: 900; }
  .paid-row { background: #D1FAE5; border-radius: 8px; padding: 7px 14px; display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
  .paid-label { color: #065F46; font-size: 11px; font-weight: 600; }
  .paid-val { color: #065F46; font-size: 13px; font-weight: 800; }
  .due-row { background: #FEE2E2; border-radius: 8px; padding: 7px 14px; display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
  .due-label { color: #991B1B; font-size: 11px; font-weight: 600; }
  .due-val { color: #991B1B; font-size: 13px; font-weight: 800; }

  /* ── Bank / Notes / Terms ── */
  .footer-grid { display: flex; gap: 20px; margin-bottom: 24px; }
  .footer-box { flex: 1; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px; }
  .footer-title { font-size: 10px; font-weight: 800; color: #4F46E5; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; }
  .footer-text { font-size: 11px; color: #374151; line-height: 1.8; }

  /* ── Signature / Seal ── */
  .seal-row { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #E5E7EB; }
  .seal-box { text-align: center; width: 180px; }
  .seal-line { border-top: 1px solid #9CA3AF; margin-top: 48px; margin-bottom: 6px; }
  .seal-label { font-size: 10px; color: #6B7280; }

  /* ── Bottom strip ── */
  .strip { background: #1E1B4B; border-radius: 10px; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .strip-text { color: #C7D2FE; font-size: 10px; }
  .strip-brand { color: #818CF8; font-size: 11px; font-weight: 700; }
</style>
</head>
<body>
<div class="page">

  <!-- ── Header ── -->
  <div class="header">
    <div>
      <div class="biz-name">${biz.shopName}</div>
      <div class="biz-meta">
        ${biz.address ? biz.address + '<br/>' : ''}
        ${[biz.city, biz.state, biz.pincode].filter(Boolean).join(', ')}${(biz.city || biz.state) ? '<br/>' : ''}
        ${biz.phone}${biz.email ? ' · ' + biz.email : ''}
        ${biz.gstNumber ? '<br/>GSTIN: ' + biz.gstNumber : ''}
        ${biz.panNumber ? ' · PAN: ' + biz.panNumber : ''}
      </div>
    </div>
    <div class="inv-block">
      <div class="inv-title">Tax Invoice</div>
      <div class="inv-number">${inv.invoiceNumber}</div>
      <div><span class="status-badge">${inv.status.toUpperCase()}</span></div>
    </div>
  </div>

  <!-- ── Meta row ── -->
  <div class="meta-row">
    <div class="meta-box">
      <div class="meta-label">Invoice Date</div>
      <div class="meta-value">${dateStr}</div>
    </div>
    ${dueDateStr ? `<div class="meta-box">
      <div class="meta-label">Due Date</div>
      <div class="meta-value">${dueDateStr}</div>
    </div>` : ''}
    ${inv.paymentMode ? `<div class="meta-box">
      <div class="meta-label">Payment Mode</div>
      <div class="meta-value">${inv.paymentMode.charAt(0).toUpperCase() + inv.paymentMode.slice(1)}</div>
    </div>` : ''}
    <div class="meta-box">
      <div class="meta-label">Amount Due</div>
      <div class="meta-value" style="color:${due > 0 ? '#DC2626' : '#059669'}">₹${fmt(due > 0 ? due : 0)}</div>
      <div class="meta-sub">${due <= 0 ? '✓ Fully Paid' : 'Pending'}</div>
    </div>
  </div>

  <!-- ── Parties ── -->
  <div class="parties">
    <div class="party from-box">
      <div class="party-label">From</div>
      <div class="party-name">${biz.shopName}</div>
      <div class="party-detail">
        ${biz.ownerName}<br/>
        ${biz.phone}${biz.email ? '<br/>' + biz.email : ''}
        ${biz.address ? '<br/>' + biz.address : ''}
        ${[biz.city, biz.state, biz.pincode].filter(Boolean).length ? '<br/>' + [biz.city, biz.state, biz.pincode].filter(Boolean).join(', ') : ''}
      </div>
      ${biz.gstNumber ? `<div class="gst-badge">GSTIN: ${biz.gstNumber}</div>` : ''}
    </div>
    <div class="party to-box">
      <div class="party-label">Bill To</div>
      <div class="party-name">${inv.customerName}</div>
      <div class="party-detail">
        ${inv.customerPhone ? inv.customerPhone : ''}
        ${inv.customerAddress ? '<br/>' + inv.customerAddress : ''}
      </div>
    </div>
  </div>

  <!-- ── Items table ── -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th class="left">Item / Description</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Disc %</th>
          <th>SGST</th>
          <th>CGST</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${buildItemsRows(inv)}
      </tbody>
    </table>
  </div>

  <!-- ── Totals + Tax summary ── -->
  <div class="bottom">
    <!-- Tax summary table -->
    <div class="tax-summary">
      <table class="tax-table">
        <thead>
          <tr>
            <th>GST Rate</th>
            <th>Taxable Amt</th>
            <th>SGST</th>
            <th>CGST</th>
            <th>Total GST</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            const gstGroups: Record<number, { taxable: number; gst: number }> = {};
            for (const item of inv.items) {
              const base = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
              const gst = base * (item.gstPercent / 100);
              if (!gstGroups[item.gstPercent]) gstGroups[item.gstPercent] = { taxable: 0, gst: 0 };
              gstGroups[item.gstPercent].taxable += base;
              gstGroups[item.gstPercent].gst += gst;
            }
            return Object.entries(gstGroups).map(([rate, vals]) =>
              `<tr>
                <td>${rate}%</td>
                <td>₹${fmt(vals.taxable)}</td>
                <td>₹${fmt(vals.gst / 2)}</td>
                <td>₹${fmt(vals.gst / 2)}</td>
                <td><strong>₹${fmt(vals.gst)}</strong></td>
              </tr>`
            ).join('');
          })()}
        </tbody>
      </table>
    </div>

    <!-- Totals box -->
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span class="val">₹${fmt(inv.subtotal)}</span></div>
      ${inv.discountAmount > 0 ? `<div class="total-row"><span>Discount</span><span class="val" style="color:#059669">-₹${fmt(inv.discountAmount)}</span></div>` : ''}
      <div class="total-row"><span>GST</span><span class="val">₹${fmt(inv.taxAmount)}</span></div>
      ${inv.shippingAmount > 0 ? `<div class="total-row"><span>Shipping</span><span class="val">₹${fmt(inv.shippingAmount)}</span></div>` : ''}
      <div class="grand-row"><span class="grand-label">Grand Total</span><span class="grand-val">₹${fmt(inv.grandTotal)}</span></div>
      ${inv.paidAmount > 0 ? `<div class="paid-row"><span class="paid-label">Paid</span><span class="paid-val">₹${fmt(inv.paidAmount)}</span></div>` : ''}
      ${due > 0 ? `<div class="due-row"><span class="due-label">Balance Due</span><span class="due-val">₹${fmt(due)}</span></div>` : ''}
    </div>
  </div>

  <!-- ── Footer grid ── -->
  <div class="footer-grid">
    ${(biz.bankName || biz.accountNumber || biz.upiId) ? `
    <div class="footer-box">
      <div class="footer-title">Bank Details</div>
      <div class="footer-text">
        ${biz.bankName ? 'Bank: ' + biz.bankName + '<br/>' : ''}
        ${biz.accountNumber ? 'A/C: ' + biz.accountNumber + '<br/>' : ''}
        ${biz.ifscCode ? 'IFSC: ' + biz.ifscCode + '<br/>' : ''}
        ${biz.upiId ? 'UPI: ' + biz.upiId : ''}
      </div>
    </div>` : ''}
    ${(inv.notes || biz.invoiceNotes) ? `
    <div class="footer-box">
      <div class="footer-title">Notes</div>
      <div class="footer-text">${inv.notes || biz.invoiceNotes}</div>
    </div>` : ''}
    ${biz.termsAndConditions ? `
    <div class="footer-box">
      <div class="footer-title">Terms & Conditions</div>
      <div class="footer-text">${biz.termsAndConditions}</div>
    </div>` : ''}
  </div>

  <!-- ── Seal ── -->
  <div class="seal-row">
    <div class="seal-box">
      <div class="seal-line"></div>
      <div class="seal-label">Authorised Signatory for<br/><strong>${biz.shopName}</strong></div>
    </div>
  </div>

  <!-- ── Bottom strip ── -->
  <div class="strip">
    <span class="strip-text">This is a computer-generated invoice. No physical signature required.</span>
    <span class="strip-brand">BizInvoice</span>
  </div>

</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}
