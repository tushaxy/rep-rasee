import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db";
import { getProfileId } from "../lib/routeHelpers";
import {
  CreateProductBody,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatProduct(
  p: typeof productsTable.$inferSelect & { categoryName?: string | null }
) {
  return {
    ...p,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
    mrp: p.mrp != null ? Number(p.mrp) : null,
    gstPercent: Number(p.gstPercent),
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const categoryIdRaw = typeof req.query.categoryId === "string" ? parseInt(req.query.categoryId, 10) : undefined;
  const lowStock = req.query.lowStock === "true";
  const profileId = getProfileId(req);

  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      barcode: productsTable.barcode,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      brand: productsTable.brand,
      purchasePrice: productsTable.purchasePrice,
      sellingPrice: productsTable.sellingPrice,
      mrp: productsTable.mrp,
      gstPercent: productsTable.gstPercent,
      hsnCode: productsTable.hsnCode,
      stockQuantity: productsTable.stockQuantity,
      unit: productsTable.unit,
      imageUrl: productsTable.imageUrl,
      description: productsTable.description,
      minimumStock: productsTable.minimumStock,
      isArchived: productsTable.isArchived,
      createdAt: productsTable.createdAt,
      updatedAt: productsTable.updatedAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(
      and(
        categoryIdRaw != null && !isNaN(categoryIdRaw)
          ? eq(productsTable.categoryId, categoryIdRaw)
          : undefined,
        lowStock
          ? sql`${productsTable.stockQuantity} <= ${productsTable.minimumStock}`
          : undefined,
        search
          ? sql`(${productsTable.name} ILIKE ${`%${search}%`} OR ${productsTable.sku} ILIKE ${`%${search}%`} OR ${productsTable.barcode} ILIKE ${`%${search}%`})`
          : undefined,
        profileId ? eq(productsTable.businessProfileId, profileId) : undefined,
      )
    )
    .orderBy(productsTable.name);

  res.json(rows.map(r => formatProduct(r)));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const profileId = getProfileId(req);
  const [product] = await db
    .insert(productsTable)
    .values({
      ...parsed.data,
      purchasePrice: parsed.data.purchasePrice?.toString() ?? "0",
      sellingPrice: parsed.data.sellingPrice?.toString() ?? "0",
      mrp: parsed.data.mrp?.toString() ?? null,
      gstPercent: parsed.data.gstPercent?.toString() ?? "0",
      stockQuantity: parsed.data.stockQuantity ?? 0,
      minimumStock: parsed.data.minimumStock ?? 5,
      isArchived: parsed.data.isArchived ?? false,
      ...(profileId ? { businessProfileId: profileId } : {}),
    })
    .returning();

  const catRows = product.categoryId != null
    ? await db.select({ categoryName: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, product.categoryId))
    : [];

  res.status(201).json(formatProduct({ ...product, categoryName: catRows[0]?.categoryName ?? null }));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      barcode: productsTable.barcode,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      brand: productsTable.brand,
      purchasePrice: productsTable.purchasePrice,
      sellingPrice: productsTable.sellingPrice,
      mrp: productsTable.mrp,
      gstPercent: productsTable.gstPercent,
      hsnCode: productsTable.hsnCode,
      stockQuantity: productsTable.stockQuantity,
      unit: productsTable.unit,
      imageUrl: productsTable.imageUrl,
      description: productsTable.description,
      minimumStock: productsTable.minimumStock,
      isArchived: productsTable.isArchived,
      createdAt: productsTable.createdAt,
      updatedAt: productsTable.updatedAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, params.data.id));

  if (!rows[0]) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(rows[0]));
});

router.put("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  const d = parsed.data;
  if (d.name != null) updateData.name = d.name;
  if (d.sku !== undefined) updateData.sku = d.sku;
  if (d.barcode !== undefined) updateData.barcode = d.barcode;
  if (d.categoryId !== undefined) updateData.categoryId = d.categoryId;
  if (d.brand !== undefined) updateData.brand = d.brand;
  if (d.purchasePrice != null) updateData.purchasePrice = d.purchasePrice.toString();
  if (d.sellingPrice != null) updateData.sellingPrice = d.sellingPrice.toString();
  if (d.mrp !== undefined) updateData.mrp = d.mrp?.toString() ?? null;
  if (d.gstPercent != null) updateData.gstPercent = d.gstPercent.toString();
  if (d.hsnCode !== undefined) updateData.hsnCode = d.hsnCode;
  if (d.stockQuantity != null) updateData.stockQuantity = d.stockQuantity;
  if (d.unit != null) updateData.unit = d.unit;
  if (d.imageUrl !== undefined) updateData.imageUrl = d.imageUrl;
  if (d.description !== undefined) updateData.description = d.description;
  if (d.minimumStock != null) updateData.minimumStock = d.minimumStock;
  if (d.isArchived != null) updateData.isArchived = d.isArchived;

  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const catRows = product.categoryId != null
    ? await db.select({ categoryName: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, product.categoryId))
    : [];

  res.json(formatProduct({ ...product, categoryName: catRows[0]?.categoryName ?? null }));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
