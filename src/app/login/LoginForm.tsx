"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Extract the raw auth token from either a full access link
 * (e.g. https://example.com/?token=abc123) or a bare token string.
 */
function extractToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try parsing as a URL first (a pasted access link)
  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("token");
    if (token) return token;
  } catch {
    // Not a URL — fall through and treat the input as a bare token
  }

  // Bare tokens are 64-character hex strings (32 bytes)
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return trimmed;

  return null;
}

export function LoginForm() {
  const [accessLink, setAccessLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const token = extractToken(accessLink);
    if (!token) {
      setError("Please paste a valid access link or token. Check your text messages for the link from your admin.");
      return;
    }

    setLoading(true);
    // Full navigation so the middleware can set the auth_token cookie
    // and redirect back to the home page signed in.
    window.location.href = `/?token=${encodeURIComponent(token)}`;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Paste the access link that was texted to you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <Label htmlFor="accessLink">Access Link or Token</Label>
            <Input
              id="accessLink"
              type="text"
              placeholder="https://.../?token=... or your token"
              value={accessLink}
              onChange={(e) => setAccessLink(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Don&apos;t have a link? An admin can send you one from{" "}
            <Link href="/admin/users" className="text-primary hover:underline">
              /admin/users
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
