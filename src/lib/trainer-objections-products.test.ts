import { getDefaultObjectionLibraryForProduct, getDefaultRebuttalGuidesForProduct } from "@/lib/trainer-objections";

describe("product objection defaults", () => {
  it("keeps life objections at D1-D5", () => {
    const library = getDefaultObjectionLibraryForProduct("life");

    expect(Object.keys(library)).toEqual(["D1", "D2", "D3", "D4", "D5"]);
    expect(library.D5.length).toBeGreaterThan(0);
  });

  it("adds Medicare Lead defaults for D1-D3", () => {
    const library = getDefaultObjectionLibraryForProduct("medicare_lead");
    const guides = getDefaultRebuttalGuidesForProduct("medicare_lead");

    expect(library.D1[0].text).toContain("Medicare");
    expect(library.D3.length).toBeGreaterThan(0);
    expect(library.D4).toEqual([]);
    expect(guides.medicare_plan_confusion).toContain("plan");
  });

  it("adds Medicare Event defaults for D1-D3", () => {
    const library = getDefaultObjectionLibraryForProduct("medicare_event");
    const guides = getDefaultRebuttalGuidesForProduct("medicare_event");

    expect(library.D1[0].text).toContain("event");
    expect(library.D3.length).toBeGreaterThan(0);
    expect(library.D5).toEqual([]);
    expect(guides.medicare_event_trust).toContain("event");
  });
});
