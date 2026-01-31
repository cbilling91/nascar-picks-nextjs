"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function AdminSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSetAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!userId.trim()) {
        setError("User ID is required");
        setLoading(false);
        return;
      }

      // Insert or update the profile to set as admin
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            display_name: displayName || "Admin User",
            is_admin: true,
            created_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        setError(`Failed to set admin: ${upsertError.message}`);
      } else {
        setMessage(`User ${userId} has been set as admin!`);
        setUserId("");
        setDisplayName("");
        setTimeout(() => {
          router.push("/admin/users");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
          <CardDescription>Set a user as admin by their UUID</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetAdmin} className="space-y-4">
            <div>
              <Label htmlFor="userId">User ID (UUID)</Label>
              <Input
                id="userId"
                type="text"
                placeholder="5047c103-9c67-4caa-b8de-6945084d60c4"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Admin User"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting Admin..." : "Set as Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
