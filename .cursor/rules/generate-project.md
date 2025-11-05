# Generate Project Instructions

## Project Overview

This is a CLI tool called `ai` that manages a fleet of local AI Assistants powered by Docker AI Models and MCP (Model Context Protocol) tools. The tool provides a unified interface for running AI models, managing configurations, sessions, and profiles.

**Key Characteristics:**
- TypeScript running natively in Node.js v23.6+ (using built-in type stripping)
- Global npm package with single executable `ai`
- No compilation step needed (Node handles TypeScript natively)
- 100% test coverage using Node Test Runner
- Storage in `~/.ai` directory
- Integration with Docker AI Models and MCP servers

## Technology Stack

### Runtime & Language
- **Node.js**: v23.6 or later (uses native TypeScript support via type stripping)
- **TypeScript**: For type safety, but runs directly without compilation
- **Package Manager**: npm

### Key Dependencies to Install
```json
{
  "dependencies": {
    "commander": "^12.0.0",          // CLI framework
    "chalk": "^5.3.0",                // Terminal colors
    "ora": "^8.0.0",                  // Spinners
    "prompts": "^2.4.2",              // Interactive prompts
    "axios": "^1.6.0",                // HTTP client for llama.cpp
    "conf": "^12.0.0",                // Config/storage management
    "stream-json": "^1.8.0"           // Streaming JSON parsing
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/prompts": "^2.4.9",
    "typescript": "^5.3.0",           // For type checking in tests/CI
    "c8": "^9.0.0"                    // Coverage for Node Test Runner
  }
}
```

### Testing Framework
- **Node Test Runner**: Native test framework (node --test)
- **Coverage**: c8 for 100% coverage reporting
- No external test frameworks needed (Jest, Mocha, etc.)

### Docker Integration
- **Docker AI Models**: Uses Docker's built-in AI model serving via llama.cpp
- **Docker MCP**: Manages MCP servers via `docker mcp` commands
- **Models Supported**: gemma, phi, llama3, mistral, qwen, gpt-oss, smolvlm, deepseek, deepcoder, devstral, magistral, granite

## Project Structure

```
ai/
├── .cursor/
│   └── rules/
│       ├── init.md
│       ├── project-description.md
│       └── generate-project.md (this file)
├── src/
│   ├── index.ts                    # Main entry point, CLI setup
│   ├── commands/
│   │   ├── run.ts                  # ai run command
│   │   ├── status.ts               # ai status command
│   │   ├── profile.ts              # ai profile command
│   │   ├── agent.ts                # ai agent command
│   │   ├── session.ts              # ai session command
│   │   └── install.ts              # ai install command
│   ├── lib/
│   │   ├── docker-ai.ts            # Docker AI Models HTTP client
│   │   ├── mcp-client.ts           # MCP server integration
│   │   ├── storage.ts              # ~/.ai storage management
│   │   ├── interactive.ts          # Interactive prompt loop
│   │   ├── slash-commands.ts       # Slash command handlers
│   │   ├── tool-manager.ts         # Tool calling orchestration
│   │   ├── stream-handler.ts       # Streaming response handler
│   │   └── config.ts               # Configuration utilities
│   └── types/
│       ├── cli.ts                  # CLI-related types
│       ├── docker-ai.ts            # Docker AI Models types
│       ├── mcp.ts                  # MCP protocol types
│       ├── profile.ts              # User profile types
│       ├── agent.ts                # Agent configuration types
│       └── session.ts              # Session/chat history types
├── tests/
│   ├── commands/                   # Command tests
│   ├── lib/                        # Library tests
│   └── integration/                # Integration tests
├── bin/
│   └── ai.js                       # Executable shebang file
├── package.json
├── tsconfig.json                   # For type checking only
├── .npmignore
├── .gitignore
├── README.md
└── LICENSE
```

## File System Storage (~/.ai)

The application stores all data in `~/.ai/` with the following structure:

```
~/.ai/
├── config.json                     # Global configuration
├── profiles/
│   ├── default.json                # Default user profile
│   └── {profile-name}.json         # Named profiles
├── agents/
│   └── {agent-name}.json           # Agent configurations
├── sessions/
│   └── {session-id}.json           # Chat history sessions
└── bin/                            # Agent executables (for ai install)
    └── {agent-name}                # Custom agent executables
```

### Storage Schema

**config.json**:
```json
{
  "currentProfile": "default",
  "currentAgent": null,
  "currentSession": null,
  "dockerHost": "unix:///var/run/docker.sock"
}
```

