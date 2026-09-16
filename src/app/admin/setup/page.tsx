"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSetupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!displayName.trim()) {
        setError("Display name is required");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          is_admin: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(`Failed to create admin: ${err.error}`);
      } else {
        const data = await res.json();
        setToken(data.user.auth_token);
        setMessage(`Admin user created! Save this token: ${data.user.auth_token}`);
        setDisplayName("");
        setTimeout(() => {
          router.push("/admin/users");
        }, 3000);
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
          <CardDescription>Create the first admin user</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Admin User"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && (
              <div className="p-3 rounded bg-green-50 dark:bg-green-950/20 text-sm">
                <p className="text-green-700 dark:text-green-400 font-semibold mb-1">Admin created successfully!</p>
                <p className="text-green-600 dark:text-green-500 break-all text-xs">
                  Auth Token: <code className="font-mono">{token}</code>
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Admin..." : "Create Admin User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}