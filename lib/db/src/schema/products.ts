import { pgTable, serial, text, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku"),
  barcode: text("barcode"),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  brand: text("brand"),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
  mrp: numeric("mrp", { precision: 12, scale: 2 }),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  hsnCode: text("hsn_code"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  unit: text("unit").notNull().default("pcs"),
  imageUrl: text("image_url"),
  description: text("description"),
  minimumStock: integer("minimum_stock").notNull().default(5),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
