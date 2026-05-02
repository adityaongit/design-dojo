"use client";

import { Code2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { CodeLanguage } from "@/lib/code/seed";

const LABELS: Record<CodeLanguage, string> = {
  pseudocode: "Pseudocode",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
};
const ORDER: CodeLanguage[] = ["pseudocode", "typescript", "python", "java"];

export function CodeLanguagePicker({
  value,
  onChange,
}: {
  value: CodeLanguage;
  onChange: (v: CodeLanguage) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Code2 className="size-3.5" />
          {LABELS[value]}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {ORDER.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onSelect={() => onChange(lang)}
            className="text-sm"
          >
            {LABELS[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
