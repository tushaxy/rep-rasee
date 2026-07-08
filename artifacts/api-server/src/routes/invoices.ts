import { Router, type IRouter } from "express";
import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { invoicesTable, invoiceItemsTable, productsTable } from "@workspace/db";
import {
  CreateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  DeleteInvoiceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatInvoice(
  invoice: typeof invoicesTable.$inferSelect,
  items: typeof invoiceItemsTable.$inferSelect[]
) {
  return {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    discountAmount: Number(invoice.discountAmount),
    taxAmount: Number(invoice.taxAmount),
    shippingAmount: Number(invoice.shippingAmount),
    grandTotal: Number(invoice.grandTotal),
    paidAmount: Number(invoice.paidAmount),
    items: items.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountPercent),
      gstPercent: Number(item.gstPercent),
      totalAmount: Number(item.totalAmount),
    })),
  };
}

type LineItem = {
  productId?: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  gstPercent: number;
};

function calculateTotals(
  items: LineItem[],
  discountAmount: number,
  shippingAmount: number
) {
  let subtotal = 0;
  let taxAmount = 0;
  const processedItems = items.map(item => {
    const base = item.quantity * item.unitPrice;
    const afterDiscount = base * (1 - item.discountPercent / 100);
    const tax = afterDiscount * (item.gstPercent / 100);
    const total = afterDiscount + tax;
    subtotal += afterDiscount;
    taxAmount += tax;
    return { ...item, totalAmount: parseFloat(total.toFixed(2)) };
  });
  const grandTotal = subtotal + taxAmount - discountAmount + shippingAmount;
  return {
    processedItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  };
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.$count(invoicesTable);
  const num = String(count + 1).padStart(6, "0");
  return `INV-${year}-${num}`;
}

router.get("/invoices", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const customerIdRaw = typeof req.query.customerId === "string" ? parseInt(req.query.customerId, 10) : undefined;

  const conditions = [];
  if (status) conditions.push(eq(invoicesTable.status, status));
  if (customerIdRaw != null && !isNaN(customerIdRaw)) conditions.push(eq(invoicesTable.customerId, customerIdRaw));
  if (search) {
    conditions.push(
      sql`(${invoicesTable.invoiceNumber} ILIKE ${`%${search}%`} OR ${invoicesTable.customerName} ILIKE ${`%${search}%`})`
    );
  }

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(invoicesTable.createdAt));

  const result = await Promise.all(
    invoices.map(async inv => {
      const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, inv.id));
      return formatInvoice(inv, items);
    })
  );

  res.json(result);
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const invoiceNumber = await generateInvoiceNumber();
  const lineItems: LineItem[] = parsed.data.items.map(i => ({
    productId: i.productId ?? null,
    productName: i.productName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    discountPercent: i.discountPercent,
    gstPercent: i.gstPercent,
  }));

  const { processedItems, subtotal, taxAmount, grandTotal } = calculateTotals(
    lineItems,
    parsed.data.discountAmount ?? 0,
    parsed.data.shippingAmount ?? 0
  );

  // Wrap everything in a transaction for atomic invoice + stock update
  const { invoice, insertedItems } = await db.transaction(async (tx) => {
    const [invoice] = await tx
      .insert(invoicesTable)
      .values({
        invoiceNumber,
        customerId: parsed.data.customerId ?? null,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone ?? null,
        customerAddress: parsed.data.customerAddress ?? null,
        invoiceDate: parsed.data.invoiceDate,
        dueDate: parsed.data.dueDate ?? null,
        status: parsed.data.status,
        subtotal: subtotal.toString(),
        discountAmount: (parsed.data.discountAmount ?? 0).toString(),
        taxAmount: taxAmount.toString(),
        shippingAmount: (parsed.data.shippingAmount ?? 0).toString(),
        grandTotal: grandTotal.toString(),
        paidAmount: (parsed.data.paidAmount ?? 0).toString(),
        paymentMode: parsed.data.paymentMode ?? null,
        notes: parsed.data.notes ?? null,
      })
      .returning();

    const insertedItems = (await Promise.all(
      processedItems.map(item =>
        tx.insert(invoiceItemsTable).values({
          invoiceId: invoice.id,
          productId: item.productId ?? null,
          productName: item.productName,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          discountPercent: item.discountPercent.toString(),
          gstPercent: item.gstPercent.toString(),
          totalAmount: item.totalAmount.toString(),
        }).returning()
      )
    )).flat();

    // Deduct stock atomically (never go below 0)
    for (const item of processedItems) {
      if (item.productId != null) {
        await tx
          .update(productsTable)
          .set({ stockQuantity: sql`greatest(0, ${productsTable.stockQuantity} - ${Math.floor(item.quantity)})` })
          .where(eq(productsTable.id, item.productId));
      }
    }

    return { invoice, insertedItems };
  });

  res.status(201).json(formatInvoice(invoice, insertedItems));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoice.id));
  res.json(formatInvoice(invoice, items));
});

