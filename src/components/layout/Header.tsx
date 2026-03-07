"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings } from "lucide-react";

interface HeaderProps {
  user: {
    id?: string;
    display_name?: string;
    is_admin?: boolean;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = () => {
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/");
    router.refresh();
  };

  const displayName = user?.display_name || "User";
  const initials = displayName.substring(0, 2).toUpperCase();

  // Only show authenticated UI after component is mounted to avoid hydration mismatch
  const isAuthenticated = mounted && user;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">NASCAR Picks</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/schedule" className="text-sm font-medium hover:text-primary">
            Schedule
          </Link>
          <Link href="/standings" className="text-sm font-medium hover:text-primary">
            Standings
          </Link>
          <Link href="/rules" className="text-sm font-medium hover:text-primary">
            Rules
          </Link>
          {isAuthenticated && user?.is_admin && (
            <Link href="/admin/users" className="text-sm font-medium hover:text-primary flex items-center gap-1">
              <Settings className="w-4 h-4" />
              Users
            </Link>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm">{displayName}</span>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
