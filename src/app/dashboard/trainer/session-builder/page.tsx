import { auth } from "@clerk/nextjs/server";
import SessionBuilder from "@/components/trainer/SessionBuilder";
import { listTraineesByOrg } from "@/lib/convex";

export default async function SessionBuilderPage() {
  const { orgId } = await auth();
  if (!orgId) {
    return null;
  }

  const trainees = await listTraineesByOrg({ orgId, limit: 100 }).catch(() => []);

  return (
    <>
      <section className="glass panel">
        <div className="tag">Session Builder</div>
        <h3>Create personalized sessions by trainee profile</h3>
        <p className="disclaimer">
          Choose a trainee, adjust difficulty and objection count, then create the next practice session.
        </p>
        {trainees.length === 0 ? (
          <p className="disclaimer">Add at least one trainee in the Trainees tab before creating sessions.</p>
        ) : (
          <SessionBuilder
            trainees={trainees.map((trainee) => ({
              traineeId: trainee.traineeId,
              name: trainee.name,
              difficultyLevel: trainee.difficultyLevel,
              numObjections: trainee.numObjections,
            }))}
          />
        )}
      </section>
    </>
  );
}
