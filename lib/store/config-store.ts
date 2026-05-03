"use client";

import { create } from "zustand";
import type { ByokConfig } from "@/lib/ai/types";
import { clearConfig as clearStored, loadConfig, saveConfig } from "@/lib/storage/keys";

type ConfigState = {
  byok: ByokConfig | null;
  hydrated: boolean;
  keyDialogOpen: boolean;

  hydrate: () => void;
  setByok: (cfg: ByokConfig | null, opts?: { remember?: boolean }) => void;
  clearByok: () => void;
  openKeyDialog: () => void;
  closeKeyDialog: () => void;
  setKeyDialogOpen: (open: boolean) => void;
};

export const useConfigStore = create<ConfigState>((set) => ({
  byok: null,
  hydrated: false,
  keyDialogOpen: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    set({ byok: loadConfig(), hydrated: true });
  },

  setByok: (cfg, opts) => {
    if (cfg && opts?.remember !== undefined) {
      saveConfig(cfg, opts.remember);
    }
    set({ byok: cfg });
  },

  clearByok: () => {
    clearStored();
    set({ byok: null });
  },

  openKeyDialog: () => set({ keyDialogOpen: true }),
  closeKeyDialog: () => set({ keyDialogOpen: false }),
  setKeyDialogOpen: (open) => set({ keyDialogOpen: open }),
}));
