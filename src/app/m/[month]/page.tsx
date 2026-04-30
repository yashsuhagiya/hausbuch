import { MonthPageShell } from "@/components/month/page-shell";

export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return <main className="p-12">Bad month</main>;
  }
  return <MonthPageShell month={month} />;
}
