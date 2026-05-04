import { renderToStaticMarkup } from "react-dom/server";
import SessionBuilder from "@/components/trainer/SessionBuilder";
import { DEFAULT_OBJECTION_LIBRARY, DEFAULT_REBUTTAL_GUIDES } from "@/lib/trainer-objections";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

describe("SessionBuilder", () => {
  it("renders the product selector with Life and Medicare options", () => {
    const html = renderToStaticMarkup(
      <SessionBuilder
        trainees={[
          {
            traineeId: "trainee_1",
            clerkUserId: "user_1",
            name: "Alex Agent",
            difficultyLevel: "D2",
            numObjections: 2,
          },
        ]}
        objectionLibrary={DEFAULT_OBJECTION_LIBRARY}
        rebuttalGuides={DEFAULT_REBUTTAL_GUIDES}
        recentSessions={[
          {
            sessionKey: "sess_1",
            traineeName: "Alex Agent",
            productType: "medicare_event",
            difficulty: "D2",
            objectionsRequired: 2,
            selectedObjections: [],
            status: "assigned",
            createdAt: 1000,
            startedAt: null,
            endedAt: null,
            structuredOutcome: null,
            recordingUrl: null,
            transcriptUrl: null,
            evaluation: null,
          },
        ]}
      />,
    );

    expect(html).toContain("Product");
    expect(html).toContain("Life Lead");
    expect(html).toContain("Medicare Lead");
    expect(html).toContain("Medicare Event");
    expect(html).toContain("Alex Agent");
    expect(html).toContain("Medicare Event");
  });
});
