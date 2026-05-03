"use client";

import { createContext, useContext, useState } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type {
  ClarifyMessage,
  Session,
  StageState,
  TutorMessage,
} from "@/lib/storage/sessions";
import type { QuestionType } from "@/lib/content/schema";

export type PanelBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SessionState = {
  // identity
  type: QuestionType;
  questionId: string;

  // hydration
  hydrated: boolean;

  // stage answers + feedback
  stages: Record<string, StageState>;

  // chat surfaces (per-question)
  clarify: ClarifyMessage[];
  tutor: TutorMessage[];

  // workspace gating
  started: boolean;
  hasProgress: boolean;
  isGrading: boolean;

  // tutor panel UI
  tutorOpen: boolean;
  tutorBounds: PanelBounds | null;

  // actions
  hydrateFromSession: (s: Session | undefined) => void;
  patchStage: (slug: string, patch: Partial<StageState>) => void;
  resetStages: () => void;

  appendClarify: (msgs: ClarifyMessage[]) => void;
  setClarify: (msgs: ClarifyMessage[]) => void;

  appendTutor: (msgs: TutorMessage[]) => void;
  setTutor: (msgs: TutorMessage[]) => void;
  resetTutor: () => void;

  setStarted: (started: boolean) => void;
  setHasProgress: (hasProgress: boolean) => void;
  setIsGrading: (isGrading: boolean) => void;

  setTutorOpen: (open: boolean) => void;
  setTutorBounds: (bounds: PanelBounds) => void;
};

export type SessionStoreInit = {
  type: QuestionType;
  questionId: string;
};

export type SessionStore = StoreApi<SessionState>;

export function createSessionStore(init: SessionStoreInit): SessionStore {
  return createStore<SessionState>()((set) => ({
    type: init.type,
    questionId: init.questionId,
    hydrated: false,

    stages: {},
    clarify: [],
    tutor: [],

    started: false,
    hasProgress: false,
    isGrading: false,

    tutorOpen: false,
    tutorBounds: null,

    hydrateFromSession: (s) =>
      set({
        stages: s?.stages ?? {},
        clarify: s?.clarifications ?? [],
        tutor: s?.tutor ?? [],
        tutorBounds: s?.tutorBounds ?? null,
        hasProgress: hasAnyProgress(s?.stages),
        hydrated: true,
      }),

    patchStage: (slug, patch) =>
      set((state) => {
        const prev = state.stages[slug] ?? { answer: "", updatedAt: Date.now() };
        const stages = {
          ...state.stages,
          [slug]: { ...prev, ...patch, updatedAt: Date.now() },
        };
        return { stages, hasProgress: hasAnyProgress(stages) };
      }),

    resetStages: () => set({ stages: {}, hasProgress: false }),

    appendClarify: (msgs) =>
      set((state) => ({ clarify: [...state.clarify, ...msgs] })),
    setClarify: (msgs) => set({ clarify: msgs }),

    appendTutor: (msgs) =>
      set((state) => ({ tutor: [...state.tutor, ...msgs] })),
    setTutor: (msgs) => set({ tutor: msgs }),
    resetTutor: () => set({ tutor: [] }),

    setStarted: (started) => set({ started }),
    setHasProgress: (hasProgress) => set({ hasProgress }),
    setIsGrading: (isGrading) => set({ isGrading }),

    setTutorOpen: (open) => set({ tutorOpen: open }),
    setTutorBounds: (bounds) => set({ tutorBounds: bounds }),
  }));
}

function hasAnyProgress(stages: Record<string, StageState> | undefined): boolean {
  if (!stages) return false;
  return Object.values(stages).some(
    (s) => s?.feedback || s?.skipped || (s?.answer?.trim().length ?? 0) > 0,
  );
}

const SessionStoreCtx = createContext<SessionStore | null>(null);

export function SessionStoreProvider({
  init,
  children,
}: {
  init: SessionStoreInit;
  children: React.ReactNode;
}) {
  // Recreate the store when the question identity changes so we don't leak
  // state across navigations. Lazy useState ensures the factory runs once
  // per identity; the route's [id] segment remounts this provider on nav,
  // so we don't need explicit identity tracking here.
  const [store] = useState(() => createSessionStore(init));
  return (
    <SessionStoreCtx.Provider value={store}>
      {children}
    </SessionStoreCtx.Provider>
  );
}

export function useSessionStoreApi(): SessionStore {
  const store = useContext(SessionStoreCtx);
  if (!store) {
    throw new Error("useSessionStore must be used inside <SessionStoreProvider>");
  }
  return store;
}

export function useSessionStore<T>(selector: (state: SessionState) => T): T {
  const store = useSessionStoreApi();
  return useStore(store, selector);
}

/**
 * Subscribe to store changes outside React (for IndexedDB persistence).
 * Returns the unsubscribe function.
 */
export function subscribeSession(
  store: SessionStore,
  listener: (state: SessionState, prev: SessionState) => void,
) {
  return store.subscribe(listener);
}

