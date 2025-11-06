# AI - Local AI Agent Assistants Manager

A powerful CLI tool for orchestrating multi-agent AI conversations and managing specialized AI assistants powered by Docker AI Models and MCP (Model Context Protocol) tools.

## ✨ What Makes This Special

**Multi-Agent Collaboration**: Create meeting rooms where multiple AI agents with different expertise collaborate on complex problems. Agents can communicate with each other, building on each other's responses to provide comprehensive solutions.

**Agent-Based Architecture**: Define specialized AI agents once, use them everywhere. Each agent has its own personality, expertise, and configuration.

**Docker-Powered**: Runs entirely on your local machine using Docker AI Models - no cloud services, no API keys, full privacy.

## Features

### 🎯 Multi-Agent Meeting Rooms (NEW!)

- **Collaborative Problem Solving** - Multiple agents work together on complex tasks
- **Agent-to-Agent Communication** - Agents can @mention each other to continue discussions
- **Smart Response Buffering** - See the first response immediately, access others on demand
- **Meeting Room Management** - Create named rooms, resume conversations, archive sessions
- **Expertise-Based Selection** - Agents self-select based on who's most qualified to respond

### 🤖 Agent Management

- **Specialized Agents** - Create agents with unique personalities, expertise, and configurations
- **Agent Executables** - Install agents as direct commands (`coder "prompt"`)
- **Personality Traits** - Choose from 100+ traits to customize agent behavior
- **Dynamic System Prompts** - Auto-includes agent + user attributes in every interaction
- **Quick Editing** - Edit configs in your default editor

### 💬 Session & Interaction

- **Interactive Mode** - Real-time chat with streaming responses
- **Session Management** - Save, load, compact, and manage conversation history
- **Context Window Tracking** - Monitor token usage and prevent context overflow
- **Performance Metrics** - Track generation speed, prompt processing, and token counts
- **Session Archiving** - Save important conversations for later restoration

### 🔧 Tools & Integration

- **MCP Integration** - Extensible tool calling via Model Context Protocol
- **Docker AI Models** - Leverages llama.cpp for efficient local inference
- **User Profiles** - Personalize AI interactions with user attributes
- **TypeScript Native** - Runs directly on Node.js v23.6+ without compilation
- **Comprehensive Testing** - 124 tests with excellent coverage of core logic

## Prerequisites

- **Node.js** v23.6 or later (for native TypeScript support)
- **Docker** with Docker AI Models
- **Unix-like OS** (macOS, Linux) or WSL on Windows

## Installation

```bash
npm install -g @higginsrob/local-ai
```

## Quick Start

### 1. Check Installation

```bash
ai status
```

This checks your Node.js version, Docker availability, installed models, and MCP servers.

### 2. Create Specialized Agents

```bash
# Create a technical expert
ai agent new cto
# Configure with: ai/llama3.2:latest, "You are a CTO..."

# Create a business strategist
ai agent new ceo
# Configure with: ai/llama3.2:latest, "You are a CEO..."

# Create a financial expert
ai agent new cfo
# Configure with: ai/llama3.2:latest, "You are a CFO..."
```

### 3. Start a Multi-Agent Meeting

```bash
ai meeting start executive-team ceo cto cfo
```

Now you can ask questions and the most qualified agent will respond, or agents will collaborate:

```
> We need to decide on our cloud infrastructure strategy

ceo: This is a critical decision. @cto what are the technical considerations?

cto: From a technical standpoint, we should consider scalability and cost...
     @cfo what's our budget for infrastructure?

cfo: We can allocate $50K monthly for cloud services...
```

### 4. Single Agent Interaction

```bash
# Interactive mode with an agent
ai run coder

# Single execution
ai run coder "Explain how Docker works"

# Install as executable
ai agent install
coder "Help me write a React component"
```

### 5. List and Manage

```bash
# List all meeting rooms
ai meeting ls

# List all agents
ai agent ls

# Show meeting details
ai meeting show executive-team
```

## Commands

### `ai meeting` - Multi-Agent Collaboration

Manage and interact with multi-agent meeting rooms.

#### Start or Resume a Meeting

