"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileStore } from "@/stores/profile-store";

/**
 * Dev-mode mock login page.
 * Bypasses Google SSO — just enter an email to proceed.
 */
export default function LoginPage() {
  const router = useRouter();
  const setProfile = useProfileStore((s) => s.setProfile);
  const [email, setEmail] = useState("student@wharton.upenn.edu");

  function handleLogin() {
    if (!email.trim()) return;

    // Mock user profile
    setProfile({
      userId: crypto.randomUUID(),
      email: email.trim(),
      displayName: email.split("@")[0],
      onboardingCompleted: false,
      cuLoadPreference: "normal",
    });

    router.push("/onboarding");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Course Hub</CardTitle>
          <CardDescription>
            Wharton MBA Course Planning Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@wharton.upenn.edu"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <Button onClick={handleLogin} className="w-full">
            Sign In (Dev Mode)
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Development mode — Google SSO will be configured for production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
