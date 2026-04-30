import { expect, test } from "@playwright/test";

test.describe("Hausbuch happy path", () => {
  test.beforeEach(async ({ context }) => {
    // Start each test from a clean storage so seeds re-run
    await context.clearCookies();
  });

  test("redirects root to current month and renders the page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/m\/\d{4}-\d{2}/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("create a new entry with math expression and see it appear", async ({ page }) => {
    await page.goto("/");
    // Open the new-entry sheet via the FAB
    await page.getByRole("button", { name: "New entry" }).click();

    // Type a math expression in the amount field
    const amount = page.getByRole("textbox", { name: "Amount" });
    await amount.fill("12.40 + 8.30 + 5.50");

    // The rust pill should show the resolved amount
    await expect(page.getByText(/=.*26,20/)).toBeVisible();

    // Pick the Cafe category
    await page.getByRole("button", { name: "Cafe" }).click();

    // Save
    await page.getByRole("button", { name: "Save entry" }).click();

    // The entry should appear in the entries list (formatted by de-DE)
    await expect(
      page
        .locator("li")
        .filter({ hasText: /26,20\s*€/ })
        .first(),
    ).toBeVisible();
  });

  test("keyboard shortcuts navigate months", async ({ page }) => {
    await page.goto("/");
    const initial = page.url();
    await page.keyboard.press("j");
    await expect(page).not.toHaveURL(initial);
    await page.keyboard.press("k");
    await expect(page).toHaveURL(initial);
  });
});
