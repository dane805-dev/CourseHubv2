"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { WAIVABLE_CORE_CODES } from "@/types/user";
import { getCoreRequirement } from "@/lib/data/requirements";
import type { WaiverConfig, WaiverType } from "@/types/user";

interface WaiverSelectorProps {
  selected: WaiverConfig[];
  onSelect: (waivers: WaiverConfig[]) => void;
}

const WAIVER_TYPE_LABELS: Record<WaiverType, string> = {
  full: "Full Waiver",
  half_credit: "Half-Credit Waiver",
  substitution: "Substitution",
};

export function WaiverSelector({ selected, onSelect }: WaiverSelectorProps) {
  function isWaived(coreCode: string): boolean {
    return selected.some((w) => w.coreCode === coreCode);
  }

  function getWaiverType(coreCode: string): WaiverType {
    return selected.find((w) => w.coreCode === coreCode)?.waiverType ?? "full";
  }

  function toggleWaiver(coreCode: string) {
    if (isWaived(coreCode)) {
      onSelect(selected.filter((w) => w.coreCode !== coreCode));
    } else {
      onSelect([
        ...selected,
        { coreCode, waiverType: "full", cuImpact: 0 },
      ]);
    }
  }

  function setWaiverType(coreCode: string, type: WaiverType) {
    onSelect(
      selected.map((w) =>
        w.coreCode === coreCode ? { ...w, waiverType: type } : w
      )
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select any core courses you have waived. This is optional.
      </p>
      {WAIVABLE_CORE_CODES.map((coreCode) => {
        const req = getCoreRequirement(coreCode);
        if (!req) return null;

        const waived = isWaived(coreCode);

        return (
          <div
            key={coreCode}
            className={`p-4 rounded-lg border space-y-3 ${
              waived ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={waived}
                onCheckedChange={() => toggleWaiver(coreCode)}
              />
              <div>
                <div className="font-medium text-sm">{req.core_name}</div>
                <div className="text-xs text-muted-foreground">
                  {req.credits_required} CU &middot; Courses: {req.courses.join(", ")}
                </div>
              </div>
            </label>

            {waived && (
              <div className="pl-8 space-y-2">
                <Label className="text-xs">Waiver Type</Label>
                <Select
                  value={getWaiverType(coreCode)}
                  onValueChange={(v) =>
                    setWaiverType(coreCode, v as WaiverType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WAIVER_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
