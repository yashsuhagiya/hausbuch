// Domain helpers for Entry shaping. Pure; no store or React deps.

import type { Category } from "./types";

/**
 * Apply the sign convention: income categories are positive, expense
 * categories are negative. Callers pass the unsigned absolute amount in
 * cents; the sign comes from the resolved category.
 *
 * If the category is missing (deleted, not yet hydrated), defaults to
 * expense. UI should typically guard against missing-category state
 * before reaching here, but the default keeps things safe rather than
 * leaving an entry with the wrong sign.
 */
export function signAmount(absCents: number, category: Category | undefined): number {
  const sign = category?.kind === "income" ? 1 : -1;
  return absCents * sign;
}
