"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfileStore } from "@/stores/profile-store";
import { MajorSelector } from "@/components/onboarding/MajorSelector";
import { WaiverSelector } from "@/components/onboarding/WaiverSelector";
import { MAJOR_OPTIONS } from "@/types/user";
import type { MajorCode, WaiverConfig } from "@/types/user";

export function ProfilePanel() {
  const profileStore = useProfileStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editMajors, setEditMajors] = useState<MajorCode[]>(profileStore.majors);
  const [editWaivers, setEditWaivers] = useState<WaiverConfig[]>(profileStore.waivers);

  function startEditing() {
    setEditMajors([...profileStore.majors]);
    setEditWaivers([...profileStore.waivers]);
    setIsEditing(true);
  }

  function handleSave() {
    profileStore.setMajors(editMajors);
    profileStore.setWaivers(editWaivers);
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold">Edit Profile</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Majors
            </h3>
            <MajorSelector selected={editMajors} onSelect={setEditMajors} />
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Waivers
            </h3>
            <WaiverSelector selected={editWaivers} onSelect={setEditWaivers} />
          </section>
        </div>
        <div className="p-4 border-t flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={editMajors.length < 1 || editMajors.length > 3}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold">Profile</h2>
        <Button variant="outline" size="sm" onClick={startEditing}>
          Edit
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Email
          </h3>
          <p className="text-sm">{profileStore.email ?? "Not set"}</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Majors
          </h3>
          {profileStore.majors.length === 0 ? (
            <p className="text-sm text-muted-foreground">None selected</p>
          ) : (
            <div className="space-y-1">
              {profileStore.majors.map((code) => {
                const major = MAJOR_OPTIONS.find((m) => m.code === code);
                return (
                  <div key={code} className="flex items-center gap-2">
                    <Badge variant="secondary">{code}</Badge>
                    <span className="text-sm">{major?.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Waivers
          </h3>
          {profileStore.waivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <div className="space-y-1">
              {profileStore.waivers.map((w) => (
                <div key={w.coreCode} className="flex items-center gap-2">
                  <Badge variant="outline">{w.coreCode}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">
                    {w.waiverType.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
