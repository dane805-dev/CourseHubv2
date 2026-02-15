"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getWaivableCoreRequirements } from "@/lib/data/requirements";
import type { CoreRequirement } from "@/types/requirements";
import type { WaiverConfig, WaiverType } from "@/types/user";

interface WaiverSelectorProps {
  selected: WaiverConfig[];
  onSelect: (waivers: WaiverConfig[]) => void;
}

const WAIVER_TYPE_LABELS: Record<WaiverType, string> = {
  waiver: "Waiver",
  substitution: "Substitution",
  placement: "Placement",
};

/** Get available waiver types for a core requirement based on its waiver_details */
function getAvailableTypes(req: CoreRequirement): WaiverType[] {
  const types: WaiverType[] = [];
  if (req.waiver_details?.waiver) types.push("waiver");
  if (req.waiver_details?.substitution) types.push("substitution");
  if (req.waiver_details?.placement) types.push("placement");
  return types;
}

const waivableCores = getWaivableCoreRequirements();

export function WaiverSelector({ selected, onSelect }: WaiverSelectorProps) {
  function isWaived(coreCode: string): boolean {
    return selected.some((w) => w.coreCode === coreCode);
  }

  function getWaiverType(coreCode: string): WaiverType {
    return selected.find((w) => w.coreCode === coreCode)?.waiverType ?? "waiver";
  }

  function toggleWaiver(coreCode: string, req: CoreRequirement) {
    if (isWaived(coreCode)) {
      onSelect(selected.filter((w) => w.coreCode !== coreCode));
    } else {
      const types = getAvailableTypes(req);
      onSelect([
        ...selected,
        { coreCode, waiverType: types[0], cuImpact: 0 },
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
        Select any core courses you have waived, substituted, or placed into. This is optional.
      </p>
      {waivableCores.map((req) => {
        const waived = isWaived(req.core_code);
        const availableTypes = getAvailableTypes(req);

        return (
          <div
            key={req.core_code}
            className={`p-4 rounded-lg border space-y-3 ${
              waived ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={waived}
                onCheckedChange={() => toggleWaiver(req.core_code, req)}
              />
              <div>
                <div className="font-medium text-sm">{req.core_name}</div>
                <div className="text-xs text-muted-foreground">
                  {req.credits_required} CU &middot; Courses: {req.courses.join(", ")}
                </div>
              </div>
            </label>

            {waived && availableTypes.length > 1 && (
              <div className="pl-8 space-y-2">
                <Label className="text-xs">Type</Label>
                <Select
                  value={getWaiverType(req.core_code)}
                  onValueChange={(v) =>
                    setWaiverType(req.core_code, v as WaiverType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {WAIVER_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {waived && availableTypes.length === 1 && (
              <div className="pl-8">
                <span className="text-xs text-muted-foreground">
                  {WAIVER_TYPE_LABELS[availableTypes[0]]}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
