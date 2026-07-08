import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessProfileTable = pgTable("business_profiles", {
  id: serial("id").primaryKey(),
  shopName: text("shop_name").notNull(),
  logoUrl: text("logo_url"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  state: text("state"),
  city: text("city"),
  pincode: text("pincode"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  upiId: text("upi_id"),
  termsAndConditions: text("terms_and_conditions"),
  invoiceNotes: text("invoice_notes"),
  defaultTaxPercent: numeric("default_tax_percent", { precision: 5, scale: 2 }).notNull().default("18"),
  currency: text("currency").notNull().default("INR"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBusinessProfileSchema = createInsertSchema(businessProfileTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>;
export type BusinessProfile = typeof businessProfileTable.$inferSelect;
