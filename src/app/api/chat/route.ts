import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/chat/context-builder";
import type { ChatRequest, StreamChunk, SuggestedAction } from "@/types/chat";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages, planContext } = body;
  const systemPrompt = buildSystemPrompt(planContext);

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (chunk: StreamChunk) => {
        const data = `data: ${JSON.stringify(chunk)}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));
      };

      let fullText = "";
      let actionsEmitted = false;

      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const delta = event.delta.text;
            fullText += delta;

            // Stop streaming prose once we hit the ACTIONS_JSON delimiter
            const actionsIdx = fullText.indexOf("ACTIONS_JSON:");
            if (actionsIdx === -1) {
              encode({ type: "text_delta", delta });
            } else if (!actionsEmitted) {
              // Stream any prose that came before the delimiter in this chunk
              const prevLen = fullText.length - delta.length;
              if (prevLen < actionsIdx) {
                const prosePart = fullText.slice(prevLen, actionsIdx);
                if (prosePart) encode({ type: "text_delta", delta: prosePart });
              }
              actionsEmitted = true;
            }
          }
        }

        // Extract and emit actions JSON block
        const actionsMatch = fullText.match(/ACTIONS_JSON:\s*(\[[\s\S]*?\])/);
        if (actionsMatch) {
          try {
            const actions: SuggestedAction[] = JSON.parse(actionsMatch[1]);
            encode({ type: "actions", actions });
          } catch {
            // Malformed JSON — skip actions silently
          }
        }

        encode({ type: "done" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI service error";
        encode({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
