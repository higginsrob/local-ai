# Changelog

## [Unreleased]

### Added
- **Agent-Based Execution** - `ai run <agent-name>` now loads full agent configuration
  - Automatically uses agent's model, system prompt, and all parameters
  - Sets agent as current when specified
  - Stores agent name in session for context
  - Command-line options override agent defaults
  - Supports both agent names and model names: `ai run coder` or `ai run llama3`
- **Agent Executables** - `ai agent install` creates wrapper executables
  - Generates bash wrapper scripts for each agent
  - Installs to `~/.local/bin` (or `/usr/local/bin`)
  - Simple wrapper: `#!/bin/bash\nexec ai run <agent-name> "$@"`
  - Allows running agents directly: `coder "your prompt"`
  - Auto-detects if PATH setup needed
- **Dynamic System Prompt with Attributes** - System prompts now automatically include agent and user attributes
  - Base system prompt from agent configuration
  - `# Agent Attributes` section with formatted agent attributes
  - `# User Attributes` section with formatted profile attributes
  - Automatic formatting of arrays, objects, and nested structures
  - CamelCase keys automatically split into readable format
  - New `buildSystemPrompt()` utility in `src/lib/prompt-builder.ts`
  - Full test coverage for prompt building
- **`ai agent edit <name>`** - Edit agent JSON config in default editor
  - Opens agent configuration file in $EDITOR (or $VISUAL, falls back to vi)
  - Validates JSON after editing
  - Shows success/error message
- **`ai profile edit [name]`** - Edit profile JSON config in default editor
  - Opens profile configuration file in $EDITOR (or $VISUAL, falls back to vi)
  - Defaults to current profile if no name provided
  - Validates JSON after editing
  - Shows success/error message
- Ctrl+C handler for graceful exit in interactive mode
  - Pressing Ctrl+C will save the session before exiting
  - Shows "Interrupted. Saving session..." message
  - Properly cleans up signal handlers
- Support for `/x` as an additional exit command
- Updated help text to show all exit options including Ctrl+C

### Changed
- **Moved `ai install` to `ai agent install`** for better organization
- **`ai run` now accepts agent OR model name** - checks for agent first, falls back to model
- Docker AI Models detection now uses `docker model ls --json` instead of `docker images`
- llama.cpp endpoint updated to `http://localhost:12434/engines/llama.cpp/v1/chat/completions`
- Added 5-minute timeout for vision model support
- Improved model name extraction from Docker AI Models JSON format
- Session now stores `agentName` for better context tracking

### Fixed
- **Names with slashes in file paths** - Agent, profile, and session names with slashes (like `openai/gpt-4`) now work correctly
  - Added sanitization to replace slashes with double underscores in file names
  - File stored as `openai__gpt-4.json` but displayed as `openai/gpt-4`
  - Fully reversible transformation for listing operations
  - Added comprehensive tests for slash handling
- Interactive mode now properly handles Ctrl+C interruption
- Model names now display correctly from `docker model ls` output