**Profile Schema** (`profiles/{name}.json`):
```json
{
  "name": "default",
  "attributes": {
    "role": "developer",
    "expertise": ["typescript", "docker"],
    "preferences": {}
  },
  "createdAt": "2025-11-05T...",
  "updatedAt": "2025-11-05T..."
}
```

**Agent Schema** (`agents/{name}.json`):
```json
{
  "name": "coder",
  "model": "llama3",
  "systemPrompt": "You are a helpful coding assistant",
  "tools": ["filesystem", "search"],
  "mcpServers": ["docker://mcp-filesystem"],
  "modelParams": {
    "ctxSize": 4096,
    "maxTokens": 2048,
    "temperature": 0.7,
    "topP": 0.9,
    "topN": 40
  },
  "attributes": {},
  "createdAt": "2025-11-05T...",
  "updatedAt": "2025-11-05T..."
}
```

**Session Schema** (`sessions/{id}.json`):
```json
{
  "id": "uuid-here",
  "agentName": "coder",
  "profileName": "default",
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hi there!"
    }
  ],
  "metadata": {
    "tokenCount": 1234,
    "toolCalls": 5
  },
  "createdAt": "2025-11-05T...",
  "updatedAt": "2025-11-05T..."
}
```

## Docker AI Models Integration

### HTTP Completions Endpoint

Docker AI Models exposes llama.cpp via HTTP on `http://localhost:8080` (default) when a model is running.

**Starting a Model:**
```bash
docker run -d --name llama3 -p 8080:8080 ollama/ollama:llama3
```

**Completion Request:**
```typescript
POST http://localhost:8080/v1/completions
Content-Type: application/json

{
  "model": "llama3",
  "prompt": "User message here",
  "max_tokens": 2048,
  "temperature": 0.7,
  "top_p": 0.9,
  "top_k": 40,
  "stream": true
}
```

**Streaming Response:**
```
data: {"id":"cmpl-xxx","object":"text_completion","created":1234,"model":"llama3","choices":[{"text":"Hello","index":0,"finish_reason":null}]}
data: {"id":"cmpl-xxx","object":"text_completion","created":1234,"model":"llama3","choices":[{"text":" there","index":0,"finish_reason":null}]}
data: [DONE]
```

### Chat Completions Endpoint

```typescript
POST http://localhost:8080/v1/chat/completions
Content-Type: application/json

{
  "model": "llama3",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello"}
  ],
  "tools": [...],           // Optional: MCP tools
  "tool_choice": "auto",    // Optional: "auto", "none", or {"type": "function", "function": {"name": "tool_name"}}
  "max_tokens": 2048,
  "temperature": 0.7,
  "stream": true
}
```

## MCP (Model Context Protocol) Integration

### Docker MCP Commands

```bash
# List available MCP servers
docker mcp catalog ls

# Install an MCP server
docker mcp install filesystem

# List installed servers
docker mcp ls

# Start an MCP server
docker mcp start filesystem

# Stop an MCP server
docker mcp stop filesystem

# Remove an MCP server
docker mcp rm filesystem
```

### MCP Tool Calling Pattern

1. **List Available Tools**: Query MCP server for available tools
2. **Send to Model**: Include tools in chat completion request
3. **Handle Tool Calls**: Parse model response for tool calls
4. **Execute Tools**: Call MCP server to execute tool
5. **Return Results**: Send tool results back to model
6. **Continue Loop**: Repeat until model finishes

**MCP Communication** (JSON-RPC over stdio/HTTP):
```json
// Request: List tools
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "read_file",
        "description": "Read file contents",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": {"type": "string"}
          },
          "required": ["path"]
        }
      }
    ]
  }
}

// Request: Call tool
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "/tmp/test.txt"
    }
  }
}
```

### Custom MCP Tools

For features like RAG and Memory, create custom MCP servers as separate Docker containers:

- **RAG Tool**: Vector search and retrieval
- **Memory Tool**: Long-term memory storage and recall
- Store MCP server code in separate repos or subdirectories
- Package as Docker containers for easy distribution

## CLI Implementation Details

### Entry Point (bin/ai.js)

```javascript
#!/usr/bin/env node --experimental-strip-types
import '../src/index.ts';
```

The `--experimental-strip-types` flag enables TypeScript support in Node v23.6+.

### Main CLI Setup (src/index.ts)

Use `commander` for CLI framework:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { runCommand } from './commands/run.ts';
import { statusCommand } from './commands/status.ts';
// ... import other commands

const program = new Command();

