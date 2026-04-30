import type { ID } from "./types";

/** Splitwise category label → Hausbuch category ID. Unknown → "cat-other". */
export const SPLITWISE_TO_HAUSBUCH: Record<string, ID> = {
  Groceries: "cat-groceries",
  "Dining out": "cat-dining",
  General: "cat-other",
  Plane: "cat-other",
  Hotel: "cat-other",
  Parking: "cat-transit",
  "Gas/fuel": "cat-transit",
  "Bus/train": "cat-transit",
  Taxi: "cat-transit",
  "Transportation - Other": "cat-transit",
  Liquor: "cat-other",
  Movies: "cat-other",
  Sports: "cat-other",
  Water: "cat-other",
  Furniture: "cat-other",
  Clothing: "cat-other",
  "Household supplies": "cat-other",
  "TV/Phone/Internet": "cat-utilities",
  Gifts: "cat-other",
  "Entertainment - Other": "cat-other",
  Car: "cat-transit",
  Rent: "cat-housing",
  // "Payment" is handled at filter time — those rows are skipped, not categorized.
};

export function mapSplitwiseCategory(label: string): ID {
  return SPLITWISE_TO_HAUSBUCH[label] ?? "cat-other";
}
