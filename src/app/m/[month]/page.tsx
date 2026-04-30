import { Breakdown } from "@/components/month/breakdown";
import { ClosingPanel } from "@/components/month/closing-panel";
import { EntriesList } from "@/components/month/entries-list";
import { FlowChart } from "@/components/month/flow-chart";
import { PageHead } from "@/components/month/page-head";
import { StatsStrip } from "@/components/month/stats-strip";

export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return <main className="p-12">Bad month</main>;
  }
  return (
    <main className="max-w-[1320px] mx-auto px-8 py-12">
      <PageHead month={month} />
      <StatsStrip month={month} />
      <FlowChart month={month} />
      <EntriesList month={month} />
      <Breakdown month={month} />
      <ClosingPanel month={month} />
    </main>
  );
}
