# AI - Local AI Agent Assistants Manager

A powerful CLI tool for managing a fleet of local AI assistants powered by Docker AI Models and MCP (Model Context Protocol) tools.

## Features

- 🤖 **Agent-Based Execution** - Create specialized AI agents, run by name
- 📦 **Agent Executables** - Install agents as direct commands (`coder "prompt"`)
- 🎯 **Dynamic System Prompts** - Auto-includes agent + user attributes  
- ✏️ **Quick Editing** - Edit configs in your default editor
- 🚀 **Simple CLI Interface** - Single `ai` command for all operations
- 🐳 **Docker-Powered** - Leverages Docker AI Models and llama.cpp
- 🔧 **MCP Integration** - Extensible tool calling via Model Context Protocol
- 💬 **Interactive Mode** - Real-time chat with streaming responses
- 📝 **Session Management** - Save, load, and manage conversation history
- 👤 **User Profiles** - Personalize AI interactions with user attributes
- ⚡ **TypeScript Native** - Runs directly on Node.js v23.6+ without compilation

## Why Agents?

Traditional approach:
```bash
ai run llama3 --ctx-size 8192 --temperature 0.8 "help me code"
```

With agents:
```bash
ai agent new coder    # Configure once
coder "help me code"  # Use forever
```

## Prerequisites

- **Node.js** v23.6 or later (for native TypeScript support)
- **Docker** with Docker AI Models
- **Unix-like OS** (macOS, Linux) or WSL on Windows

## Installation

```bash
npm install -g @higginsrob/ai
```

## Quick Start

### 1. Check Installation

```bash
ai status
```

This checks your Node.js version, Docker availability, installed models, and MCP servers.

### 2. Create an Agent

```bash
ai agent new coder
# Follow the interactive prompts
```

### 3. Run Your Agent

```bash
# Single execution
ai run coder "Explain how Docker works"

# Interactive mode
ai run coder
```

### 4. Install Agent as Executable

```bash
ai agent install

# Now you can run directly:
coder "Help me write a React component"
```

### 5. Using Models Directly (without agent)

```bash
ai run llama3 "Quick question"
```

## Commands

### `ai status`

Check installation and validate all dependencies.

```bash
ai status
```

### `ai run`

Run AI agent or model with a prompt or start interactive mode.

**Using an Agent:**
```bash
# Run with agent (uses agent's full configuration)
ai run coder "What is TypeScript?"

# Interactive mode with agent
ai run coder
```

**Using a Model Directly:**
```bash
# Run with model name
ai run llama3 "What is TypeScript?"

# Interactive mode with model
ai run llama3
```

**With Options (override agent defaults):**
```bash
ai run coder --temperature 0.9 --max-tokens 1024 --debug
```

**Options:**
- `--ctx-size <size>` - Context window size (default: from agent or 4096)
- `--max-tokens <tokens>` - Maximum response tokens (default: from agent or 2048)
- `--temperature <temp>` - Temperature 0-2 (default: from agent or 0.7)
- `--top-p <p>` - Top P 0-1 (default: from agent or 0.9)
- `--top-n <n>` - Top N (default: from agent or 40)
- `--debug` - Show debug information

**Note:** When using an agent name, all settings default to the agent's configuration. Command-line options override agent settings.

### `ai profile`

Manage user profiles.

```bash
# Show current profile
ai profile show

# Create new profile
ai profile new developer

# Select profile
ai profile select developer

# Edit current profile in your default editor
ai profile edit

# Edit specific profile
ai profile edit developer

# Add attribute
ai profile add role "Senior Developer"
ai profile add expertise '["typescript","docker","ai"]'

# Remove attribute
ai profile remove role

# Import/Export
ai profile export ./my-profile.json
ai profile import ./my-profile.json
```

### `ai agent`

Manage AI agent configurations.

```bash
# List all agents
ai agent ls

# Create new agent (interactive)
ai agent new coder

# Show agent details
ai agent show coder

# Edit agent in your default editor
ai agent edit coder

# Remove agent
ai agent remove coder

# Manage personality traits
ai agent traits coder        # Multi-select all traits
ai agent trait-add coder     # Add one trait with autocomplete
ai agent trait-remove coder  # Remove one trait with autocomplete

# Manage expertise
ai agent expertise-add coder    # Add area of expertise (text input)
ai agent expertise-remove coder # Remove area of expertise

# Manage custom attributes
ai agent attribute-add coder    # Add custom key-value attribute
ai agent attribute-remove coder # Remove custom attribute

# Configure agent settings
ai agent configure coder     # Update model, prompts, and parameters

# Import/Export
ai agent export coder ./coder-agent.json
ai agent import ./coder-agent.json

# Install agents as executables
ai agent install
# Now you can run: coder "your prompt"

# Show current session performance status
ai agent status
```

### `ai session`

Manage chat sessions.

```bash
# List all sessions
ai session ls

# Show session details
ai session show session-123

# Create new session
ai session new my-session

# Remove session
ai session remove session-123

# Remove all sessions
ai session reset

# Import/Export
ai session export session-123 ./my-session.json
ai session import ./my-session.json
```

## Interactive Mode Slash Commands

