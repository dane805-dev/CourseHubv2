"use client";

import type { CULoadPreference } from "@/types/user";

interface LoadPreferenceProps {
  value: CULoadPreference;
  onChange: (value: CULoadPreference) => void;
}

const OPTIONS: { value: CULoadPreference; label: string; description: string; cu: string }[] = [
  {
    value: "light",
    label: "Light",
    description: "Fewer courses per quarter, more time for extracurriculars",
    cu: "~2.0 CU/quarter",
  },
  {
    value: "normal",
    label: "Normal",
    description: "Standard course load for most students",
    cu: "~2.5 CU/quarter",
  },
  {
    value: "heavy",
    label: "Heavy",
    description: "More courses per quarter, faster degree completion",
    cu: "~3.0 CU/quarter",
  },
];

export function LoadPreference({ value, onChange }: LoadPreferenceProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose your preferred credit load per quarter. You can adjust individual quarters later.
      </p>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`w-full text-left p-4 rounded-lg border transition-colors ${
            value === opt.value
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{opt.label}</div>
              <div className="text-sm text-muted-foreground">
                {opt.description}
              </div>
            </div>
            <div className="text-sm text-muted-foreground font-mono">
              {opt.cu}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
