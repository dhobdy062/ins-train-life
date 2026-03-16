import { auth } from "@clerk/nextjs/server";
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
    <>
      <section className="glass panel">
        <div className="tag">Session Builder</div>
        <h3>Assign exact objection sequences to trainees</h3>
        <p className="disclaimer">
          Choose the trainee, set the difficulty, select the objection order, and hand the exact session to the trainee dashboard.
        </p>
        {trainees.length === 0 ? (
          <p className="disclaimer">Add at least one trainee in the Trainees tab before creating sessions.</p>
        ) : (
          <SessionBuilder
            trainees={trainees.map((trainee) => ({
              traineeId: trainee.traineeId,
              clerkUserId: trainee.clerkUserId,
              name: trainee.name,
              difficultyLevel: trainee.difficultyLevel,
              numObjections: trainee.numObjections,
            }))}
            objectionLibrary={objectionConfig?.objectionLibrary ?? DEFAULT_OBJECTION_LIBRARY}
            rebuttalGuides={objectionConfig?.rebuttalGuides ?? DEFAULT_REBUTTAL_GUIDES}
            recentSessions={recentSessions}
          />
        )}
      </section>
    </>
  );
}
