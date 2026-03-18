"use client";

import { usePlanStore } from "@/stores/plan-store";
import { useProfileStore } from "@/stores/profile-store";
import { useCatalogStore } from "@/stores/catalog-store";
import { useChatStore } from "@/stores/chat-store";
import { validatePlan } from "@/lib/validation/engine";
import type {
  ChatMessage,
  ChatHistoryMessage,
  SerializedPlanContext,
  SuggestedAction,
  StreamChunk,
} from "@/types/chat";

export function useChat() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const { addMessage, updateMessage, setIsLoading, clearMessages } =
    useChatStore.getState();

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

    addMessage(userMsg);
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "streaming",
      timestamp: Date.now(),
    };
    addMessage(assistantMsg);

    // Snapshot messages for API history (user message already added above)
    const currentMessages = useChatStore.getState().messages;
    const historyForAPI: ChatHistoryMessage[] = currentMessages
      .filter((m) => m.id !== assistantId)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Assemble plan context
    const courseIds = Object.keys(placements);

    const validationResult = validatePlan({
      placedCourseIds: courseIds,
      allCourseIds: courseIds,
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
            updateMessage(assistantId, { content: accumulatedText });
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

      updateMessage(assistantId, {
        status: "complete",
        suggestedActions: parsedActions,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      updateMessage(assistantId, { content: errorMessage, status: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  return { messages, isLoading, sendMessage, clearMessages };
}
