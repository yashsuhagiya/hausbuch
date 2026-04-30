import Link from "next/link";
import { AccountsSection } from "@/components/settings/accounts-section";
import { CategoriesSection } from "@/components/settings/categories-section";
import { DataSection } from "@/components/settings/data-section";
import { RecurringSection } from "@/components/settings/recurring-section";
import { SnapshotsSection } from "@/components/settings/snapshots-section";
import { SyncSection } from "@/components/settings/sync-section";

export default function Settings() {
  return (
    <main className="max-w-[820px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <header className="flex justify-between items-baseline pb-4 border-b border-ink mb-10">
        <h1 className="font-display text-4xl">Settings.</h1>
        <Link href="/" className="font-mono text-xs uppercase tracking-widest text-sage hover:text-ink">
          ← back to month
        </Link>
      </header>
      <SyncSection />
      <RecurringSection />
      <CategoriesSection />
      <AccountsSection />
      <SnapshotsSection />
      <DataSection />
    </main>
  );
}
