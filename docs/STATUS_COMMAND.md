# /status Command

## Overview

The `/status` slash command displays real-time performance metrics and context window usage for the current interactive session.

## Features

### Performance Metrics
- **Generation Speed**: Tokens generated per second
- **Prompt Processing Speed**: Prompt tokens processed per second  
- **Generation Time**: Total time spent generating the response
- **Prompt Time**: Total time spent processing the prompt

### Context Window Usage
- Displays current token usage vs. context window size
- Shows visual progress bar with color-coding:
  - 🟡 **Yellow**: 0-50% usage
  - 🟠 **Orange**: 51-75% usage
  - 🔴 **Red**: 76-100% usage
- Percentage indicator
- Token breakdown (prompt, completion, total)

## Usage

### In Interactive Mode

```bash
> /status
```

### From Command Line

```bash
ai agent status
```

This allows you to check the current session's performance without being in interactive mode.

### Example Output

```
📊 Performance Status

Performance Metrics:
  Generation Speed: 25.50 tokens/sec
  Prompt Processing: 150.20 tokens/sec
  Generation Time: 20.00s
  Prompt Time: 6.67s

Token Usage:
  Prompt Tokens: 1000
  Cached Tokens: 35
  Completion Tokens: 500
  Total Tokens: 1500

(used 1500 of 8192 context window)
███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
18.3% of context window used
```

## Implementation Details

### Data Collection
Performance metrics are automatically captured from the llama.cpp endpoint response after each completion request:

**Streaming Mode** (default):
- `timings` field from the final chunk (includes all timing metrics)
- Token counts calculated from `timings.prompt_n`, `timings.predicted_n`, and `timings.cache_n`

**Non-Streaming Mode**:
- Token usage from `usage` field
- Timing information from `timings` field

### Storage
Metrics are stored in `session.metadata.lastRequestStats`:
```typescript
{
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  contextWindowSize: number;
  timings?: {
    predicted_ms?: number;
    predicted_n?: number;
    predicted_per_second?: number;
    predicted_per_token_ms?: number;
    prompt_ms?: number;
    prompt_n?: number;
    prompt_per_second?: number;
    prompt_per_token_ms?: number;
  };
}
```

### Progress Bar
- Automatically adjusts to terminal width (max 60 characters)
- Uses Unicode block characters (█ for filled, ░ for empty)
- Color changes based on percentage thresholds

## Files Modified

1. **src/types/docker-ai.ts**: Added `timings` field to response types (including `cache_n`)
2. **src/types/session.ts**: Added `lastRequestStats` to `SessionMetadata`
3. **src/lib/stream-handler.ts**: Added metrics capture callback
4. **src/lib/interactive.ts**: Store metrics after each completion
5. **src/lib/slash-commands.ts**: Implemented `/status` command handler
6. **src/commands/agent.ts**: Added `status` subcommand (`ai agent status`)
7. **tests/lib/slash-commands.test.ts**: Added tests for `/status` command
8. **README.md**: Documented both `/status` slash command and `ai agent status` command
9. **docs/STATUS_COMMAND.md**: Complete documentation of the feature

## How It Works

The `/status` command captures metrics from the llama.cpp streaming endpoint:

1. **During streaming**, each chunk is processed by the `StreamHandler`
2. **The final chunk** (with `finish_reason: "stop"`) contains the `timings` object
3. **Token counts** are extracted from `timings.prompt_n` and `timings.predicted_n`
4. **Performance metrics** are stored in the session metadata

Example final chunk from llama.cpp:
```json
{
  "choices": [{"finish_reason": "stop", "index": 0, "delta": {}}],
  "timings": {
    "cache_n": 35,
    "prompt_n": 1,
    "predicted_n": 8,
    "prompt_ms": 74.213,
    "predicted_ms": 65.401,
    "prompt_per_second": 13.47,
    "predicted_per_second": 122.32
  }
}
```

## Troubleshooting

If `/status` shows "No performance data available yet" after making requests:

1. **Verify the llama.cpp endpoint** is returning `timings` data in the final streaming chunk (the chunk with `finish_reason: "stop"`).

2. **Check timings structure** - The code expects:
   - `timings.prompt_n` for prompt tokens
   - `timings.predicted_n` for completion tokens  
   - `timings.cache_n` for cached tokens (optional)

3. **Make a test request** - Ensure at least one completion has been made in the current session.

## Notes

- The command shows "No performance data available yet" if no requests have been made
- Metrics are updated after each AI completion (including tool call continuations)
- The context window size is based on the current `ctxSize` setting
- Metrics depend on the llama.cpp endpoint returning `usage` and `timings` fields in the streaming response

