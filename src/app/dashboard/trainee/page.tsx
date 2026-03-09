import TraineeDashboard from "@/components/dashboards/TraineeDashboard";

type TraineeDashboardPageProps = {
  searchParams: Promise<{
    refresh?: string;
  }>;
};

export default async function TraineeDashboardPage({ searchParams }: TraineeDashboardPageProps) {
  const params = await searchParams;
  const refreshOnLoad = params.refresh === "1";

  return <TraineeDashboard refreshOnLoad={refreshOnLoad} />;
}