When in interactive mode (`ai run <model>`), you can use these commands:

- `/help` - Show help for slash commands
- `/clear` - Clear terminal screen
- `/status` - Show performance metrics and context window usage
- `/save [name]` - Save current session
- `/load <name>` - Load a previous session
- `/compact` - Summarize and compact session
- `/reset` - Reset chat history
- `/ctx-size <size>` - Set context window size
- `/max-size <size>` - Set max response size
- `/temperature <float>` - Set temperature
- `/top_p <float>` - Set top_p
- `/top_n <int>` - Set top_n
- `/debug <bool>` - Enable/disable debug mode
- `/quit`, `/q`, `/exit`, `/e`, `/x` - Exit interactive mode
- **Ctrl+C** - Exit and save session gracefully

## Dynamic System Prompts

The system automatically enhances prompts with context from your agent and profile configurations:

### How It Works

When you interact with an AI model, the system builds a complete prompt:

```
[Your Agent's Base System Prompt]

# Agent Attributes
[Formatted attributes from agent config]

# User Attributes  
[Formatted attributes from your profile]
```

### Example

**Agent config** (`ai agent edit coder`):
```json
{
  "systemPrompt": "You are an expert coding assistant.",
  "attributes": {
    "specialty": "code-review",
    "languages": ["typescript", "python"]
  }
}
```

**Profile config** (`ai profile edit`):
```json
{
  "attributes": {
    "role": "Senior Developer",
    "expertise": ["docker", "kubernetes"]
  }
}
```

**Generated system prompt**:
```
You are an expert coding assistant.

# Agent Attributes

**Specialty**: code-review
**Languages**: typescript, python

# User Attributes

**Role**: Senior Developer
**Expertise**: docker, kubernetes
```

This provides the AI with rich context about:
- Your role and expertise
- Your preferences and constraints
- The agent's specialized capabilities
- Your current project context

See `example/demo-system-prompt.md` for detailed examples.

## Storage

All data is stored in `~/.ai/`:

```
~/.ai/
├── config.json          # Global configuration
├── profiles/            # User profiles
│   └── default.json
├── agents/              # Agent configurations
│   └── coder.json
├── sessions/            # Chat history
│   └── session-123.json
└── bin/                 # Agent executables
```

## Docker AI Models

This tool uses Docker AI Models via llama.cpp HTTP endpoints.

### Supported Models

- llama3
- mistral
- gemma
- phi
- qwen
- gpt-oss
- smolvlm
- deepseek
- deepcoder
- devstral
- magistral
- granite

### Running a Model

```bash
# Pull a model using Docker AI Models
docker model pull llama3

# List available models
docker model ls

# Models are automatically served via llama.cpp at:
# http://localhost:12434/engines/llama.cpp/v1/chat/completions
```

## Development

### Prerequisites

- Node.js v23.6+
- npm

### Setup

```bash
# Clone repository
git clone https://github.com/higginsrob/ai.git
cd ai

# Install dependencies
npm install

# Run locally
node --experimental-strip-types src/index.ts status

# Or use the bin executable
chmod +x bin/ai.js
./bin/ai.js status

# Link globally for testing
npm link
ai status
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npm run typecheck
```

### Project Structure

```
ai/
├── src/
│   ├── commands/       # CLI commands
│   ├── lib/            # Core libraries
│   └── types/          # TypeScript types
├── tests/              # Test files
├── bin/                # Executable entry point
├── scripts/            # Build scripts
└── package.json
```

### Building for Production

This project uses a dual TypeScript workflow:
- **Development**: Uses Node's `--experimental-strip-types` (no compilation needed)
- **Production**: Compiles TypeScript to JavaScript for NPM distribution

```bash
# Build for production
npm run build

# Clean build artifacts
npm run clean
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for details on the build process.

### Releasing

To create a new release, see the [Release Process Guide](docs/RELEASING.md).

Quick summary:
1. Update version in `package.json`
2. Commit and push to `main`
3. Create annotated tag: `git tag -a v0.0.4 -m "Release notes"`
4. Push tag: `git push origin v0.0.4`
5. GitHub Actions will automatically create a release and publish to NPM

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Rob Higgins

## Links

- [GitHub Repository](https://github.com/higginsrob/ai)
- [npm Package](https://www.npmjs.com/package/@higginsrob/ai)
- [Issues](https://github.com/higginsrob/ai/issues)

## Troubleshooting

### Node.js Version Error

Make sure you're using Node.js v23.6 or later:

```bash
node --version
```

If not, install the latest version from [nodejs.org](https://nodejs.org).

### Docker Not Running

Start the Docker daemon:

```bash
# macOS/Linux
sudo systemctl start docker

# macOS with Docker Desktop
open -a Docker
```

### llama.cpp Endpoint Not Responding

Make sure you have Docker AI Models set up and models pulled:

```bash
# Check Docker AI Models
docker model ls

# Pull a model if needed
docker model pull llama3

# The endpoint should be available at http://localhost:12434
```

### Permission Issues with `ai install`

Try installing to `~/.local/bin` instead or use sudo:

```bash
sudo ai install
```

Then add to your PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

**Happy AI Assisting! 🤖**

