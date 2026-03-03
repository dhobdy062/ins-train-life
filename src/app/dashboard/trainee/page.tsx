import TraineeDashboard from "@/components/dashboards/TraineeDashboard";

type TraineeDashboardPageProps = {
  searchParams: Promise<{
    refresh?: string;
    invite?: string;
  }>;
};

export default async function TraineeDashboardPage({ searchParams }: TraineeDashboardPageProps) {
  const params = await searchParams;
  const refreshOnLoad = params.refresh === "1";
  const inviteToken = typeof params.invite === "string" ? params.invite : null;

  return <TraineeDashboard refreshOnLoad={refreshOnLoad} inviteToken={inviteToken} />;
}
