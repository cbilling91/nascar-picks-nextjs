import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/token-auth";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign In - NASCAR Picks",
  description: "Sign in to NASCAR Picks with your access link",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <LoginForm />
    </div>
  );
}