```bash
ai meeting start <room-name> <agent1> <agent2> [agent3...]

# Examples:
ai meeting start executive-team ceo cto cfo
ai meeting start project-planning pm dev designer
ai meeting start research-team analyst scientist writer
```

**Requirements:**
- At least 2 agents
- All agents must exist (create with `ai agent new`)
- No agent can be in another active session

**Meeting Features:**
- **Direct messaging**: Start with `cto, what do you think?` or use `@cto anywhere`
- **Broadcast mode**: No target = all agents evaluate, most qualified responds
- **Agent chaining**: Agents can @mention each other (up to configurable depth)
- **Response buffering**: See first response live, others wait in buffer
- **Auto-save**: Conversations persist across sessions

#### List Meeting Rooms

```bash
ai meeting ls
```

Shows all active meeting rooms with participants and message counts.

#### Show Room Details

```bash
ai meeting show <room-name>

# Example:
ai meeting show executive-team
```

Displays participants, settings, metadata, and recent messages.

#### Restore Archived Meetings

```bash
# List available archives
ai meeting restore

# Restore specific archive
ai meeting restore <archive-name>
```

Restores archived meeting sessions created with `/clear` command during meetings.

#### Meeting Slash Commands

When in a meeting session, use these commands:

**Response Management:**
- `/respond <agent>` - View buffered response from agent
- `/buffered` or `/b` - List all agents with buffered responses

**Meeting Information:**
- `/participants` or `/p` - Show all participants
- `/status` or `/s` - Show meeting statistics
- `/history [count]` - Show recent messages (default: 10)
- `/show <agent>` - Display agent's full configuration and system prompt

**Agent-to-Agent Controls:**
- `/chain-length` - View current max chain depth
- `/chain-length <n>` - Set max agent-to-agent conversation depth (0 to disable)

**Session Management:**
- `/reset` or `/r` - Clear meeting history (keeps participants)
- `/clear` or `/c` - Clear screen
- `/quit` or `/q` - Exit meeting

See [docs/MEETING_COMMAND.md](docs/MEETING_COMMAND.md) for comprehensive documentation.

### `ai run` - Single Agent Interaction

Run AI agent or model with a prompt or start interactive mode.

**Using an Agent:**
```bash
# Interactive mode with agent
ai run coder

# Single execution
ai run coder "What is TypeScript?"

# With options (override agent defaults)
ai run coder --temperature 0.9 --max-tokens 1024 --debug
```

**Using a Model Directly:**
```bash
# Interactive mode with model
ai run ai/llama3.2:latest

# Single execution
ai run ai/llama3.2:latest "What is TypeScript?"
```

**Options:**
- `--ctx-size <size>` - Context window size (default: from agent or 4096)
- `--max-tokens <tokens>` - Maximum response tokens (default: from agent or 2048)
- `--temperature <temp>` - Temperature 0-2 (default: from agent or 0.7)
- `--top-p <p>` - Top P 0-1 (default: from agent or 0.9)
- `--top-n <n>` - Top N (default: from agent or 40)
- `--debug` - Show debug information

**Interactive Mode Slash Commands:**
- `/help` - Show help for slash commands
- `/status` - Show performance metrics and context window usage
- `/show` - Display agent configuration and system prompt
- `/compact` - Summarize and compact session to reduce token usage
- `/clear` - Save current session to archive and start fresh
- `/reset` - Reset chat history (without archiving)
- `/meeting <room-name> <agents...>` - Switch to multi-agent meeting mode
- `/ctx-size <size>` - Set context window size
- `/max-size <size>` - Set max response size
- `/temperature <float>` - Set temperature
- `/top_p <float>` - Set top_p
- `/top_n <int>` - Set top_n
- `/debug <bool>` - Enable/disable debug mode
- `/quit`, `/q`, `/exit` - Exit interactive mode

### `ai agent` - Manage AI Agents

Create and manage specialized AI agent configurations.

