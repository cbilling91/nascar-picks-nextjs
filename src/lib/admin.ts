import { db, profiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/token-auth";

/**
 * Check if a specific user ID has admin privileges.
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { isAdmin: true },
  });

  return user?.isAdmin ?? false;
}

/**
 * Check if the currently authenticated user (via auth_token cookie) is an admin.
 */
export async function getCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.is_admin;
}