import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { AuthForm } from "@/components/app/auth-form";

export default async function LoginPage() {
  const userId = await getUserId();
  if (userId) redirect("/");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <AuthForm />
    </main>
  );
}
