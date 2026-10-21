import { Router, type IRouter, type Request } from "express";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { businessProfileTable } from "@workspace/db";
import { GetBusinessProfileResponse, UpdateBusinessProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

/** Extract userId from Clerk token (null if no auth header) */
function getUserId(req: Request): string | null {
  try {
    const auth = getAuth(req as any);
    return auth?.userId ?? null;
  } catch {
    return null;
  }
}

/** Extract and parse the X-Profile-Id header */
function getProfileId(req: Request): number | null {
  const h = req.headers["x-profile-id"];
  if (!h) return null;
  const id = parseInt(h as string, 10);
  return isNaN(id) ? null : id;
}

function formatProfile(p: typeof businessProfileTable.$inferSelect) {
  return GetBusinessProfileResponse.parse({
    ...p,
    defaultTaxPercent: Number(p.defaultTaxPercent),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  });
}

// ─── GET /business-profile ──────────────────────────────────────────────────
// Returns the profile identified by X-Profile-Id header.
// Falls back to the first profile owned by the authenticated user,
// or the very first profile in the DB for backward compat.
router.get("/business-profile", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const profileId = getProfileId(req);

  let profile: typeof businessProfileTable.$inferSelect | undefined;

  if (profileId) {
    const conditions = [eq(businessProfileTable.id, profileId)];
    if (userId) conditions.push(eq(businessProfileTable.userId, userId));
    const [row] = await db.select().from(businessProfileTable).where(and(...conditions)).limit(1);
    profile = row;
  } else if (userId) {
    const [row] = await db.select().from(businessProfileTable).where(eq(businessProfileTable.userId, userId)).limit(1);
    profile = row;
  } else {
    const [row] = await db.select().from(businessProfileTable).limit(1);
    profile = row;
  }

  if (!profile) {
    res.status(404).json({ error: "Business profile not found" });
    return;
  }

  res.json(formatProfile(profile));
});

// ─── PUT /business-profile ──────────────────────────────────────────────────
// If X-Profile-Id is provided → update that profile (must be owned by userId if auth present)
// If no X-Profile-Id and user has no profile → create new profile for this userId
router.put("/business-profile", async (req, res): Promise<void> => {
  const parsed = UpdateBusinessProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = getUserId(req) ?? "legacy";
  const profileId = getProfileId(req);
  const d = parsed.data;

  // Build update map
  const buildUpdate = () => {
    const u: Record<string, unknown> = { updatedAt: new Date() };
    if (d.shopName != null) u.shopName = d.shopName;
    if (d.ownerName != null) u.ownerName = d.ownerName;
    if (d.phone != null) u.phone = d.phone;
    if (d.logoUrl !== undefined) u.logoUrl = d.logoUrl;
    if (d.gstNumber !== undefined) u.gstNumber = d.gstNumber;
    if (d.panNumber !== undefined) u.panNumber = d.panNumber;
    if (d.email !== undefined) u.email = d.email;
    if (d.address !== undefined) u.address = d.address;
    if (d.state !== undefined) u.state = d.state;
    if (d.city !== undefined) u.city = d.city;
    if (d.pincode !== undefined) u.pincode = d.pincode;
    if (d.bankName !== undefined) u.bankName = d.bankName;
    if (d.accountNumber !== undefined) u.accountNumber = d.accountNumber;
    if (d.ifscCode !== undefined) u.ifscCode = d.ifscCode;
    if (d.upiId !== undefined) u.upiId = d.upiId;
    if (d.termsAndConditions !== undefined) u.termsAndConditions = d.termsAndConditions;
    if (d.invoiceNotes !== undefined) u.invoiceNotes = d.invoiceNotes;
    if (d.defaultTaxPercent != null) u.defaultTaxPercent = d.defaultTaxPercent.toString();
    if (d.currency != null) u.currency = d.currency;
    return u;
  };

  let result: typeof businessProfileTable.$inferSelect;

  if (profileId) {
    // Update existing profile
    const conditions = [eq(businessProfileTable.id, profileId)];
    // Only enforce ownership when we actually have a real userId (not legacy)
    if (userId !== "legacy") conditions.push(eq(businessProfileTable.userId, userId));
    const [updated] = await db
      .update(businessProfileTable)
      .set(buildUpdate())
      .where(and(...conditions))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Profile not found or access denied" });
      return;
    }
    result = updated;
  } else {
    // No profile ID → look for existing profile for this user
    const [existing] = await db
      .select({ id: businessProfileTable.id })
      .from(businessProfileTable)
      .where(eq(businessProfileTable.userId, userId))
      .limit(1);

    if (existing) {
      // Update the user's first profile
      const [updated] = await db
        .update(businessProfileTable)
        .set(buildUpdate())
        .where(eq(businessProfileTable.id, existing.id))
        .returning();
      result = updated;
    } else {
      // Create brand-new profile for this user
      const [created] = await db
        .insert(businessProfileTable)
        .values({
          ...d,
          userId,
          defaultTaxPercent: (d.defaultTaxPercent ?? 18).toString(),
          currency: d.currency ?? "INR",
        })
        .returning();
      result = created;
    }
  }

  res.json(formatProfile(result));
});

// ─── GET /business-profiles ─────────────────────────────────────────────────
// List all profiles owned by the authenticated user
router.get("/business-profiles", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const profiles = await db
    .select()
    .from(businessProfileTable)
    .where(eq(businessProfileTable.userId, userId))
    .orderBy(businessProfileTable.createdAt);
  res.json(profiles.map(p => formatProfile(p)));
});

// ─── DELETE /business-profiles/:id ──────────────────────────────────────────
router.delete("/business-profiles/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const conditions = [eq(businessProfileTable.id, id)];
  if (userId) conditions.push(eq(businessProfileTable.userId, userId));

  const [deleted] = await db
    .delete(businessProfileTable)
    .where(and(...conditions))
    .returning({ id: businessProfileTable.id });

  if (!deleted) { res.status(404).json({ error: "Profile not found" }); return; }
  res.sendStatus(204);
});

export default router;
