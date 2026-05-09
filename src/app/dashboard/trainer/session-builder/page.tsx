import { auth } from "@clerk/nextjs/server";
import styles from "@/components/trainer/TrainerSection.module.css";
import SessionBuilder from "@/components/trainer/SessionBuilder";
import { getOrgTrainerObjectionConfig, getTrainerSessionBuilderSnapshot, listTraineesByOrg } from "@/lib/convex";
import { DEFAULT_OBJECTION_LIBRARY, DEFAULT_REBUTTAL_GUIDES } from "@/lib/trainer-objections";

export default async function SessionBuilderPage() {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) {
    return null;
  }

  const [trainees, objectionConfig, recentSessions] = await Promise.all([
    listTraineesByOrg({ orgId, limit: 100 }).catch(() => []),
    getOrgTrainerObjectionConfig({ orgId }).catch(() => null),
    getTrainerSessionBuilderSnapshot({ orgId, trainerId: userId, limit: 20 }).catch(() => []),
  ]);

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.sectionTag}>Training Calls</p>
            <h2>Training Calls</h2>
            <p className={styles.helpText}>
              Choose the trainee, product, difficulty, and objection order for each training call.
            </p>
          </div>
        </div>
      </section>
      {trainees.length === 0 ? (
        <section className={styles.panel}>
          <p className={styles.helpText}>Add at least one trainee in Team Members or Trainees Setup before creating sessions.</p>
        </section>
      ) : (
        <SessionBuilder
          trainees={trainees.map((trainee) => ({
            traineeId: trainee.traineeId,
            clerkUserId: trainee.clerkUserId,
            name: trainee.name,
            availableProductTypes: trainee.availableProductTypes,
            difficultyLevel: trainee.difficultyLevel,
            numObjections: trainee.numObjections,
          }))}
          objectionLibrary={objectionConfig?.objectionLibrary ?? DEFAULT_OBJECTION_LIBRARY}
          rebuttalGuides={objectionConfig?.rebuttalGuides ?? DEFAULT_REBUTTAL_GUIDES}
          recentSessions={recentSessions}
        />
      )}
    </div>
  );
}