```bash
# List all agents
ai agent ls

# Create new agent (interactive prompts)
ai agent new coder

# Show agent details
ai agent show coder

# Edit agent in your default editor
ai agent edit coder

# Remove agent
ai agent remove coder

# Configure agent settings (interactive)
ai agent configure coder

# Manage personality traits
ai agent traits coder              # Multi-select interface with 100+ traits
ai agent trait-add coder           # Add single trait with autocomplete
ai agent trait-remove coder        # Remove single trait

# Manage expertise
ai agent expertise-add coder       # Add area of expertise
ai agent expertise-remove coder    # Remove area of expertise

# Manage custom attributes
ai agent attribute-add coder       # Add custom key-value attribute
ai agent attribute-remove coder    # Remove custom attribute

# Import/Export
ai agent export coder ./coder-agent.json
ai agent import ./coder-agent.json

# Install agents as executables
ai agent install
# Now you can run: coder "your prompt"

# Show current session performance status
ai agent status

# Compact a session to reduce context usage
ai agent compact <session-id>
```

**Agent Personality Traits:**

Choose from 100+ personality traits across three categories:
- **Positive**: Helpful, Creative, Analytical, Patient, Thorough, etc.
- **Neutral**: Direct, Formal, Casual, Technical, Concise, etc.
- **Negative**: Sarcastic, Pessimistic, Impatient, etc. (use sparingly!)

Traits are automatically included in the agent's system prompt.

### `ai profile` - User Profiles

Manage user profiles to personalize AI interactions.

```bash
# Show current profile
ai profile show

# Create new profile
ai profile new developer

# Select profile
ai profile select developer

# Edit in your default editor
ai profile edit

# Edit specific profile
ai profile edit developer

# Add attributes
ai profile add role "Senior Developer"
ai profile add expertise '["typescript","docker","ai"]'
ai profile add preferences '{"code_style": "functional"}'

# Remove attribute
ai profile remove role

# Import/Export
ai profile export ./my-profile.json
ai profile import ./my-profile.json
```

### `ai session` - Session Management

Manage chat sessions for single-agent interactions.

```bash
# List all sessions
ai session ls

# Show session details
ai session show session-coder

# Open session in pager (less)
ai session open session-coder

# Remove last message(s)
ai session pop [count]

# Create new session
ai session new my-session

# Remove session
ai session remove session-coder

# Remove all sessions and meetings
ai session reset

# Import/Export
ai session export session-coder ./my-session.json
ai session import ./my-session.json
```

**Note:** Most users won't need to manage sessions manually. Sessions are created automatically when you run agents and meetings.

### `ai status` - System Status

Check installation and validate all dependencies.

```bash
ai status
```

Shows:
- Node.js version and compatibility
- Docker status and version
- Available Docker AI models
- MCP server availability
- Storage statistics (profiles, agents, sessions)
- llama.cpp endpoint health

## Multi-Agent Collaboration Examples

### Strategic Planning Meeting

```bash
ai meeting start strategy-session ceo cto cfo

> What should be our top priorities for Q1?

ceo: We need to focus on three areas: market expansion, product quality,
     and team growth. @cto what's our technical capacity for scaling?

cto: We can handle 2x growth with current infrastructure, but we'll need
     to invest in automation. @cfo what's our budget situation?

cfo: We have $500K allocated for Q1. I recommend 40% for infrastructure,
     40% for hiring, and 20% for marketing. @ceo does that align with
     your strategy?

ceo: Perfect. Let's prioritize hiring first, then infrastructure...
```

### Technical Design Review

```bash
ai meeting start design-review architect developer qa

> We need to design the authentication system

architect: I recommend OAuth2 with JWT tokens. @developer how would you
          implement the token refresh flow?

developer: I'd use a sliding window approach with 15-min access tokens
          and 7-day refresh tokens. @qa what are the security test cases
          we should cover?

qa: We need to test token expiration, refresh flows, and logout scenarios...
```

### Research & Analysis

```bash
ai meeting start research analyst scientist writer

> Analyze the impact of AI on software development

analyst: I'll gather the current market data and trends.

scientist: I can provide the technical research on AI capabilities.

writer: I'll synthesize both perspectives into a comprehensive report.

> Great! Analyst, please start with the market overview

analyst: Based on recent data, 78% of development teams are now using AI...
```

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

