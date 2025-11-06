// Streaming response handler
import type { CompletionChunk } from '../types/docker-ai.ts';

export class StreamHandler {
  private onToken: (token: string) => void;
  private onDone: () => void;
  private onToolCalls?: (toolCalls: any[]) => void;
  private onMetrics?: (metrics: { usage?: any; timings?: any }) => void;

  constructor(callbacks: {
    onToken: (token: string) => void;
    onDone: () => void;
    onToolCalls?: (toolCalls: any[]) => void;
    onMetrics?: (metrics: { usage?: any; timings?: any }) => void;
  }) {
    this.onToken = callbacks.onToken;
    this.onDone = callbacks.onDone;
    this.onToolCalls = callbacks.onToolCalls;
    this.onMetrics = callbacks.onMetrics;
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

    // Handle metrics (usage and timings are typically in the last chunk)
    // Check for metrics at both chunk level and in the entire response
    if (this.onMetrics) {
      const hasMetrics = chunk.usage || chunk.timings || (chunk as any).usage || (chunk as any).timings;
      if (hasMetrics) {
        this.onMetrics({
          usage: chunk.usage || (chunk as any).usage,
          timings: chunk.timings || (chunk as any).timings,
        });
      }
    }

    // Handle completion
    if (choice.finish_reason) {
      this.onDone();
    }
  }
}

