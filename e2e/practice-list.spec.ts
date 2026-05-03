import { test, expect, resetState } from "./fixtures";

test.describe("practice list", () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page);
  });

  test("system-design list shows ready and soon questions", async ({ page }) => {
    await page.goto("/practice/system-design");
    await expect(
      page.getByRole("heading", { name: "System Design Guided Practice" }),
    ).toBeVisible();
    // Bitly is ready → has a Start link to the runner.
    const bitlyStart = page
      .getByRole("link", { name: "Start", exact: true })
      .first();
    await expect(bitlyStart).toBeVisible();
    await expect(bitlyStart).toHaveAttribute(
      "href",
      "/practice/system-design/bitly",
    );
  });

  test("low-level-design list links to connect-four", async ({ page }) => {
    await page.goto("/practice/low-level-design");
    const start = page.getByRole("link", { name: "Start", exact: true }).first();
    await expect(start).toHaveAttribute(
      "href",
      "/practice/low-level-design/connect-four",
    );
  });

  test("404 page renders for unknown question id", async ({ page }) => {
    const res = await page.goto("/practice/system-design/not-a-real-thing");
    expect(res?.status()).toBe(404);
    await expect(
      page.getByText(/dead end in the architecture/i),
    ).toBeVisible();
  });
});
