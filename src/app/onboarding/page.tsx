"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileStore } from "@/stores/profile-store";
import { usePlanStore } from "@/stores/plan-store";
import { MajorSelector } from "@/components/onboarding/MajorSelector";
import { WaiverSelector } from "@/components/onboarding/WaiverSelector";
import { generateInitialPlan } from "@/lib/scheduling/initial-plan";
import type { MajorCode, WaiverConfig } from "@/types/user";

type Step = "majors" | "waivers";

export default function OnboardingPage() {
  const router = useRouter();
  const profileStore = useProfileStore();
  const loadPlan = usePlanStore((s) => s.loadPlan);

  const [step, setStep] = useState<Step>("majors");
  const [selectedMajors, setSelectedMajors] = useState<MajorCode[]>([]);
  const [selectedWaivers, setSelectedWaivers] = useState<WaiverConfig[]>([]);

  function handleComplete() {
    // Save profile
    profileStore.setMajors(selectedMajors);
    profileStore.setWaivers(selectedWaivers);
    profileStore.setCULoadPreference("normal");
    profileStore.completeOnboarding();

    // Generate initial plan
    const placements = generateInitialPlan({
      majors: selectedMajors,
      waivers: selectedWaivers,
      cuLoadPreference: "normal",
    });

    const planId = crypto.randomUUID();
    loadPlan(planId, placements);

    router.push("/plan");
  }

  function canProceed(): boolean {
    switch (step) {
      case "majors":
        return selectedMajors.length >= 1 && selectedMajors.length <= 3;
      case "waivers":
        return true; // Waivers are optional
    }
  }

  function nextStep() {
    if (step === "majors") setStep("waivers");
    else handleComplete();
  }

  function prevStep() {
    if (step === "waivers") setStep("majors");
  }

  const stepNumber = step === "majors" ? 1 : 2;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`h-2 flex-1 rounded-full ${
                  n <= stepNumber ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <CardTitle>
            {step === "majors" && "Select Your Majors"}
            {step === "waivers" && "Course Waivers"}
          </CardTitle>
          <CardDescription>
            {step === "majors" && "Choose 1-3 majors from the Wharton MBA program."}
            {step === "waivers" && "Select any core courses you've waived."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "majors" && (
            <MajorSelector
              selected={selectedMajors}
              onSelect={setSelectedMajors}
            />
          )}
          {step === "waivers" && (
            <WaiverSelector
              selected={selectedWaivers}
              onSelect={setSelectedWaivers}
            />
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === "majors"}
            >
              Back
            </Button>
            <Button onClick={nextStep} disabled={!canProceed()}>
              {step === "waivers" ? "Generate Plan" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
