import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { StoreHydrator } from "@/components/store-hydrator";
import { SyncIndicator } from "@/components/sync-indicator";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/sign-in");

  return (
    <>
      <StoreHydrator />
      {children}
      <SyncIndicator />
    </>
  );
}