program
  .name('ai')
  .description('Local AI Agent Assistants Manager')
  .version('1.0.0');

program
  .command('run')
  .description('Run interactive chat with model')
  .argument('[model]', 'Model to use')
  .argument('[prompt...]', 'Prompt text')
  .option('--ctx-size <size>', 'Context window size', '4096')
  .option('--max-tokens <tokens>', 'Maximum response tokens', '2048')
  .option('--temperature <temp>', 'Temperature', '0.7')
  .option('--top-p <p>', 'Top P', '0.9')
  .option('--top-n <n>', 'Top N', '40')
  .option('--mcp-servers <servers>', 'Enabled MCP servers (comma-separated)')
  .option('--tools <tools>', 'Enabled tools (comma-separated)')
  .option('--tool-choice <choice>', 'Tool choice mode')
  .option('--tool-call-mode <mode>', 'Tool call mode (native|prompt)')
  .option('--thinking', 'Show thinking stream')
  .option('--debug', 'Show debug info')
  .action(runCommand);

program
  .command('status')
  .description('Check installation and validate dependencies')
  .action(statusCommand);

program
  .command('profile')
  .description('Configure user profile')
  .argument('[subcommand]', 'Subcommand')
  .argument('[args...]', 'Arguments')
  .action(profileCommand);

program
  .command('agent')
  .description('Manage agent configurations')
  .argument('[subcommand]', 'Subcommand')
  .argument('[args...]', 'Arguments')
  .action(agentCommand);

program
  .command('session')
  .description('Manage sessions')
  .argument('[subcommand]', 'Subcommand')
  .argument('[args...]', 'Arguments')
  .action(sessionCommand);

program
  .command('install')
  .description('Install agent executables to PATH')
  .action(installCommand);

program.parse();
```

### Command: ai run

Two modes:
1. **Single execution**: `ai run llama3 "What is TypeScript?"`
2. **Interactive**: `ai run llama3`

**Implementation Flow**:
1. Load agent configuration (if exists) or use defaults
2. Load current session or create new
3. If prompt provided: send single request, display response, exit
4. If no prompt: start interactive loop
5. In interactive mode: handle slash commands and user input
6. Stream responses with proper formatting
7. Handle tool calls (MCP integration)
8. Save session on exit

### Command: ai status

Check and report:
- Node.js version (must be >= 23.6)
- Docker availability and version
- Docker AI Models availability
- Installed models (`docker images`)
- Running models (`docker ps`)
- MCP servers installed (`docker mcp ls`)
- Storage directory (`~/.ai`) status
- Configuration validity

### Command: ai profile

Subcommands implement user profile CRUD operations using storage layer.

### Command: ai agent

Subcommands implement agent configuration CRUD operations.

### Command: ai session

Subcommands implement session management (list, show, delete, import/export).

### Command: ai install

Creates symlinks or copies agent executables from `~/.ai/bin/` to a directory in user's PATH (e.g., `/usr/local/bin` or `~/.local/bin`).

## Interactive Mode & Slash Commands

### Interactive Loop (src/lib/interactive.ts)

```typescript
import prompts from 'prompts';

export async function startInteractive(options: InteractiveOptions) {
  let session = loadOrCreateSession();
  let settings = { ...options };
  
  console.log('Entering interactive mode. Type /help for commands, /quit to exit.');
  
  while (true) {
    const { input } = await prompts({
      type: 'text',
      name: 'input',
      message: '>'
    });
    
    if (!input) continue;
    
    // Handle slash commands
    if (input.startsWith('/')) {
      const result = await handleSlashCommand(input, session, settings);
      if (result.exit) break;
      if (result.settings) settings = result.settings;
      continue;
    }
    
    // Regular user input
    await sendMessage(input, session, settings);
  }
  
  saveSession(session);
}
```

### Slash Command Handlers (src/lib/slash-commands.ts)

Parse and execute slash commands. Each command updates settings or session state:

```typescript
export async function handleSlashCommand(
  input: string, 
  session: Session, 
  settings: Settings
): Promise<{ exit?: boolean; settings?: Settings }> {
  const [command, ...args] = input.slice(1).split(' ');
  
  switch (command) {
    case 'help':
      displayHelp();
      return {};
    
    case 'clear':
      console.clear();
      return {};
    
    case 'quit':
    case 'q':
    case 'exit':
    case 'e':
      return { exit: true };
    
    case 'ctx-size':
      const newSettings = { ...settings, ctxSize: parseInt(args[0]) };
      return { settings: newSettings };
    
    // ... other commands
    
    default:
      console.error(`Unknown command: /${command}`);
      return {};
  }
}
```

## Streaming and Tool Calling

### Stream Handler (src/lib/stream-handler.ts)

Handle SSE (Server-Sent Events) streaming from llama.cpp:

```typescript
import { Writable } from 'stream';