router.put("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const invoiceId = params.data.id;
  const d = parsed.data;

  const { invoice, items: finalItems } = await db.transaction(async (tx) => {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (d.customerName != null) updateData.customerName = d.customerName;
    if (d.customerId !== undefined) updateData.customerId = d.customerId;
    if (d.customerPhone !== undefined) updateData.customerPhone = d.customerPhone;
    if (d.customerAddress !== undefined) updateData.customerAddress = d.customerAddress;
    if (d.invoiceDate != null) updateData.invoiceDate = d.invoiceDate;
    if (d.dueDate !== undefined) updateData.dueDate = d.dueDate;
    if (d.status != null) updateData.status = d.status;
    if (d.paymentMode !== undefined) updateData.paymentMode = d.paymentMode;
    if (d.notes !== undefined) updateData.notes = d.notes;
    if (d.paidAmount != null) updateData.paidAmount = d.paidAmount.toString();

    // Always recalculate totals when items, discount, or shipping change
    const needsTotalRecalc = d.items != null || d.discountAmount != null || d.shippingAmount != null;

    if (needsTotalRecalc) {
      // Get current items if not replacing them
      let lineItems: LineItem[];
      if (d.items && d.items.length > 0) {
        lineItems = d.items.map(i => ({
          productId: i.productId ?? null,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
          gstPercent: i.gstPercent,
        }));
        // Replace items
        await tx.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId));
        await Promise.all(
          lineItems.map(item =>
            tx.insert(invoiceItemsTable).values({
              invoiceId,
              productId: item.productId ?? null,
              productName: item.productName,
              quantity: item.quantity.toString(),
              unitPrice: item.unitPrice.toString(),
              discountPercent: item.discountPercent.toString(),
              gstPercent: item.gstPercent.toString(),
              totalAmount: "0", // recalculated below
            })
          )
        );
      } else {
        // Load existing items to recalculate totals
        const existingItems = await tx.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId));
        lineItems = existingItems.map(i => ({
          productId: i.productId,
          productName: i.productName,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discountPercent: Number(i.discountPercent),
          gstPercent: Number(i.gstPercent),
        }));
      }

      // Fetch current invoice for current discount/shipping fallback
      const [currentInvoice] = await tx.select({ discountAmount: invoicesTable.discountAmount, shippingAmount: invoicesTable.shippingAmount })
        .from(invoicesTable).where(eq(invoicesTable.id, invoiceId));

      const effectiveDiscount = d.discountAmount ?? Number(currentInvoice?.discountAmount ?? 0);
      const effectiveShipping = d.shippingAmount ?? Number(currentInvoice?.shippingAmount ?? 0);

      const { processedItems, subtotal, taxAmount, grandTotal } = calculateTotals(lineItems, effectiveDiscount, effectiveShipping);

      updateData.subtotal = subtotal.toString();
      updateData.taxAmount = taxAmount.toString();
      updateData.grandTotal = grandTotal.toString();
      updateData.discountAmount = effectiveDiscount.toString();
      updateData.shippingAmount = effectiveShipping.toString();

      // Update per-item totals if items were replaced
      if (d.items && d.items.length > 0) {
        await tx.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId));
        await Promise.all(
          processedItems.map(item =>
            tx.insert(invoiceItemsTable).values({
              invoiceId,
              productId: item.productId ?? null,
              productName: item.productName,
              quantity: item.quantity.toString(),
              unitPrice: item.unitPrice.toString(),
              discountPercent: item.discountPercent.toString(),
              gstPercent: item.gstPercent.toString(),
              totalAmount: item.totalAmount.toString(),
            })
          )
        );
      }
    }

    const [invoice] = await tx
      .update(invoicesTable)
      .set(updateData)
      .where(eq(invoicesTable.id, invoiceId))
      .returning();

    if (!invoice) throw new Error("Invoice not found");

    const items = await tx.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId));
    return { invoice, items };
  });

  res.json(formatInvoice(invoice, finalItems));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const invoiceId = params.data.id;

  const deleted = await db.transaction(async (tx) => {
    // Restore stock for all items in this invoice
    const items = await tx.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId));
    for (const item of items) {
      if (item.productId != null) {
        await tx
          .update(productsTable)
          .set({ stockQuantity: sql`${productsTable.stockQuantity} + ${Math.floor(Number(item.quantity))}` })
          .where(eq(productsTable.id, item.productId));
      }
    }

    // Delete items then invoice
    await tx.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId));
    const [deleted] = await tx.delete(invoicesTable).where(eq(invoicesTable.id, invoiceId)).returning();
    return deleted;
  });

  if (!deleted) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
