import {
  DEFAULT_OBJECTION_LIBRARY,
  selectRandomObjectionsForDifficulty,
} from "@/lib/trainer-objections";

describe("selectRandomObjectionsForDifficulty", () => {
  it("uses the approved count ranges by difficulty", () => {
    const low = () => 0;
    const high = () => 0.999;

    expect(selectRandomObjectionsForDifficulty(DEFAULT_OBJECTION_LIBRARY, "D1", low)).toHaveLength(1);
    expect(selectRandomObjectionsForDifficulty(DEFAULT_OBJECTION_LIBRARY, "D1", high)).toHaveLength(2);
    expect(selectRandomObjectionsForDifficulty(DEFAULT_OBJECTION_LIBRARY, "D2", low)).toHaveLength(2);
    expect(selectRandomObjectionsForDifficulty(DEFAULT_OBJECTION_LIBRARY, "D2", high)).toHaveLength(3);
    expect(selectRandomObjectionsForDifficulty(DEFAULT_OBJECTION_LIBRARY, "D4", low)).toHaveLength(3);
    expect(selectRandomObjectionsForDifficulty(DEFAULT_OBJECTION_LIBRARY, "D4", high)).toHaveLength(4);
    expect(selectRandomObjectionsForDifficulty(DEFAULT_OBJECTION_LIBRARY, "D5", high)).toHaveLength(4);
  });

  it("caps the random count to the available objection pool", () => {
    const selected = selectRandomObjectionsForDifficulty(
      {
        ...DEFAULT_OBJECTION_LIBRARY,
        D5: [{ text: "Only one", rebuttalType: "busy", frequency: "Common" }],
      },
      "D5",
      () => 0.999,
    );

    expect(selected).toEqual([{ order: 0, text: "Only one", rebuttalType: "busy" }]);
  });
});
