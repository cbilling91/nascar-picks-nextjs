import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/token-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || !user.is_admin) {
    redirect("/");
  }

  return <>{children}</>;
}