[MEETING CONTEXT - if in a meeting]
[List of participants, their roles, @mention instructions, etc.]
```

### Example Agent Configuration

```json
{
  "name": "coder",
  "model": "ai/llama3.2:latest",
  "systemPrompt": "You are an expert software developer.",
  "modelParams": {
    "ctxSize": 8192,
    "maxTokens": 2048,
    "temperature": 0.7
  },
  "attributes": {
    "name": "Senior Developer",
    "nickname": "Dev",
    "expertise": ["typescript", "python", "docker"],
    "personality": ["analytical", "thorough", "helpful"]
  }
}
```

### Example Profile Configuration

```json
{
  "name": "default",
  "attributes": {
    "name": "Rob Higgins",
    "role": "Engineering Lead",
    "expertise": ["architecture", "devops"],
    "preferences": {
      "code_style": "functional",
      "documentation": "detailed"
    }
  }
}
```

This provides rich context to every AI interaction, making responses more personalized and relevant.

## Advanced Features

### Session Compaction

When sessions get too large and approach context limits:

```bash
# In interactive mode
/compact

# Or via command
ai agent compact session-coder
```

The system will:
1. Summarize the conversation history using AI
2. Replace old messages with the summary
3. Preserve recent context for continuity
4. Reduce token usage while maintaining context

### Agent Executables

Install agents as direct commands:

```bash
ai agent install

# Now run agents directly
coder "Write a React component for a todo list"
pm "Create a project timeline"
writer "Draft a blog post about AI"
```

Executables are created in `~/.local/bin/` and symlinked to your PATH.

### Archive & Restore

Save important conversations:

```bash
# In a meeting or chat
/clear

# Later, list archives
ai meeting restore

# Restore specific conversation
ai meeting restore project-planning-2024-11-06
```

Archives preserve:
- All messages and responses
- Meeting metadata and participants
- Session settings and configuration

## Storage

All data is stored in `~/.ai/`:

```
~/.ai/
├── config.json          # Global configuration
├── profiles/            # User profiles
│   └── default.json
├── agents/              # Agent configurations
│   ├── ceo.json
│   ├── cto.json
│   └── developer.json
├── sessions/            # Chat history (single-agent)
│   └── session-coder.json
├── meetings/            # Meeting room sessions
│   └── room-executive-team.json
├── archives/            # Archived conversations
│   └── project-planning-2024-11-06.json
└── bin/                 # Agent executables
    ├── ceo
    ├── cto
    └── developer
```

## Docker AI Models

This tool uses Docker AI Models via llama.cpp HTTP endpoints.

### Supported Models

- `ai/llama3.2:latest` - Meta's Llama 3.2 (recommended)
- `ai/mistral:latest` - Mistral AI
- `ai/gemma:latest` - Google Gemma
- `ai/phi:latest` - Microsoft Phi
- `ai/qwen:latest` - Alibaba Qwen
- `ai/deepseek:latest` - DeepSeek
- And many more...

### Managing Models

```bash
# Pull a model using Docker AI Models
docker model pull ai/llama3.2:latest

# List available models
docker model ls

# Check running models
docker model ps

# Models are automatically served via llama.cpp at:
# http://localhost:12434/engines/llama.cpp/v1/chat/completions
```

### Model Selection

Different models have different characteristics:

- **Llama 3.2**: Balanced, good for general use
- **Mistral**: Fast, efficient for coding tasks
- **Phi**: Small but capable, good for lower-end hardware
- **DeepSeek**: Strong for technical and coding tasks

Configure per agent in their configuration file.

## Use Cases

### Software Development Team

Create a virtual dev team:

```bash
ai agent new architect    # System design and architecture
ai agent new developer    # Implementation and coding
ai agent new qa           # Testing and quality assurance
ai agent new devops       # Infrastructure and deployment

ai meeting start sprint-planning architect developer qa devops
```

### Business Analysis

Create a strategic team:

```bash
ai agent new ceo          # Strategic direction
ai agent new cfo          # Financial planning
ai agent new coo          # Operations
ai agent new cmo          # Marketing strategy

ai meeting start quarterly-review ceo cfo coo cmo
```

### Content Creation

Create a content team:

```bash
ai agent new writer       # Content writing
ai agent new editor       # Editing and refinement
ai agent new researcher   # Fact-checking and research
ai agent new seo          # SEO optimization

