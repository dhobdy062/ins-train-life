import {
  getAllowedDifficultiesForProduct,
  getDefaultProductType,
  getProductLabels,
  isProductDifficultyAllowed,
  isTrainingProductType,
  normalizeTrainingProductTypes,
} from "@/lib/training-products";

describe("training products", () => {
  it("defines the trainer-selectable product labels", () => {
    expect(getProductLabels()).toEqual({
      life: "Life Lead",
      medicare_lead: "Medicare Lead",
      medicare_event: "Medicare Event",
    });
  });

  it("limits Medicare products to D1-D3 and keeps Life at D1-D5", () => {
    expect(getAllowedDifficultiesForProduct("life")).toEqual(["D1", "D2", "D3", "D4", "D5"]);
    expect(getAllowedDifficultiesForProduct("medicare_lead")).toEqual(["D1", "D2", "D3"]);
    expect(getAllowedDifficultiesForProduct("medicare_event")).toEqual(["D1", "D2", "D3"]);
    expect(isProductDifficultyAllowed("medicare_lead", "D4")).toBe(false);
    expect(isProductDifficultyAllowed("medicare_event", "D5")).toBe(false);
  });

  it("defaults unknown or missing product values to life", () => {
    expect(getDefaultProductType()).toBe("life");
    expect(isTrainingProductType("medicare_lead")).toBe(true);
    expect(isTrainingProductType("medical_lead")).toBe(false);
    expect(normalizeTrainingProductTypes(["life", "medicare_lead", "life"])).toEqual(["life", "medicare_lead"]);
    expect(normalizeTrainingProductTypes(undefined)).toEqual(["life"]);
  });
});
