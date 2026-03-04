import { auth } from "@clerk/nextjs/server";
import AddTraineeForm from "@/components/trainer/AddTraineeForm";
import { getTrainerDashboardSnapshot, listTraineesByOrg } from "@/lib/convex";

function formatDate(value: number | null) {
  if (!value) {
    return "Not available";
  }
  return new Date(value).toLocaleString();
}

export default async function TraineesPage() {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) {
    return null;
  }

  const [trainees, snapshot] = await Promise.all([
    listTraineesByOrg({ orgId, limit: 100 }).catch(() => []),
    getTrainerDashboardSnapshot({ orgId, trainerId: userId }).catch(() => null),
  ]);

  const metricsById = new Map((snapshot?.trainees ?? []).map((item) => [item.id, item]));

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
        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px" }}>Name</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Email</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Difficulty</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Objections</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Access status</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Avg score</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Last active</th>
              </tr>
            </thead>
            <tbody>
              {trainees.map((trainee) => {
                const metrics = metricsById.get(trainee.traineeId);
                const accessStatus = trainee.ipAddressMasked ? "Confirmed" : "Pending";
                const accessDetails = trainee.ipConsentedAt
                  ? `Confirmed ${formatDate(trainee.ipConsentedAt)}`
                  : "Waiting for trainee confirmation";

                return (
                  <tr key={trainee.traineeId}>
                    <td style={{ padding: "10px" }}>{trainee.name}</td>
                    <td style={{ padding: "10px" }}>{trainee.email}</td>
                    <td style={{ padding: "10px" }}>{trainee.difficultyLevel}</td>
                    <td style={{ padding: "10px" }}>{trainee.numObjections}</td>
                    <td style={{ padding: "10px" }}>
                      <div>{accessStatus}</div>
                      <div className="disclaimer">{accessDetails}</div>
                    </td>
                    <td style={{ padding: "10px" }}>{metrics ? `${metrics.avgScore}%` : "-"}</td>
                    <td style={{ padding: "10px" }}>{formatDate(trainee.lastActiveAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
