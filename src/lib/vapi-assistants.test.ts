import { resolveLifeAssistantId, resolveTrainingAssistantId } from "@/lib/vapi-assistants";

describe("resolveLifeAssistantId", () => {
  it("resolves each configured difficulty assistant", () => {
    const env = {
      VAPI_ASSISTANT_D1_LIFE_ID: "assistant_d1",
      VAPI_ASSISTANT_D2_LIFE_ID: "assistant_d2",
      VAPI_ASSISTANT_D3_LIFE_ID: "assistant_d3",
      VAPI_ASSISTANT_D4_LIFE_ID: "assistant_d4",
      VAPI_ASSISTANT_D5_LIFE_ID: "assistant_d5",
    };

    expect(resolveLifeAssistantId("D1", env)).toBe("assistant_d1");
    expect(resolveLifeAssistantId("D2", env)).toBe("assistant_d2");
    expect(resolveLifeAssistantId("D3", env)).toBe("assistant_d3");
    expect(resolveLifeAssistantId("D4", env)).toBe("assistant_d4");
    expect(resolveLifeAssistantId("D5", env)).toBe("assistant_d5");
  });

  it("uses the legacy D4 key as a fallback", () => {
    expect(resolveLifeAssistantId("D4", { VAPI_ASSSISTANT_D4_LIFE_ID: "legacy_d4" })).toBe("legacy_d4");
  });

  it("throws when a difficulty is missing", () => {
    expect(() => resolveLifeAssistantId("D3", {})).toThrow("Missing assistant ID for D3");
  });
});

describe("resolveTrainingAssistantId", () => {
  it("resolves Life, Medicare Lead, and Medicare Event assistants by product and difficulty", () => {
    const env = {
      VAPI_ASSISTANT_D1_LIFE_ID: "life_d1",
      VAPI_ASSISTANT_D5_LIFE_ID: "life_d5",
      VAPI_ASSISTANT_D1_MEDICARE_LEAD_ID: "medicare_lead_d1",
      VAPI_ASSISTANT_D3_MEDICARE_LEAD_ID: "medicare_lead_d3",
      VAPI_ASSISTANT_D1_MEDICARE_EVENT_ID: "medicare_event_d1",
      VAPI_ASSISTANT_D3_MEDICARE_EVENT_ID: "medicare_event_d3",
    };

    expect(resolveTrainingAssistantId("life", "D1", env)).toBe("life_d1");
    expect(resolveTrainingAssistantId("life", "D5", env)).toBe("life_d5");
    expect(resolveTrainingAssistantId("medicare_lead", "D1", env)).toBe("medicare_lead_d1");
    expect(resolveTrainingAssistantId("medicare_lead", "D3", env)).toBe("medicare_lead_d3");
    expect(resolveTrainingAssistantId("medicare_event", "D1", env)).toBe("medicare_event_d1");
    expect(resolveTrainingAssistantId("medicare_event", "D3", env)).toBe("medicare_event_d3");
  });

  it("rejects Medicare difficulties above D3", () => {
    expect(() =>
      resolveTrainingAssistantId("medicare_lead", "D4", {
        VAPI_ASSISTANT_D4_MEDICARE_LEAD_ID: "unsupported",
      }),
    ).toThrow("Unsupported difficulty D4 for Medicare Lead");
  });
});

