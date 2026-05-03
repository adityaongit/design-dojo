import { test, expect, resetState } from "./fixtures";

test.describe("resume + start over", () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page);
  });

  test("revisiting a question with progress shows Resume / Start over gate", async ({
    page,
    seedSession,
  }) => {
    await seedSession({
      type: "system-design",
      questionId: "bitly",
      stages: {
        "functional-requirements": {
          answer: "x",
          feedback: {
            verdict: "good",
            score: 70,
            whatWentWell: [],
            whatToImprove: [],
          },
        },
      },
    });

    await page.goto("/practice/system-design/bitly");
    await expect(
      page.getByRole("heading", { name: /Welcome back to Bitly/ }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Start over/ }),
    ).toBeVisible();
  });

  test("Resume + Next stage does NOT bring the gate back (regression for the navigation-clobber bug)", async ({
    page,
    seedSession,
  }) => {
    await seedSession({
      type: "system-design",
      questionId: "bitly",
      stages: {
        "functional-requirements": {
          answer: "x",
          feedback: {
            verdict: "good",
            score: 70,
            whatWentWell: [],
            whatToImprove: [],
          },
        },
      },
    });

    await page.goto("/practice/system-design/bitly");
    await page.getByRole("button", { name: "Resume" }).click();
    // Currently in feedback view for Functional Requirements. The "Next stage"
    // text-button inside the feedback footer (not the chevron in the header).
    await page.locator("aside").getByRole("button", { name: "Next stage" }).click();
    // We're on stage 2 — the gate must NOT reappear.
    await expect(
      page.getByRole("heading", { name: /Welcome back/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: /What are the non-functional requirements/i,
      }),
    ).toBeVisible();
  });

  test("Start over wipes the session and returns to fresh Start", async ({
    page,
    seedSession,
  }) => {
    await seedSession({
      type: "system-design",
      questionId: "bitly",
      stages: {
        "functional-requirements": {
          answer: "x",
          feedback: {
            verdict: "good",
            score: 70,
            whatWentWell: [],
            whatToImprove: [],
          },
        },
      },
    });

    await page.goto("/practice/system-design/bitly");
    await page.getByRole("button", { name: /Start over/ }).click();

    // Fresh Start gate (not Welcome back).
    await expect(
      page.getByRole("heading", { name: /Ready to design Bitly\?/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Welcome back/ }),
    ).toHaveCount(0);

    // IDB session should have been deleted.
    const stages = await page.evaluate(async () => {
      const conn: IDBDatabase = await new Promise((r, j) => {
        const q = indexedDB.open("keyval-store");
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
      const tx = conn.transaction("keyval", "readonly");
      const data: unknown = await new Promise((r) => {
        const q = tx
          .objectStore("keyval")
          .get("session:system-design:bitly");
        q.onsuccess = () => r(q.result);
      });
      conn.close();
      const stages = (data as { stages?: object } | undefined)?.stages;
      return stages ? Object.keys(stages) : [];
    });
    expect(stages).toEqual([]);
  });

  test("LLD with no progress jumps straight in (no gate)", async ({ page }) => {
    await page.goto("/practice/low-level-design/connect-four");
    await expect(
      page.getByRole("heading", { name: /Welcome back/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Ready to design/ }),
    ).toHaveCount(0);
    // Code editor should be visible.
    await expect(page.locator(".monaco-editor")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("LLD with progress shows the resume gate", async ({
    page,
    seedSession,
  }) => {
    await seedSession({
      type: "low-level-design",
      questionId: "connect-four",
      stages: {
        requirements: { answer: "two players, 7x6 grid, 4 in a row" },
      },
      code: "// REQUIREMENTS\n\ntwo players, 7x6 grid, 4 in a row\n\n// ENTITIES & RELATIONSHIPS\n\n",
    });
    await page.goto("/practice/low-level-design/connect-four");
    await expect(
      page.getByRole("heading", { name: /Welcome back to Connect Four/ }),
    ).toBeVisible();
  });
});
