"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MAJOR_OPTIONS, MAJOR_EXCLUSIONS, MKOP_EXCLUSIONS } from "@/types/user";
import type { MajorCode } from "@/types/user";

interface MajorSelectorProps {
  selected: MajorCode[];
  onSelect: (majors: MajorCode[]) => void;
}

export function MajorSelector({ selected, onSelect }: MajorSelectorProps) {
  function isExcluded(code: MajorCode): boolean {
    // Check pair exclusions
    for (const [a, b] of MAJOR_EXCLUSIONS) {
      if (code === a && selected.includes(b)) return true;
      if (code === b && selected.includes(a)) return true;
    }
    // Check MKOP exclusions
    if (code === "MKOP" && selected.some((s) => MKOP_EXCLUSIONS.includes(s))) return true;
    if (MKOP_EXCLUSIONS.includes(code) && selected.includes("MKOP")) return true;

    return false;
  }

  function toggleMajor(code: MajorCode) {
    if (selected.includes(code)) {
      onSelect(selected.filter((m) => m !== code));
    } else if (selected.length < 3 && !isExcluded(code)) {
      onSelect([...selected, code]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-muted-foreground">
          Selected: {selected.length}/3
        </span>
        {selected.map((code) => (
          <Badge key={code} variant="secondary">
            {code}
          </Badge>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
        {MAJOR_OPTIONS.map((major) => {
          const excluded = isExcluded(major.code);
          const checked = selected.includes(major.code);
          const disabled = (!checked && selected.length >= 3) || excluded;

          return (
            <label
              key={major.code}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                checked
                  ? "border-primary bg-primary/5"
                  : excluded
                    ? "border-border opacity-40 cursor-not-allowed"
                    : disabled
                      ? "border-border opacity-60 cursor-not-allowed"
                      : "border-border hover:border-muted-foreground"
              }`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleMajor(major.code)}
                disabled={disabled}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{major.name}</div>
                <div className="text-xs text-muted-foreground">{major.code}</div>
              </div>
              {excluded && (
                <span className="text-xs text-destructive">
                  Excluded
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
