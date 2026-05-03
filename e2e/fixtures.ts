import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared e2e fixtures for DesignDojo.
 *
 * Every test starts with:
 *   - A non-localhost BYOK config seeded into localStorage. (Localhost
 *     baseURLs make the grader bypass `/api/grade` and call the LLM
 *     directly via TanStack AI — fetch interception wouldn't catch it.)
 *   - The "seen-keydialog" flag set so the BYOK prompt never blocks.
 *   - `/api/grade` and `/api/chat` mocked at the network layer with
 *     deterministic responses. Tests can override the verdict per call.
 *   - IndexedDB cleared so prior test runs don't leak progress in.
 */

type Feedback = {
  verdict: "great" | "good" | "needs-work";
  score: number;
  whatWentWell: string[];
  whatToImprove: string[];
};

type Fixtures = {
  /**
   * Configure the next `/api/grade` response. Call before triggering
   * Get Feedback. Defaults to a generic "good" verdict.
   */
  mockGrade: (feedback?: Partial<Feedback>) => Promise<void>;

  /**
   * Seed an IndexedDB session for a question, simulating prior progress.
   * Useful for testing Resume / Start Over flows without walking the
   * whole grader pipeline first.
   */
  seedSession: (args: {
    type: "system-design" | "low-level-design";
    questionId: string;
    stages: Record<
      string,
      Partial<{ answer: string; feedback: Feedback; skipped: boolean }>
    >;
    code?: string;
  }) => Promise<void>;
};

const DEFAULT_FEEDBACK: Feedback = {
  verdict: "good",
  score: 75,
  whatWentWell: ["Mocked: clear answer"],
  whatToImprove: ["Mocked: tighten the rubric"],
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    // Seed BYOK + mocked LLM endpoints BEFORE any page navigation. The
    // initScript runs on every document, so subsequent reloads keep
    // localStorage seeded (we re-seed) and the fetch mock active.
    await page.addInitScript(() => {
      const cfg = {
        label: "Mock",
        provider: "openai",
        baseURL: "https://api.openai.com",
        apiKey: "mock-key-not-real",
        model: "gpt-4-mock",
      };
      try {
        localStorage.setItem("designdojo:byok", JSON.stringify(cfg));
        localStorage.setItem("designdojo:seen-keydialog", "1");
      } catch {
        // Storage may be unavailable in some contexts — ignore.
      }
    });

    // Network-level mock for /api/grade. Tests can override via mockGrade
    // before the click; we read from a window-scoped slot that mockGrade
    // populates so the response is fresh per call.
    await page.route("**/api/grade", async (route) => {
      const next = await page.evaluate(() => {
        const w = window as unknown as { __nextGrade?: Feedback };
        const x = w.__nextGrade;
        delete w.__nextGrade;
        return x;
      });
      const feedback = next ?? DEFAULT_FEEDBACK;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ feedback }),
      });
    });

    // Mock /api/chat (clarifying questions stream). The runner uses
    // tanstack/ai to consume an SSE-like response; for tests we return a
    // simple text/event-stream body that closes immediately.
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          'data: {"type":"text","value":"(mock interviewer reply)"}\n\n' +
          "data: [DONE]\n\n",
      });
    });

    // Clear IndexedDB before every test by clearing on the first navigation.
    page.on("framenavigated", async (frame) => {
      if (frame !== page.mainFrame()) return;
      const url = frame.url();
      if (!url.startsWith("http")) return;
    });

    await use(page);
  },

  mockGrade: async ({ page }, use) => {
    await use(async (feedback) => {
      const merged: Feedback = { ...DEFAULT_FEEDBACK, ...(feedback ?? {}) };
      await page.evaluate((fb) => {
        (window as unknown as { __nextGrade: Feedback }).__nextGrade = fb;
      }, merged);
    });
  },

  seedSession: async ({ page }, use) => {
    await use(async ({ type, questionId, stages, code }) => {
      await page.evaluate(
        async ({ type, questionId, stages, code }) => {
          const conn: IDBDatabase = await new Promise((resolve, reject) => {
            const req = indexedDB.open("keyval-store");
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            req.onupgradeneeded = () =>
              req.result.createObjectStore("keyval");
          });
          const key = `session:${type}:${questionId}`;
          const tx = conn.transaction("keyval", "readwrite");
          const store = tx.objectStore("keyval");
          const existing: unknown = await new Promise((resolve) => {
            const r = store.get(key);
            r.onsuccess = () => resolve(r.result);
          });
          const now = Date.now();
          const seeded = {
            ...((existing as object) ?? {
              id: `${type}:${questionId}`,
              type,
              questionId,
              createdAt: now,
            }),
            stages: Object.fromEntries(
              Object.entries(stages).map(([slug, st]) => [
                slug,
                { answer: "", updatedAt: now, ...st },
              ]),
            ),
            ...(code ? { code, codeLanguage: "pseudocode" } : {}),
            updatedAt: now,
          };
          await new Promise((resolve, reject) => {
            const r = store.put(seeded, key);
            r.onsuccess = () => resolve(undefined);
            r.onerror = () => reject(r.error);
          });
          conn.close();
        },
        { type, questionId, stages, code },
      );
    });
  },
});

export { expect };

/**
 * Wipe IDB + storage. Call from beforeEach to start clean. We do this in
 * a goto-then-evaluate dance because IDB is per-origin: we have to be on
 * the app's origin first.
 */
export async function resetState(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(async () => {
    try {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map(
          (db) =>
            db.name &&
            new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(db.name!);
              req.onsuccess = req.onerror = req.onblocked = () => resolve();
            }),
        ),
      );
    } catch {
      // Older browsers — ignore.
    }
    localStorage.clear();
    sessionStorage.clear();
  });
}
