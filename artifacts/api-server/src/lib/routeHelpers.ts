import type { Request } from "express";
import { getAuth } from "@clerk/express";

/** Extract userId from the Clerk token, null if missing or invalid */
export function getUserId(req: Request): string | null {
  try {
    const auth = getAuth(req as any);
    return auth?.userId ?? null;
  } catch {
    return null;
  }
}

/** Extract and parse the X-Profile-Id header */
export function getProfileId(req: Request): number | null {
  const h = req.headers["x-profile-id"];
  if (!h) return null;
  const id = parseInt(h as string, 10);
  return isNaN(id) ? null : id;
}
