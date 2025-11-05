// Streaming response handler
import type { CompletionChunk } from '../types/docker-ai.ts';

export class StreamHandler {
  private onToken: (token: string) => void;
  private onDone: () => void;
  private onToolCalls?: (toolCalls: any[]) => void;

  constructor(callbacks: {
    onToken: (token: string) => void;
    onDone: () => void;
    onToolCalls?: (toolCalls: any[]) => void;
  }) {
    this.onToken = callbacks.onToken;
    this.onDone = callbacks.onDone;
    this.onToolCalls = callbacks.onToolCalls;
  }

  handleChunk(chunk: CompletionChunk): void {
    if (!chunk.choices || chunk.choices.length === 0) {
      return;
    }

    const choice = chunk.choices[0];

    // Handle text content
    if (choice.delta?.content) {
      this.onToken(choice.delta.content);
    }

    // Handle tool calls
    if (choice.delta?.tool_calls && this.onToolCalls) {
      this.onToolCalls(choice.delta.tool_calls);
    }

    // Handle completion
    if (choice.finish_reason) {
      this.onDone();
    }
  }
}

