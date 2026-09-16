import { cookies } from "next/headers";
import { db, profiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export interface AuthUser {
  id: string;
  display_name: string;
  phone_number: string | null;
  is_admin: boolean;
  auth_token: string;
}

/**
 * Hash a raw token using SHA-256 for secure storage/lookup.
 */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Get the currently authenticated user from the auth_token cookie.
 * Returns null if no valid token is found.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get("auth_token")?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);

  const user = await db.query.profiles.findFirst({
    where: eq(profiles.authToken, tokenHash),
    columns: {
      id: true,
      displayName: true,
      phoneNumber: true,
      isAdmin: true,
      authToken: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    display_name: user.displayName,
    phone_number: user.phoneNumber ?? null,
    is_admin: user.isAdmin ?? false,
    auth_token: user.authToken ?? "",
  };
}

/**
 * Generate a new raw auth token (for admin user creation).
 * The hash is stored in the database; the raw token is returned to be shared with the user.
 */
export function generateAuthToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a raw token for storage in the database.
 */
export { hashToken };