ai meeting start blog-creation writer editor researcher seo
```

### Educational Support

Create a learning team:

```bash
ai agent new teacher      # Explains concepts
ai agent new tutor        # Provides practice problems
ai agent new mentor       # Career guidance
ai agent new reviewer     # Reviews work

ai meeting start study-session teacher tutor mentor reviewer
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

# Or use the npm script
npm start status

# Link globally for testing
npm link
ai status
```

### Testing

This project has comprehensive test coverage with **124 tests** covering core functionality.

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Type checking
npm run typecheck
```

#### Test Coverage

**Overall Coverage: ~20%** with excellent coverage of critical business logic:

| Module | Coverage | Lines | Description |
|--------|----------|-------|-------------|
| **config.ts** | 100% | ✅ All | Configuration management |
| **prompt-builder.ts** | 100% | ✅ All | Dynamic prompt generation |
| **storage.ts** | 87.86% | ✅ High | Data persistence & sessions |
| **stream-handler.ts** | 82.14% | ✅ High | Token streaming |
| **meeting-interactive.ts** | 25.39% | ✅ Core | Multi-agent coordination |
| **slash-commands.ts** | 30.88% | ✅ Core | Command handling |

**What's Tested:**
- ✅ **Meeting Flow** (30 tests) - Agent-to-agent communication, message parsing, session management
- ✅ **Storage Operations** (26 tests) - All CRUD operations, agent locking, archives
- ✅ **Configuration** (7 tests) - All config operations
- ✅ **Prompt Building** (5 tests) - System prompt generation
- ✅ **Stream Handling** (8 tests) - Token streaming and completion
- ✅ **Slash Commands** (18 tests) - Command parsing and validation
- ✅ **Message Targeting** (12 tests) - @mentions, comma-prefix, broadcast modes
- ✅ **Docker Model Management** (4 tests) - Model lifecycle

**Test Suites:**
```
✅ 124 tests passing
📦 30 test suites
🎯 Zero failing tests
⚡ ~190ms execution time
```

Lower coverage areas are CLI entry points that require integration testing with terminal I/O and user prompts. The **core business logic has excellent coverage**.

### Project Structure

```
ai/
├── src/
│   ├── commands/           # CLI commands
│   │   ├── run.ts         # Single agent execution
│   │   ├── meeting.ts     # Multi-agent meetings
│   │   ├── agent.ts       # Agent management
│   │   ├── profile.ts     # Profile management
│   │   ├── session.ts     # Session management
│   │   └── status.ts      # System status
│   ├── lib/               # Core libraries
│   │   ├── interactive.ts # Single-agent interactive mode
│   │   ├── meeting-interactive.ts # Multi-agent mode
│   │   ├── slash-commands.ts      # Single-agent commands
│   │   ├── meeting-slash-commands.ts # Meeting commands
│   │   ├── prompt-builder.ts      # Dynamic prompt generation
│   │   ├── storage.ts     # File-based storage
│   │   └── stream-handler.ts      # Response streaming
│   ├── types/             # TypeScript types
│   │   ├── agent.ts
│   │   ├── meeting.ts
│   │   ├── session.ts
│   │   └── ...
│   └── data/
│       └── personality.json # 100+ personality traits
├── tests/                  # Test files
├── docs/                   # Documentation
│   ├── MEETING_COMMAND.md
│   ├── AGENT_WORKFLOW.md
│   └── ...
├── example/               # Example configurations
│   ├── ceo.json
│   ├── cto.json
│   └── ...
├── bin/                   # Executable entry point
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
2. Update `CHANGELOG.md`
3. Commit and push to `main`
4. Create annotated tag: `git tag -a v0.0.8 -m "Release notes"`
5. Push tag: `git push origin v0.0.8`
6. GitHub Actions will automatically create a release and publish to NPM

## Documentation

- [Meeting Command Guide](docs/MEETING_COMMAND.md) - Comprehensive multi-agent documentation
- [Agent Workflow](docs/AGENT_WORKFLOW.md) - Agent creation and management
- [Show Command](docs/SHOW_COMMAND.md) - Debugging agent configurations
- [Status Command](docs/STATUS_COMMAND.md) - System status and diagnostics
- [Development Guide](docs/DEVELOPMENT.md) - Contributing and building
- [Release Process](docs/RELEASING.md) - How to create releases

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. **Add tests for new functionality** ✅
5. **Ensure all tests pass** (`npm test`) - We maintain 100% pass rate
6. **Run coverage report** (`npm run test:coverage`) to verify coverage
7. Update documentation as needed
8. Submit a pull request

**Testing Guidelines:**
- All new features should include unit tests
- Core business logic should have >80% coverage
- Tests should be clear and descriptive
- Use the existing test patterns as examples

### Ideas for Contributions

- **Test Coverage** - Help increase coverage of CLI commands and interactive modes
- Additional personality traits
- New slash commands for meetings
- MCP tool integrations
- Performance optimizations
- Example agent configurations
- Documentation improvements
- Integration tests for terminal I/O
- Docker CLI mocking for model management tests

## Roadmap

### Planned Features

- **Meeting Templates**: Pre-configured teams for common scenarios
- **Agent Voting**: Agents vote on decisions
- **Meeting Recordings**: Export meeting transcripts in various formats
- **Dynamic Agent Joining**: Add/remove agents mid-meeting without restart
- **Visual Meeting Dashboard**: Web-based UI for meeting visualization
- **Agent Learning**: Agents remember past interactions across sessions
- **Custom MCP Tools**: Easier tool creation and integration
- **Multi-Model Meetings**: Different agents using different LLMs

### Community Requests

Have an idea? [Open an issue](https://github.com/higginsrob/ai/issues) on GitHub!

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
docker model pull ai/llama3.2:latest

# Check if models are running
docker model ps

# The endpoint should be available at:
# http://localhost:12434/engines/llama.cpp/v1/chat/completions
```

