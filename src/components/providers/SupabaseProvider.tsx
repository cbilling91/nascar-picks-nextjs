"use client";

import { createContext, useContext, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({
  url,
  anonKey,
  children,
}: {
  url: string;
  anonKey: string;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createBrowserClient(url, anonKey), [url, anonKey]);
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const client = useContext(SupabaseContext);
  if (!client) throw new Error("useSupabase must be used within SupabaseProvider");
  return client;
}
