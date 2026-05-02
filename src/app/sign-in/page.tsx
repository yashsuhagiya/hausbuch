import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/sign-in-form";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) redirect("/");

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl italic text-center mb-2">Hausbuch.</h1>
        <p className="font-display italic text-sage text-center mb-8">Sign in to continue.</p>
        <SignInForm />
      </div>
    </main>
  );
}
