import TraineeTrainingStartConsole from "@/components/TraineeTrainingStartConsole";

type TrainingStartPageProps = {
  searchParams: Promise<{
    invite?: string;
  }>;
};

export default async function TrainingStartPage({ searchParams }: TrainingStartPageProps) {
  const params = await searchParams;
  const inviteToken = typeof params.invite === "string" ? params.invite : null;

  return (
    <div className="page">
      <div className="shell">
        <main>
          <TraineeTrainingStartConsole inviteToken={inviteToken} />
        </main>
      </div>
    </div>
  );
}
