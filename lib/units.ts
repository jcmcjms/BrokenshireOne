export const MENU_UNITS = [
  { value: "serving", label: "Serving" },
  { value: "piece", label: "Piece" },
  { value: "pack", label: "Pack" },
  { value: "bottle", label: "Bottle" },
  { value: "can", label: "Can" },
  { value: "cup", label: "Cup" },
  { value: "glass", label: "Glass" },
  { value: "slice", label: "Slice" },
  { value: "bowl", label: "Bowl" },
  { value: "plate", label: "Plate" },
] as const;

export type MenuUnit = (typeof MENU_UNITS)[number]["value"];

export const CATEGORY_DEFAULT_UNIT: Record<string, MenuUnit> = {
  Meals: "serving",
  Snacks: "piece",
  Beverages: "bottle",
  Desserts: "slice",
};
