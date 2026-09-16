import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { getCurrentUser } from "@/lib/token-auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NASCAR Picks",
  description: "2026 NASCAR Picks Competition",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <QueryProvider>
          <Header user={user} />
          <main className="min-h-screen pb-16 md:pb-0">
            {children}
          </main>
          <MobileNav />
        </QueryProvider>
      </body>
    </html>
  );
}
