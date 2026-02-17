"use client";

import { ActionCard } from "./ActionCard";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessageComponent({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  const isError = message.status === "error";

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[88%] rounded-lg px-3 py-2 text-xs ${
          isError
            ? "bg-destructive/15 text-destructive border border-destructive/30"
            : isAssistant
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">
          {message.content}
          {message.status === "streaming" && (
            <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
          )}
        </p>

        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.suggestedActions.map((action, i) => (
              <ActionCard key={i} action={action} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
