"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  KeyRound,
  Server,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-emerald-500" />
            Bring your own AI key
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Your key stays in your browser — we forward each request straight
            to your provider, never store, log, or proxy it.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "preset" | "custom")}
          className="gap-3"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preset" className="gap-1.5">
              <Sparkles className="size-3.5" />
              Quick start
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5">
              <Server className="size-3.5" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {selected?.label ?? "Pick a provider"}
                    </span>
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={4}
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-[260px]"
                >
                  {PRESETS.map((p) => {
                    const active = selected?.id === p.id;
                    return (
                      <DropdownMenuItem
                        key={p.id}
                        onSelect={() => choose(p)}
                        className="flex items-start justify-between gap-3 py-2"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            {p.label}
                          </span>
                          {p.costNote ? (
                            <span className="text-[11px] leading-snug text-muted-foreground">
                              {p.costNote}
                            </span>
                          ) : null}
                        </div>
                        {active ? (
                          <Check className="mt-1 size-3.5 shrink-0 text-emerald-500" />
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selected ? (
              <div className="space-y-3 pt-1">
                {!selected.keyless ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="api-key" className="text-xs">
                        API key
                      </Label>
                      {selected.keyUrl ? (
                        <a
                          href={selected.keyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          Get a key
                          <ExternalLink className="size-2.5" />
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
                      className="font-mono"
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                    No API key needed — make sure {selected.label} is running
                    locally before grading.
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="model" className="text-xs">
                    Model
                  </Label>
                  <Input
                    id="model"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder={selected.defaultModel}
                    spellCheck={false}
                    className="font-mono"
                  />
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="custom" className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="base" className="text-xs">
                Base URL
              </Label>
              <Input
                id="base"
                placeholder="https://api.example.com/v1"
                value={customBaseURL}
                onChange={(e) => setCustomBaseURL(e.target.value)}
                spellCheck={false}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Anything that speaks the OpenAI Chat Completions spec — vLLM,
                LiteLLM, your own gateway.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-key" className="text-xs">
                API key{" "}
                <span className="font-normal text-muted-foreground">
                  (skip for localhost)
                </span>
              </Label>
              <Input
                id="custom-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                placeholder="sk-..."
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-model" className="text-xs">
                Model
              </Label>
              <Input
                id="custom-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="gpt-4o-mini"
                className="font-mono"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 text-xs">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-3.5 rounded border-input accent-emerald-500"
          />
          <Label
            htmlFor="remember"
            className="cursor-pointer text-xs font-normal text-muted-foreground"
          >
            Remember on this device (otherwise clears when this tab closes)
          </Label>
        </div>

        {error ? (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between">
          {existing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onForget}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3.5" />
              Forget key
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={onSave}
            className="bg-emerald-500 px-5 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            Save & continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
