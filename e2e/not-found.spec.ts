import { test, expect, resetState } from "./fixtures";

test.describe("404 not-found page", () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page);
  });

  test("renders the 404 with a CTA back to /practice", async ({ page }) => {
    const res = await page.goto("/this-route-doesnt-exist");
    expect(res?.status()).toBe(404);
    await expect(
      page.getByText(/dead end in the architecture/i),
    ).toBeVisible();
    const backCta = page.getByRole("link", { name: /Back to practice/ });
    await expect(backCta).toBeVisible();
    await expect(backCta).toHaveAttribute("href", "/practice/system-design");
  });

  test("Back to practice link navigates to the practice index", async ({
    page,
  }) => {
    await page.goto("/this-route-doesnt-exist");
    await page.getByRole("link", { name: /Back to practice/ }).click();
    await expect(page).toHaveURL(/\/practice\/system-design$/);
  });
});
