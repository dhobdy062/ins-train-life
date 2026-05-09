import { auth } from "@clerk/nextjs/server";
import AddTraineeForm from "@/components/trainer/AddTraineeForm";
import styles from "@/components/trainer/TrainerSection.module.css";
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
    <div className={styles.stack}>
      <section className={styles.panel}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.sectionTag}>Team Members or Trainees Setup</p>
            <h2>Team Members or Trainees Setup</h2>
            <p className={styles.helpText}>Just add trainees for coaching.</p>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div>
          <p className={styles.sectionTag}>Trainee Setup</p>
          <div className={styles.headerRowCompact}>
            <h3>Just Add Trainees for Coaching</h3>
          </div>
        </div>
        <AddTraineeForm />
      </section>

      <section className={styles.panel}>
        <div>
          <p className={styles.sectionTag}>Trainee Setup Roster</p>
          <div className={styles.headerRowCompact}>
            <h3>Trainee Setup Roster</h3>
          </div>
        </div>
        <TraineeRoster trainees={trainees} avgScoreById={avgScoreById} />
      </section>
    </div>
  );
}
