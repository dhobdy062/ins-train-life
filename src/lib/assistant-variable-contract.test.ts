import { validateAssistantVariableContract } from "@/lib/assistant-variable-contract";

describe("validateAssistantVariableContract", () => {
  it("passes for valid trainee payload", () => {
    const result = validateAssistantVariableContract(
      {
        difficulty: "D2",
        objectionsRequired: "3",
        objection_sequence: JSON.stringify([
          { order: 0, text: "First objection", rebuttalType: "dont_remember" },
          { order: 1, text: "Second objection", rebuttalType: "not_interested" },
        ]),
        rebuttals: JSON.stringify({ not_interested: "Sample" }),
        session_key: "sess_1",
        org_id: "org_1",
        trainer_id: "trainer_1",
        trainee_id: "trainee_1",
        trainee_name: "Sarah",
        product_type: "medicare_lead",
        product_label: "Medicare Lead",
        scenario_type: "lead",
        scenario_label: "Medicare Lead",
        expected_rebuttals: JSON.stringify(["dont_remember", "not_interested"]),
      },
      "trainee",
    );

    expect(result.ok).toBe(true);
  });

  it("fails when required keys are missing", () => {
    const result = validateAssistantVariableContract(
      {
        difficulty: "D2",
        objectionsRequired: "3",
        rebuttals: "{}",
        session_key: "",
        org_id: "org_1",
        trainer_id: "",
      },
      "trainer",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingKeys).toEqual(expect.arrayContaining(["rebuttals", "session_key", "trainer_id"]));
    }
  });

  it("requires product and scenario keys for trainee payloads", () => {
    const result = validateAssistantVariableContract(
      {
        difficulty: "D2",
        objectionsRequired: "3",
        objection_sequence: JSON.stringify([{ order: 0, text: "First", rebuttalType: "busy" }]),
        rebuttals: JSON.stringify({ busy: "Sample" }),
        session_key: "sess_1",
        org_id: "org_1",
        trainer_id: "trainer_1",
        trainee_id: "trainee_1",
        trainee_name: "Sarah",
        expected_rebuttals: JSON.stringify(["busy"]),
      },
      "trainee",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingKeys).toEqual(
        expect.arrayContaining(["product_type", "product_label", "scenario_type", "scenario_label"]),
      );
    }
  });
});
