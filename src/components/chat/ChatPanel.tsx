"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import { ChatMessageComponent } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

function WelcomeMessage() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-lg px-3 py-2 text-xs bg-muted text-foreground">
        <p className="leading-relaxed">
          Hi! I'm your AI academic advisor. I can help you:
        </p>
        <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
          <li>• Answer questions about courses and requirements</li>
          <li>• Suggest courses that fit your majors</li>
          <li>• Explain validation errors in your plan</li>
          <li>• Propose plan changes for you to review</li>
        </ul>
        <p className="mt-1.5 text-muted-foreground">What would you like to know?</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-lg px-3 py-2 bg-muted">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold">AI Advisor</h2>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-xs text-muted-foreground h-7 px-2"
          >
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {messages.length === 0 && <WelcomeMessage />}
          {messages.map((msg) => (
            <ChatMessageComponent key={msg.id} message={msg} />
          ))}
          {isLoading && messages[messages.length - 1]?.status !== "streaming" && (
            <TypingIndicator />
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
