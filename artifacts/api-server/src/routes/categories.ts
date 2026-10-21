import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { getProfileId } from "../lib/routeHelpers";
import {
  GetCategoriesResponse,
  CreateCategoryBody,
  DeleteCategoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (req, res): Promise<void> => {
  const profileId = getProfileId(req);
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(profileId ? eq(categoriesTable.businessProfileId, profileId) : undefined)
    .orderBy(categoriesTable.name);
  res.json(GetCategoriesResponse.parse(categories));
});

router.post("/categories", async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const profileId = getProfileId(req);
  const [category] = await db
    .insert(categoriesTable)
    .values({ ...parsed.data, ...(profileId ? { businessProfileId: profileId } : {}) })
    .returning();
  res.status(201).json(category);
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
