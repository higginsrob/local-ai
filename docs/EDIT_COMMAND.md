# Edit Command Documentation

## Overview

The `edit` subcommand allows you to directly edit agent and profile JSON configuration files in your default editor.

## Commands

### Agent Edit

Edit an agent's configuration file:

```bash
ai agent edit <agent-name>
```

**Example:**
```bash
# Edit the 'coder' agent
ai agent edit coder
```

This will:
1. Verify the agent exists
2. Open `~/.ai/agents/<agent-name>.json` in your default editor
3. Wait for you to save and close the editor
4. Validate the JSON is valid
5. Show success or error message

### Profile Edit

Edit a profile's configuration file:

```bash
ai profile edit [profile-name]
```

**Example:**
```bash
# Edit current profile
ai profile edit

# Edit a specific profile
ai profile edit developer
```

This will:
1. Use current profile if no name provided
2. Verify the profile exists
3. Open `~/.ai/profiles/<profile-name>.json` in your default editor
4. Wait for you to save and close the editor
5. Validate the JSON is valid
6. Show success or error message

## Editor Selection

The command uses your default editor in this order:
1. `$EDITOR` environment variable
2. `$VISUAL` environment variable
3. Falls back to `vi`

**Set your editor:**
```bash
# In ~/.bashrc or ~/.zshrc
export EDITOR=nano
# or
export EDITOR=code  # VS Code
# or
export EDITOR=vim
```

## JSON Validation

After editing, the command validates that the JSON is properly formatted:

**Success:**
```
✓ Agent test-editor updated
```

**Error:**
```
✗ Invalid JSON in agent file
The file was not saved or contains invalid JSON
```

## Use Cases

### Quick Configuration Changes

For personality traits, use the interactive traits command. For other custom attributes, edit the JSON directly:

```bash
ai agent edit my-agent
```

Then modify the JSON:
```json
{
  "name": "my-agent",
  "model": "llama3",
  "systemPrompt": "You are an expert coder",
  "tools": ["filesystem", "search", "git"],
  "mcpServers": ["docker://mcp-filesystem"],
  "modelParams": {
    "ctxSize": 8192,
    "maxTokens": 4096,
    "temperature": 0.8,
    "topP": 0.95,
    "topN": 50
  },
  "attributes": {
    "specialty": "code-review",
    "languages": ["typescript", "python", "rust"]
  }
}
```

### Bulk Profile Updates

Edit multiple attributes at once:

```bash
ai profile edit developer
```

Modify the profile:
```json
{
  "name": "developer",
  "attributes": {
    "role": "Senior Full-Stack Developer",
    "expertise": ["typescript", "react", "node.js", "docker", "kubernetes"],
    "preferences": {
      "codeStyle": "functional",
      "testing": "jest",
      "linting": "strict"
    },
    "projects": ["web-app", "api-server", "cli-tools"]
  }
}
```

## Safety Features

- **Validation**: JSON is validated after editing
- **Error Handling**: Clear error messages if JSON is invalid
- **No Auto-Save**: Changes only apply when you save and exit the editor
- **Backup**: Original file remains if you exit editor without saving

## Tips

1. **Use a JSON-aware editor** for syntax highlighting and validation
2. **Keep backups** of important configurations using `export`
3. **Test changes** with `show` command after editing
4. **Format JSON** with 2-space indentation for consistency

## Examples

### Adding Multiple Tools at Once

```bash
ai agent edit my-agent
```

Change:
```json
"tools": ["filesystem"]
```

To:
```json
"tools": ["filesystem", "search", "git", "docker", "kubernetes"]
```

### Complex Profile Setup

```bash
ai profile edit
```

Set up a complete developer profile:
```json
{
  "name": "default",
  "attributes": {
    "role": "AI-Assisted Developer",
    "expertise": ["typescript", "docker", "ai", "mcp"],
    "preferences": {
      "editor": "cursor",
      "terminal": "zsh",
      "theme": "dark"
    },
    "context": {
      "company": "Tech Startup",
      "team": "Platform Engineering",
      "timezone": "PST"
    }
  },
  "createdAt": "2025-11-05T00:00:00.000Z",
  "updatedAt": "2025-11-05T22:39:00.000Z"
}
```

## See Also

- `ai agent show <name>` - View agent configuration
- `ai profile show` - View profile configuration
- `ai agent export <name> <file>` - Export agent to file
- `ai profile export <file>` - Export profile to file