### Agent Already Locked

If you see "Agent is currently busy in another session":

```bash
# Find the process
ps aux | grep "ai meeting\|ai run"

# Kill the process
kill <pid>

# Or force unlock (in case of crashed session)
# The agent will auto-unlock after process termination
```

### Permission Issues with `ai agent install`

Try installing to `~/.local/bin` instead:

```bash
mkdir -p ~/.local/bin
ai agent install
```

Then add to your PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Meeting Agents Self-Addressing

If agents mention themselves (e.g., "@dev to @dev"):

```bash
# Check the agent's configuration
ai meeting show <agent-name>

# Verify the agent has proper attributes
ai agent show <agent-name>

# Add missing attributes
ai agent edit <agent-name>
```

Ensure each agent has at minimum:
- `name` - Full name
- `nickname` - Short handle for @mentions

See [docs/SHOW_COMMAND.md](docs/SHOW_COMMAND.md) for debugging techniques.

## FAQ

**Q: Do I need API keys or cloud services?**  
A: No! Everything runs locally on your machine using Docker AI Models.

**Q: How much RAM/CPU do I need?**  
A: Minimum 8GB RAM recommended. Performance scales with hardware. Smaller models (phi, gemma) work on 4GB.

**Q: Can I use OpenAI or Anthropic models?**  
A: Not currently. This tool is designed for local Docker AI Models. Cloud integration may come in future releases.

**Q: How many agents can be in a meeting?**  
A: Technically unlimited, but 3-5 agents is optimal for coherent conversations.

**Q: Can agents see each other's messages?**  
A: Yes! All agents in a meeting share the same conversation history.

**Q: How do I stop agents from talking too much to each other?**  
A: Use `/chain-length 0` to disable agent-to-agent chaining, or set it to a low number like 2-3.

**Q: Can I use this for production applications?**  
A: This is primarily a development and exploration tool. For production, consider additional error handling and monitoring.

**Q: Is my data private?**  
A: Yes! Everything runs locally. No data is sent to external servers.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Rob Higgins

## Links

- [GitHub Repository](https://github.com/higginsrob/ai)
- [npm Package](https://www.npmjs.com/package/@higginsrob/local-ai)
- [Issues](https://github.com/higginsrob/ai/issues)
- [Documentation](https://github.com/higginsrob/ai/tree/main/docs)

---

**Happy Multi-Agent Collaborating! 🤖🤝🤖**
