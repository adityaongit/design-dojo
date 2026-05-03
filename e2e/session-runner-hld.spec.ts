import { test, expect, resetState } from "./fixtures";

test.describe("HLD session — Bitly", () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page);
  });

  test("fresh entry shows Start gate, then stage 1 panel", async ({ page }) => {
    await page.goto("/practice/system-design/bitly");
    await expect(
      page.getByRole("heading", { name: /Ready to design Bitly\?/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start", exact: true }).click();

    await expect(
      page.getByRole("heading", {
        name: /What are the core functional requirements/,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Stage 1 of\s+8/)).toBeVisible();
  });

  test("hint reveal is progressive and Hide collapses all back", async ({
    page,
  }) => {
    await page.goto("/practice/system-design/bitly");
    await page.getByRole("button", { name: "Start", exact: true }).click();

    const reveal1 = page.getByRole("button", { name: /Reveal hint 1 of/ });
    await expect(reveal1).toBeVisible();
    await reveal1.click();

    // After reveal, "Hint 1" label appears + Hide button + a "reveal hint 2" CTA.
    await expect(page.getByText("HINT", { exact: false }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Reveal hint 2 of/ }),
    ).toBeVisible();
    const hide = page.getByRole("button", { name: /Hide all hints/i });
    await expect(hide).toBeVisible();

    // Reveal hint 2, then Hide all → back to locked CTA.
    await page.getByRole("button", { name: /Reveal hint 2 of/ }).click();
    await expect(
      page.getByRole("button", { name: /Reveal hint 3 of/ }),
    ).toBeVisible();
    await hide.click();
    await expect(
      page.getByRole("button", { name: /Stuck\? Reveal hint 1 of/ }),
    ).toBeVisible();
  });

  test("sample answer toggle reveals + hides", async ({ page }) => {
    await page.goto("/practice/system-design/bitly");
    await page.getByRole("button", { name: "Start", exact: true }).click();

    const reveal = page.getByRole("button", { name: /Reveal sample answer/ });
    await reveal.click();
    await expect(
      page.getByRole("button", { name: /Hide sample answer/ }),
    ).toBeVisible();
    // Scope to the panel so we don't collide with the "Hide sample answer" button text.
    await expect(
      page.locator("aside").getByText(/Sample answer/i).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: /Hide sample answer/ }).click();
    await expect(reveal).toBeVisible();
  });

  test("dot nav advances stage and Previous/Next stage buttons work", async ({
    page,
  }) => {
    await page.goto("/practice/system-design/bitly");
    await page.getByRole("button", { name: "Start", exact: true }).click();

    // Click dot 3 → Core Entities.
    await page.getByRole("button", { name: /^3\. Core Entities$/ }).click();
    await expect(page).toHaveURL(/q=core-entities/);
    await expect(
      page.getByRole("heading", { name: /core entities/i }),
    ).toBeVisible();

    // Previous should disable nothing (we're at index 2). Click it twice.
    await page.getByRole("button", { name: "Previous stage" }).click();
    await expect(page).toHaveURL(/q=non-functional-requirements/);
    await page.getByRole("button", { name: "Previous stage" }).click();
    await expect(page).toHaveURL(/q=functional-requirements/);
    await expect(
      page.getByRole("button", { name: "Previous stage" }),
    ).toBeDisabled();

    // Next stage should work too.
    await page.getByRole("button", { name: "Next stage" }).click();
    await expect(page).toHaveURL(/q=non-functional-requirements/);
  });

  test("Get Feedback on a stage with no answer toasts and skips grading", async ({
    page,
  }) => {
    // The HLD canvas-based answer extraction can't easily be exercised via
    // Playwright (Excalidraw is canvas-rendered and clicking text mode +
    // typing requires hairy native events). The deep-dive variant of this
    // path is covered in deep-dives-and-report.spec.ts via the textarea.
    let graded = 0;
    await page.route("**/api/grade", async (route) => {
      graded++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          feedback: { verdict: "good", score: 70, whatWentWell: [], whatToImprove: [] },
        }),
      });
    });

    await page.goto("/practice/system-design/bitly");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.getByRole("button", { name: /Get Feedback/ }).click();
    await expect(
      page.getByText(/Type your answer in the highlighted block/),
    ).toBeVisible();
    expect(graded).toBe(0);
  });

});
