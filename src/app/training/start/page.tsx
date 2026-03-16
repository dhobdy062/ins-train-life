import AssignedSessionStartConsole from "@/components/AssignedSessionStartConsole";
import TraineeTrainingStartConsole from "@/components/TraineeTrainingStartConsole";

type TrainingStartPageProps = {
  searchParams: Promise<{
    invite?: string;
    session?: string;
  }>;
};

export default async function TrainingStartPage({ searchParams }: TrainingStartPageProps) {
  const params = await searchParams;
  const inviteToken = typeof params.invite === "string" ? params.invite : null;
  const sessionKey = typeof params.session === "string" ? params.session : null;

  return (
    <div className="page">
      <div className="shell">
        <main>
          {sessionKey ? (
            <AssignedSessionStartConsole sessionKey={sessionKey} />
          ) : (
            <TraineeTrainingStartConsole inviteToken={inviteToken} />
          )}
        </main>
      </div>
    </div>
  );
}
