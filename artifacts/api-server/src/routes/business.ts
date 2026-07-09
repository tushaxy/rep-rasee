import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { businessProfileTable } from "@workspace/db";
import { GetBusinessProfileResponse, UpdateBusinessProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/business-profile", async (req, res): Promise<void> => {
  const profiles = await db.select().from(businessProfileTable).limit(1);
  if (profiles.length === 0) {
    res.status(404).json({ error: "Business profile not found" });
    return;
  }
  const p = profiles[0];
  res.json(GetBusinessProfileResponse.parse({
    ...p,
    defaultTaxPercent: Number(p.defaultTaxPercent),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
});

router.put("/business-profile", async (req, res): Promise<void> => {
  const parsed = UpdateBusinessProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select({ id: businessProfileTable.id }).from(businessProfileTable).limit(1);

  let result: typeof businessProfileTable.$inferSelect;
  if (!existing) {
    const [created] = await db
      .insert(businessProfileTable)
      .values({
        ...parsed.data,
        defaultTaxPercent: parsed.data.defaultTaxPercent?.toString() ?? "18",
        currency: parsed.data.currency ?? "INR",
      })
      .returning();
    result = created;
  } else {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const d = parsed.data;
    if (d.shopName != null) updateData.shopName = d.shopName;
    if (d.ownerName != null) updateData.ownerName = d.ownerName;
    if (d.phone != null) updateData.phone = d.phone;
    if (d.logoUrl !== undefined) updateData.logoUrl = d.logoUrl;
    if (d.gstNumber !== undefined) updateData.gstNumber = d.gstNumber;
    if (d.panNumber !== undefined) updateData.panNumber = d.panNumber;
    if (d.email !== undefined) updateData.email = d.email;
    if (d.address !== undefined) updateData.address = d.address;
    if (d.state !== undefined) updateData.state = d.state;
    if (d.city !== undefined) updateData.city = d.city;
    if (d.pincode !== undefined) updateData.pincode = d.pincode;
    if (d.bankName !== undefined) updateData.bankName = d.bankName;
    if (d.accountNumber !== undefined) updateData.accountNumber = d.accountNumber;
    if (d.ifscCode !== undefined) updateData.ifscCode = d.ifscCode;
    if (d.upiId !== undefined) updateData.upiId = d.upiId;
    if (d.termsAndConditions !== undefined) updateData.termsAndConditions = d.termsAndConditions;
    if (d.invoiceNotes !== undefined) updateData.invoiceNotes = d.invoiceNotes;
    if (d.defaultTaxPercent != null) updateData.defaultTaxPercent = d.defaultTaxPercent.toString();
    if (d.currency != null) updateData.currency = d.currency;

    // Always target the single known row by id
    const [updated] = await db
      .update(businessProfileTable)
      .set(updateData)
      .where(eq(businessProfileTable.id, existing.id))
      .returning();
    result = updated;
  }

  res.json(GetBusinessProfileResponse.parse({
    ...result,
    defaultTaxPercent: Number(result.defaultTaxPercent),
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }));
});

export default router;
