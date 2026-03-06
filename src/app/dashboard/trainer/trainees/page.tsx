import { auth } from "@clerk/nextjs/server";
import AddTraineeForm from "@/components/trainer/AddTraineeForm";
import TraineeRoster from "@/components/trainer/TraineeRoster";
import { getTrainerDashboardSnapshot, listTraineesByOrg } from "@/lib/convex";

export default async function TraineesPage() {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) {
    return null;
  }

  const [trainees, snapshot] = await Promise.all([
    listTraineesByOrg({ orgId, limit: 100 }).catch(() => []),
    getTrainerDashboardSnapshot({ orgId, trainerId: userId }).catch(() => null),
  ]);

  const avgScoreById: Record<string, number> = Object.fromEntries(
    (snapshot?.trainees ?? []).map((item) => [item.id, item.avgScore]),
  );

  return (
    <>
      <section className="glass panel">
        <div className="tag">Trainee Setup</div>
        <h3>Add and configure trainees for personalized coaching</h3>
        <AddTraineeForm />
      </section>

      <section className="glass panel">
        <div className="tag">Roster</div>
        <h3>Trainees and session access status</h3>
        <TraineeRoster trainees={trainees} avgScoreById={avgScoreById} />
      </section>
    </>
  );
}
