"use client";

import { useState } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { useProfileStore } from "@/stores/profile-store";
import { useCatalogStore } from "@/stores/catalog-store";
import { validatePlan } from "@/lib/validation/engine";
import type {
  ChatMessage,
  ChatHistoryMessage,
  SerializedPlanContext,
  SuggestedAction,
  StreamChunk,
} from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Plan store selectors
  const placements = usePlanStore((s) => s.placements);
  const quarterOrder = usePlanStore((s) => s.quarterOrder);
  const getTotalCU = usePlanStore((s) => s.getTotalCU);

  // Profile store selectors
  const majors = useProfileStore((s) => s.majors);
  const waivers = useProfileStore((s) => s.waivers);
  const cuLoadPreference = useProfileStore((s) => s.cuLoadPreference);

  // Catalog store
  const catalogCourses = useCatalogStore((s) => s.courses);

  async function sendMessage(userText: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
      status: "complete",
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "streaming",
      timestamp: Date.now(),
    };
    setMessages([...updatedMessages, assistantMsg]);

    // Assemble plan context
    const allCourseIds = Object.keys(placements);
    const placedCourseIds = allCourseIds.filter(
      (id) => placements[id]?.location !== "staging"
    );

    const validationResult = validatePlan({
      placedCourseIds,
      allCourseIds,
      quarterOrder,
      majors,
      waivers,
    });

    const planContext: SerializedPlanContext = {
      placements: Object.values(placements).map((p) => ({
        courseId: p.courseId,
        location: p.location,
        creditUnits: p.creditUnits,
      })),
      quarterOrder,
      totalCU: getTotalCU(),
      majors,
      waivers,
      cuLoadPreference,
      validationResult,
      catalog: catalogCourses.map((c) => ({
        id: c.courseId,
        title: c.title,
        dept: c.department,
        cu: c.creditUnits,
        term: c.termAvailability ?? null,
        prereqs: c.prerequisites ?? null,
        desc: c.description ?? null,
      })),
    };

    const historyForAPI: ChatHistoryMessage[] = updatedMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let parsedActions: SuggestedAction[] | undefined;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForAPI, planContext }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const rawText = decoder.decode(value, { stream: true });
        const lines = rawText.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          let chunk: StreamChunk;
          try {
            chunk = JSON.parse(json);
          } catch {
            continue;
          }

          if (chunk.type === "text_delta") {
            accumulatedText += chunk.delta;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: accumulatedText }
                  : m
              )
            );
          } else if (chunk.type === "actions") {
            parsedActions = chunk.actions;
          } else if (chunk.type === "done" || chunk.type === "error") {
            if (chunk.type === "error") {
              throw new Error(chunk.error);
            }
            break;
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, status: "complete", suggestedActions: parsedActions }
            : m
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: errorMessage, status: "error" }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  function clearMessages() {
    setMessages([]);
  }

  return { messages, isLoading, sendMessage, clearMessages };
}
