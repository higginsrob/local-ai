// Docker AI Models HTTP client
import axios, { type AxiosInstance } from 'axios';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  CompletionChunk,
} from '../types/docker-ai.ts';

export class DockerAIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:12434') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minute timeout for vision models
    });
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await this.client.post<ChatCompletionResponse>(
      '/engines/llama.cpp/v1/chat/completions',
      request
    );
    return response.data;
  }

  async *chatCompletionStream(
    request: ChatCompletionRequest,
    signal?: AbortSignal
  ): AsyncGenerator<CompletionChunk, void, unknown> {
    const response = await this.client.post('/engines/llama.cpp/v1/chat/completions', request, {
      responseType: 'stream',
      signal,
    });

    const stream = response.data;
    let buffer = '';

    for await (const chunk of stream) {
      // Check if aborted
      if (signal?.aborted) {
        stream.destroy();
        throw new Error('Request aborted by user');
      }

      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            return;
          }
          try {
            const json = JSON.parse(data);
            yield json as CompletionChunk;
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try the chat completions endpoint with a minimal request
      await this.client.post('/engines/llama.cpp/v1/chat/completions', {
        model: 'test',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }, {
        timeout: 2000,
      });
      return true;
    } catch (error) {
      // If we get a response (even an error), the endpoint is up
      if (axios.isAxiosError(error) && error.response) {
        return true;
      }
      return false;
    }
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

