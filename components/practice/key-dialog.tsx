"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, Server, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  PRESETS,
  isLocalhost,
  type ByokConfig,
  type ByokPreset,
} from "@/lib/ai/types";
import { clearConfig, loadConfig, saveConfig } from "@/lib/storage/keys";

export function KeyDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: (cfg: ByokConfig) => void;
}) {
  const [tab, setTab] = useState<"preset" | "custom">("preset");
  const [selected, setSelected] = useState<ByokPreset | null>(PRESETS[0]);
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [customBaseURL, setCustomBaseURL] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<ByokConfig | null>(null);

  useEffect(() => {
    if (open) {
      const cfg = loadConfig();
      setExisting(cfg);
      if (cfg) {
        setApiKey(cfg.apiKey);
        setModelId(cfg.modelId);
        setCustomBaseURL(cfg.baseURL);
        const matched = PRESETS.find(
          (p) => p.baseURL === cfg.baseURL && p.mode === cfg.mode,
        );
        if (matched) {
          setSelected(matched);
          setTab("preset");
        } else {
          setTab("custom");
        }
      } else {
        setApiKey("");
        setModelId(PRESETS[0].defaultModel);
      }
      setError(null);
    }
  }, [open]);

  const choose = (p: ByokPreset) => {
    setSelected(p);
    setModelId(p.defaultModel);
    if (p.keyless) setApiKey("");
  };

  const onSave = () => {
    setError(null);
    let cfg: ByokConfig;
    if (tab === "preset") {
      if (!selected) {
        setError("Pick a provider.");
        return;
      }
      if (!selected.keyless && !apiKey.trim()) {
        setError("API key required for this provider.");
        return;
      }
      cfg = {
        mode: selected.mode,
        baseURL: selected.baseURL,
        apiKey: apiKey.trim(),
        modelId: modelId.trim() || selected.defaultModel,
        label: selected.label,
      };
    } else {
      if (!customBaseURL.trim()) {
        setError("Base URL required.");
        return;
      }
      const localOnly = isLocalhost(customBaseURL);
      if (!localOnly && !apiKey.trim()) {
        setError("API key required for non-local endpoints.");
        return;
      }
      cfg = {
        mode: "openai-compatible",
        baseURL: customBaseURL.trim().replace(/\/$/, ""),
        apiKey: apiKey.trim(),
        modelId: modelId.trim() || "gpt-4o-mini",
        label: "Custom",
      };
    }
    saveConfig(cfg, remember);
    onSaved?.(cfg);
    onOpenChange(false);
  };

  const onForget = () => {
    clearConfig();
    setExisting(null);
    setApiKey("");
    setModelId("");
    setCustomBaseURL("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Bring your own AI key
          </DialogTitle>
          <DialogDescription>
            Your key stays in your browser. We forward it once per grade
            request to the provider you pick — never store, log, or proxy it
            elsewhere.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "preset" | "custom")}>
          <TabsList>
            <TabsTrigger value="preset">
              <Sparkles className="size-3.5" />
              Quick start
            </TabsTrigger>
            <TabsTrigger value="custom">
              <Server className="size-3.5" />
              Custom OpenAI-compatible
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="space-y-4">
            <ul className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const active = selected?.id === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => choose(p)}
                      className={cn(
                        "w-full rounded-md border p-3 text-left text-xs transition-all",
                        active
                          ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                          : "border-border/60 hover:border-border bg-card/30",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{p.label}</span>
                        {active ? (
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                        ) : null}
                      </div>
                      {p.costNote ? (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {p.costNote}
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            {selected ? (
              <div className="space-y-3 rounded-md border border-border/60 bg-card/30 p-3">
                {!selected.keyless ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="api-key">API key</Label>
                      {selected.keyUrl ? (
                        <a
                          href={selected.keyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-500 hover:underline"
                        >
                          Get a key
                          <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                    No API key needed — make sure {selected.label} is running
                    locally first.
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder={selected.defaultModel}
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="custom" className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="base">Base URL (OpenAI-compatible)</Label>
              <Input
                id="base"
                placeholder="https://api.example.com/v1"
                value={customBaseURL}
                onChange={(e) => setCustomBaseURL(e.target.value)}
                spellCheck={false}
              />
              <p className="text-[11px] text-muted-foreground">
                Anything that speaks the OpenAI Chat Completions spec — vLLM,
                LiteLLM proxy, your own gateway, etc.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="custom-key">API key (skip for localhost)</Label>
                <Input
                  id="custom-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-model">Model id</Label>
                <Input
                  id="custom-model"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-3.5 accent-emerald-500"
          />
          Remember on this device (otherwise key clears when the tab closes)
        </label>

        {error ? (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
          {existing ? (
            <Button variant="ghost" size="sm" onClick={onForget}>
              <Trash2 className="size-3.5" />
              Forget key
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={onSave}>Save & continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
