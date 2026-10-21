import { Router, type IRouter } from "express";
import { sql, eq, and, gte } from "drizzle-orm";
import { db } from "@workspace/db";
import { invoicesTable, productsTable, customersTable } from "@workspace/db";
import { getProfileId } from "../lib/routeHelpers";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const profileId = getProfileId(req);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Helper to build profile condition
  const profileCond = profileId ? eq(invoicesTable.businessProfileId, profileId) : undefined;
  const productProfileCond = profileId ? eq(productsTable.businessProfileId, profileId) : undefined;
  const customerProfileCond = profileId ? eq(customersTable.businessProfileId, profileId) : undefined;

  // Today's invoices
  const todayInvoices = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.invoiceDate, todayStr),
        sql`${invoicesTable.status} != 'cancelled'`,
        ...(profileCond ? [profileCond] : []),
      )
    );
  const todaySales = todayInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
  const todayOrders = todayInvoices.length;

  // Pending payments (unpaid/partial)
  const pendingInvoices = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        sql`${invoicesTable.status} IN ('sent', 'partial')`,
        ...(profileCond ? [profileCond] : []),
      )
    );
  const pendingPayments = pendingInvoices.reduce(
    (sum, inv) => sum + (Number(inv.grandTotal) - Number(inv.paidAmount)),
    0
  );

  // Inventory value
  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.isArchived, false),
        ...(productProfileCond ? [productProfileCond] : []),
      )
    );
  const inventoryValue = products.reduce(
    (sum, p) => sum + p.stockQuantity * Number(p.sellingPrice),
    0
  );
  const lowStockCount = products.filter(p => p.stockQuantity <= p.minimumStock).length;

  // Total customers
  const totalCustomers = customerProfileCond
    ? (await db.select().from(customersTable).where(customerProfileCond)).length
    : await db.$count(customersTable);

  // Monthly revenue for last 6 months
  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthStr = String(month).padStart(2, "0");
    const prefix = `${year}-${monthStr}`;
    const invoices = await db
      .select()
      .from(invoicesTable)
      .where(
        and(
          sql`${invoicesTable.invoiceDate} LIKE ${prefix + "-%"}`,
          sql`${invoicesTable.status} != 'cancelled'`,
          ...(profileCond ? [profileCond] : []),
        )
      );
    const revenue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    monthlyRevenue.push({
      month: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      revenue: parseFloat(revenue.toFixed(2)),
      orders: invoices.length,
    });
  }

  res.json({
    todaySales: parseFloat(todaySales.toFixed(2)),
    todayOrders,
    pendingPayments: parseFloat(pendingPayments.toFixed(2)),
    inventoryValue: parseFloat(inventoryValue.toFixed(2)),
    lowStockCount,
    totalCustomers,
    monthlyRevenue,
  });
});

export default router;
