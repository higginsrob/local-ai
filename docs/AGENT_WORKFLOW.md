# Agent Workflow Guide

## Overview

Agents are pre-configured AI assistants with specific models, parameters, tools, and attributes. This guide shows how to create, configure, and use agents effectively.

## Complete Workflow

### 1. Create an Agent

**Interactive Creation:**
```bash
ai agent new coder
```

You'll be prompted for:
- Agent name
- Model (llama3, mistral, gemma, etc.)
- System prompt
- Context size
- Max tokens
- Temperature

**Or Import from JSON:**
```bash
ai agent import ./my-agent.json
```

### 2. Configure Agent Attributes

**Option A: Edit directly in your editor**
```bash
ai agent edit coder
```

**Option B: Add attributes individually**
```bash
ai agent add-attribute specialty "code-review"
ai agent add-attribute languages '["typescript","python","rust"]'
ai agent enable-tool filesystem
ai agent enable-tool search
```

### 3. Run the Agent

**Single Prompt:**
```bash
ai run coder "Help me refactor this function"
```

**Interactive Mode:**
```bash
ai run coder
> Can you review my code?
> /save code-review-session
> /quit
```

### 4. Install as Executable

```bash
ai agent install
```

This creates wrapper scripts in `~/.local/bin/` (or `/usr/local/bin/`).

**Now run directly:**
```bash
coder "Explain this error message"
```

## Agent vs Model

### Using an Agent

```bash
ai run coder "write a function"
```

**What happens:**
- ✅ Loads agent configuration from `~/.ai/agents/coder.json`
- ✅ Uses agent's model (e.g., `llama3`)
- ✅ Uses agent's system prompt
- ✅ Uses agent's parameters (ctx-size, temperature, etc.)
- ✅ Enables agent's tools and MCP servers
- ✅ Includes agent attributes in system prompt
- ✅ Includes user profile attributes in system prompt
- ✅ Sets agent as current

### Using a Model Directly

```bash
ai run llama3 "write a function"
```

**What happens:**
- ✅ Uses model name directly
- ⚠️ Uses default system prompt
- ⚠️ Uses default parameters
- ⚠️ No tools or MCP servers enabled
- ⚠️ No agent attributes (only user attributes)
- ⚠️ No agent set as current

## Example Agent Configurations

### Code Review Agent

```json
{
  "name": "reviewer",
  "model": "llama3",
  "systemPrompt": "You are an expert code reviewer focusing on best practices, security, and performance.",
  "tools": ["filesystem", "git"],
  "mcpServers": ["docker://mcp-filesystem"],
  "modelParams": {
    "ctxSize": 8192,
    "maxTokens": 4096,
    "temperature": 0.5,
    "topP": 0.9,
    "topN": 40
  },
  "attributes": {
    "focus": ["security", "performance", "maintainability"],
    "checklistItems": [
      "Code style consistency",
      "Error handling",
      "Test coverage",
      "Documentation"
    ]
  }
}
```

**Usage:**
```bash
ai run reviewer "Review this PR"
reviewer "Check this function for security issues"
```

### Quick Scripting Agent

```json
{
  "name": "scripter",
  "model": "mistral",
  "systemPrompt": "You are a fast prototyping assistant. Generate working code quickly.",
  "tools": ["filesystem"],
  "mcpServers": [],
  "modelParams": {
    "ctxSize": 4096,
    "maxTokens": 2048,
    "temperature": 0.9,
    "topP": 0.95,
    "topN": 50
  },
  "attributes": {
    "style": "quick and pragmatic",
    "languages": ["bash", "python", "typescript"]
  }
}
```

**Usage:**
```bash
scripter "Write a script to parse JSON logs"
```

### Documentation Agent

```json
{
  "name": "docs",
  "model": "gemma3",
  "systemPrompt": "You are a technical documentation specialist. Create clear, comprehensive docs.",
  "tools": ["filesystem", "search"],
  "mcpServers": ["docker://mcp-filesystem"],
  "modelParams": {
    "ctxSize": 8192,
    "maxTokens": 4096,
    "temperature": 0.3,
    "topP": 0.85,
    "topN": 30
  },
  "attributes": {
    "format": "markdown",
    "style": "clear and beginner-friendly",
    "sections": ["overview", "examples", "troubleshooting"]
  }
}
```

**Usage:**
```bash
docs "Document this API endpoint"
```

## Advanced Features

### Override Agent Settings

Even when using an agent, you can override specific settings:

```bash
# Use coder agent but with higher temperature
ai run coder --temperature 1.0 "Be creative"

# Use coder agent but different context size
ai run coder --ctx-size 16384 "Analyze this large file"
```

### Agent Chaining

Use different agents for different tasks:

```bash
# Use coder to write the function
ai run coder "Write a authentication function" > auth.ts

# Use reviewer to review it
ai run reviewer "Review auth.ts"

# Use docs to document it
ai run docs "Document auth.ts"
```

### Session Management with Agents

Sessions remember which agent was used:

```bash
ai run coder
> Let's build a REST API
> /save api-project
> /quit

# Later, continue with same agent context
ai session show api-project
ai run coder  # Continues with coder agent
```

## Install Workflow

### One-Time Setup

```bash
# Create your agents
ai agent new coder
ai agent new reviewer
ai agent new docs

# Configure them
ai agent edit coder
ai agent edit reviewer
ai agent edit docs

# Install as executables
ai agent install

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Daily Usage

```bash
# Use agents directly
coder "Help me debug this"
reviewer "Review my PR"
docs "Document this feature"

# Or use full command
ai run coder "Complex task"
```

## Wrapper Script Details

When you run `ai agent install`, it creates scripts like:

```bash
#!/bin/bash
# AI Agent: coder
# Auto-generated executable wrapper

# Get the directory where ai is installed
AI_CMD="ai"

# Run the ai command with the agent name
exec $AI_CMD run coder "$@"
```

This means:
- Arguments are passed through: `coder "hello" --debug` → `ai run coder "hello" --debug`
- Works from any directory
- Requires `ai` to be in your PATH

## Tips

### 1. Specialize Agents

Create agents for specific tasks:
- `code-review` - For reviewing code
- `debugger` - For debugging issues
- `writer` - For documentation
- `researcher` - For research tasks

### 2. Share Agents

Export and share agent configurations:

```bash
ai agent export coder ./coder-config.json
# Share with team
# They import: ai agent import ./coder-config.json
```

### 3. Version Control Agents

Keep agent configs in your repo:

```bash
mkdir .ai-agents
ai agent export coder ./.ai-agents/coder.json
git add .ai-agents/
```

### 4. Profile + Agent Combo

Combine user profiles with specialized agents:

```bash
# Developer profile with expertise
ai profile edit  # Set role, expertise, preferences

# Code review agent with checklist
ai agent edit reviewer  # Set review criteria

# Perfect combination
ai run reviewer "Review this code"
```

## Troubleshooting

### Agent Not Found

```bash
ai agent ls  # List all agents
ai agent new <name>  # Create if missing
```

### Install Failed

```bash
# Try with sudo for system directories
sudo ai agent install

# Or ensure ~/.local/bin exists
mkdir -p ~/.local/bin
ai agent install
```

### Wrapper Not in PATH

```bash
# Check if ~/.local/bin is in PATH
echo $PATH | grep ".local/bin"

# Add if missing
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## See Also

- `ai agent ls` - List all agents
- `ai agent show <name>` - View agent configuration
- `ai agent edit <name>` - Edit agent in your editor
- `docs/SYSTEM_PROMPTS.md` - System prompt details
- `docs/EDIT_COMMAND.md` - Editing guide


