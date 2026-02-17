"use client";

import ReactMarkdown from "react-markdown";
import { ActionCard } from "./ActionCard";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessage;
}

// Markdown component map: maps markdown tokens to styled HTML elements
const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  // H1 → large heading
  h1: ({ children }) => (
    <h1 className="text-sm font-bold mt-3 mb-1 leading-snug">{children}</h1>
  ),
  // H2 → subheading
  h2: ({ children }) => (
    <h2 className="text-xs font-bold mt-2 mb-1 leading-snug tracking-wide uppercase opacity-80">{children}</h2>
  ),
  // H3 → section label
  h3: ({ children }) => (
    <h3 className="text-xs font-semibold mt-2 mb-0.5 leading-snug">{children}</h3>
  ),
  // Paragraphs with breathing room between them
  p: ({ children }) => (
    <p className="leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  // Bold text → actual bold
  strong: ({ children }) => (
    <strong className="font-bold">{children}</strong>
  ),
  // Horizontal rule → visible divider line
  hr: () => (
    <hr className="my-2 border-t border-current opacity-20" />
  ),
  // Unordered list
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-0.5 mb-2 pl-1">{children}</ul>
  ),
  // Ordered list
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-0.5 mb-2 pl-1">{children}</ol>
  ),
  // List items
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  // Inline code
  code: ({ children }) => (
    <code className="bg-black/20 rounded px-1 py-0.5 text-[10px] font-mono">{children}</code>
  ),
};

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
        {isAssistant ? (
          <div className="leading-relaxed">
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
            {message.status === "streaming" && (
              <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.content}
            {message.status === "streaming" && (
              <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        )}

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
