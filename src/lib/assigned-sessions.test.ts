import {
  buildExpectedRebuttalsFromAssigned,
  buildRebuttalGuideMapForAssigned,
  normalizeAssignedObjections,
} from "@/lib/assigned-sessions";

describe("assigned session helpers", () => {
  it("preserves objection order as selected", () => {
    const objections = normalizeAssignedObjections([
      { text: "First objection", rebuttalType: "busy" },
      { text: "Second objection", rebuttalType: "send_info" },
    ]);

    expect(objections).toEqual([
      { order: 0, text: "First objection", rebuttalType: "busy" },
      { order: 1, text: "Second objection", rebuttalType: "send_info" },
    ]);
    expect(buildExpectedRebuttalsFromAssigned(objections)).toEqual(["busy", "send_info"]);
  });

  it("builds the rebuttal guide map for only selected objections", () => {
    const objections = normalizeAssignedObjections([
      { text: "First objection", rebuttalType: "busy" },
      { text: "Second objection", rebuttalType: "send_info" },
    ]);

    expect(
      buildRebuttalGuideMapForAssigned(objections, {
        busy: "Guide A",
        send_info: "Guide B",
        spouse: "Unused",
      }),
    ).toEqual({
      busy: "Guide A",
      send_info: "Guide B",
    });
  });
});