export class StreamHandler extends Writable {
  private buffer = '';
  
  _write(chunk: Buffer, encoding: string, callback: Function) {
    this.buffer += chunk.toString();
    
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          this.emit('done');
        } else {
          try {
            const json = JSON.parse(data);
            this.emit('token', json);
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    
    callback();
  }
}
```

### Tool Manager (src/lib/tool-manager.ts)

Orchestrate tool calls between model and MCP servers:

```typescript
export async function handleToolCalls(
  toolCalls: ToolCall[],
  mcpClient: MCPClient
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  
  for (const toolCall of toolCalls) {
    try {
      const result = await mcpClient.callTool(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments)
      );
      results.push({
        tool_call_id: toolCall.id,
        output: JSON.stringify(result)
      });
    } catch (error) {
      results.push({
        tool_call_id: toolCall.id,
        output: JSON.stringify({ error: error.message })
      });
    }
  }
  
  return results;
}
```

## Testing Strategy

### Node Test Runner

Use native Node.js test runner (no external frameworks):

```typescript
// tests/lib/storage.test.ts
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { Storage } from '../../src/lib/storage.ts';

describe('Storage', () => {
  let storage: Storage;
  
  before(() => {
    storage = new Storage('/tmp/test-ai');
  });
  
  after(() => {
    storage.cleanup();
  });
  
  test('should save and load config', () => {
    const config = { currentProfile: 'test' };
    storage.saveConfig(config);
    const loaded = storage.loadConfig();
    assert.deepEqual(loaded, config);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
node --test tests/lib/storage.test.ts
```

### Coverage Target

100% coverage using c8:

```json
// package.json
{
  "scripts": {
    "test": "node --test tests/**/*.test.ts",
    "test:coverage": "c8 --reporter=text --reporter=html npm test"
  }
}
```

### Test Organization

- **Unit tests**: Test individual functions and classes
- **Integration tests**: Test command execution, Docker interaction, MCP communication
- **Mock external dependencies**: Docker API, MCP servers, HTTP endpoints

## Development Workflow

### Setup

```bash
# Clone repository
git clone <repo-url>
cd ai

# Install dependencies
npm install

# Verify Node.js version
node --version  # Should be >= 23.6

# Verify Docker
docker --version
docker mcp catalog ls
```

### Running Locally

```bash
# Run directly with Node
node --experimental-strip-types src/index.ts status

# Or use the bin executable
chmod +x bin/ai.js
./bin/ai.js status

# Or link globally for testing
npm link
ai status
```

### Type Checking

Even though Node strips types at runtime, validate TypeScript in development:

```bash
# Add to package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}

# Run type checking
npm run typecheck
```

### Linting

Optional but recommended:

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Add script
{
  "scripts": {
    "lint": "eslint src/**/*.ts"
  }
}
```

## Configuration Files

### package.json

```json
{
  "name": "@higginsrob/ai",
  "version": "1.0.0",
  "description": "Local AI Agent Assistants Manager",
  "type": "module",
  "bin": {
    "ai": "./bin/ai.js"
  },
  "files": [
    "bin",
    "src",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "test": "node --test tests/**/*.test.ts",
    "test:coverage": "c8 --reporter=text --reporter=html npm test",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run typecheck && npm test"
  },
  "keywords": ["ai", "cli", "docker", "mcp", "llm"],
  "author": "Rob Higgins",
  "license": "MIT",
  "engines": {
    "node": ">=23.6.0"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "prompts": "^2.4.2",
    "axios": "^1.6.0",
    "conf": "^12.0.0",
    "stream-json": "^1.8.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/prompts": "^2.4.9",
    "typescript": "^5.3.0",
    "c8": "^9.0.0"
  }
}
```

### tsconfig.json

Used for type checking only (not compilation):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules"]
}
```

### .gitignore

```
node_modules/
dist/
coverage/
*.log
.env
.DS_Store
```

### .npmignore

```
tests/
coverage/
*.test.ts
tsconfig.json
.cursor/
.git/
.github/
```

## CI/CD Pipeline (GitHub Actions)

### .github/workflows/test.yml

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '23.6'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### .github/workflows/publish.yml

```yaml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '23.6'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Documentation Requirements

### README.md

Include:
- Project description
- Installation instructions (`npm install -g @higginsrob/ai`)
- Prerequisites (Node >= 23.6, Docker, Docker AI Models)
- Quick start guide
- Command reference
- Examples
- Contributing guidelines

### LICENSE

Choose MIT or another open-source license.

### API Documentation

For MCP integration and tool development, document:
- MCP protocol usage
- Custom tool creation
- Tool schemas
- Extension points

## Key Implementation Notes

### Node.js Type Stripping

- Use `--experimental-strip-types` flag in shebang
- No transpilation needed
- Import `.ts` files directly
- Full TypeScript syntax support (types, interfaces, enums, etc.)
- Limitations: No decorators, no namespace merging

### Error Handling

- Graceful degradation when Docker unavailable
- Clear error messages for missing dependencies
- Validation of user inputs
- Proper cleanup on SIGINT/SIGTERM

### Performance Considerations

- Streaming responses for real-time feedback
- Lazy-load MCP servers (start on-demand)
- Cache model metadata
- Efficient session storage (don't load entire history if not needed)

### Security

- Validate all file paths (prevent directory traversal)
- Sanitize MCP tool inputs
- Don't log sensitive data
- Secure storage of API keys (if needed in future)

### User Experience

- Colorful, readable terminal output (chalk)
- Progress indicators for long operations (ora)
- Helpful error messages with suggestions
- Interactive prompts with validation
- Graceful handling of Ctrl+C

## Future Extensibility

Design with these future features in mind:

- Cloud model providers (OpenAI, Anthropic, etc.)
- Plugin system for custom commands
- Web UI dashboard
- Multi-user support
- Remote Docker hosts
- Model fine-tuning integration
- Prompt library/templates
- Analytics and usage tracking

## Building the Project: Step-by-Step

When a coding agent is tasked with building this project, follow these steps:

1. **Initialize npm package**: `npm init` with settings from package.json above
2. **Create directory structure**: src/, tests/, bin/
3. **Install dependencies**: `npm install <packages>`
4. **Create bin/ai.js**: Shebang entry point
5. **Create src/index.ts**: Main CLI setup with commander
6. **Implement core libraries**:
   - src/lib/storage.ts (with tests)
   - src/lib/config.ts (with tests)
   - src/lib/docker-ai.ts (with tests)
   - src/lib/mcp-client.ts (with tests)
7. **Implement commands** (one at a time with tests):
   - src/commands/status.ts
   - src/commands/profile.ts
   - src/commands/agent.ts
   - src/commands/session.ts
   - src/commands/run.ts (most complex, do last)
   - src/commands/install.ts
8. **Implement interactive features**:
   - src/lib/interactive.ts
   - src/lib/slash-commands.ts
   - src/lib/stream-handler.ts
   - src/lib/tool-manager.ts
9. **Add TypeScript types**: src/types/*.ts
10. **Write comprehensive tests**: Achieve 100% coverage
11. **Create documentation**: README.md, examples
12. **Setup CI/CD**: GitHub Actions workflows
13. **Test locally**: `npm link` and run commands
14. **Publish**: Create release on GitHub, auto-publish to npm

## Validation Checklist

Before considering the project complete:

- [ ] All commands execute without errors
- [ ] `ai status` detects Docker and models correctly
- [ ] `ai run` executes single prompts
- [ ] `ai run` interactive mode works with slash commands
- [ ] Profiles can be created, modified, listed
- [ ] Agents can be created, modified, listed
- [ ] Sessions can be created, saved, loaded
- [ ] Tool calling works with at least one MCP server
- [ ] Streaming responses display correctly
- [ ] 100% test coverage achieved
- [ ] All tests pass
- [ ] TypeScript type checking passes
- [ ] README is complete and accurate
- [ ] Package can be installed globally
- [ ] Package can be published to npm

## Demo Workflow

To demonstrate the tool works:

```bash
# Check status
ai status

# Create a profile
ai profile new developer
ai profile add expertise "typescript,docker,ai"

# Create an agent
ai agent new coder
# Interactive form to configure

# Run a single prompt
ai run llama3 "Explain Docker AI Models"

# Run interactive session
ai run llama3
> Hello!
> /ctx-size 8192
> Tell me about MCP
> /save my-conversation
> /quit

# List sessions
ai session ls

# Load previous session
ai session show my-conversation
```

This completes the comprehensive instructions for building the AI Agent Manager CLI tool. An agent following these instructions should be able to build the entire project with minimal additional research.

