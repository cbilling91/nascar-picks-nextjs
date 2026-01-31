import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export interface AuthUser {
  id: string;
  display_name: string;
  phone_number: string | null;
  is_admin: boolean;
  auth_token: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from("profiles")
    .select("id, display_name, phone_number, is_admin, auth_token")
    .eq("auth_token", token)
    .single();

  if (error || !user) {
    return null;
  }

  return user as AuthUser;
}
