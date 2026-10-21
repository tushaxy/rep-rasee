import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db";
import { getProfileId } from "../lib/routeHelpers";
import {
  CreateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  UpdateCustomerBody,
  DeleteCustomerParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatCustomer(c: typeof customersTable.$inferSelect) {
  return { ...c, outstandingBalance: Number(c.outstandingBalance) };
}

router.get("/customers", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const favorites = req.query.favorites === "true";

  const profileId = getProfileId(req);
  const conditions = [];
  if (favorites) conditions.push(eq(customersTable.isFavorite, true));
  if (profileId) conditions.push(eq(customersTable.businessProfileId, profileId));
  if (search) {
    conditions.push(
      sql`(${customersTable.name} ILIKE ${`%${search}%`} OR ${customersTable.phone} ILIKE ${`%${search}%`} OR ${customersTable.email} ILIKE ${`%${search}%`})`
    );
  }

  const rows = await db
    .select()
    .from(customersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(customersTable.name);

  res.json(rows.map(formatCustomer));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const profileId = getProfileId(req);
  const [customer] = await db
    .insert(customersTable)
    .values({
      ...parsed.data,
      outstandingBalance: parsed.data.outstandingBalance?.toString() ?? "0",
      isFavorite: parsed.data.isFavorite ?? false,
      ...(profileId ? { businessProfileId: profileId } : {}),
    })
    .returning();
  res.status(201).json(formatCustomer(customer));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(formatCustomer(customer));
});

router.put("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  const d = parsed.data;
  if (d.name != null) updateData.name = d.name;
  if (d.phone !== undefined) updateData.phone = d.phone;
  if (d.email !== undefined) updateData.email = d.email;
  if (d.gstNumber !== undefined) updateData.gstNumber = d.gstNumber;
  if (d.address !== undefined) updateData.address = d.address;
  if (d.outstandingBalance != null) updateData.outstandingBalance = d.outstandingBalance.toString();
  if (d.notes !== undefined) updateData.notes = d.notes;
  if (d.isFavorite != null) updateData.isFavorite = d.isFavorite;

  const [customer] = await db
    .update(customersTable)
    .set(updateData)
    .where(eq(customersTable.id, params.data.id))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(formatCustomer(customer));
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(customersTable)
    .where(eq(customersTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
