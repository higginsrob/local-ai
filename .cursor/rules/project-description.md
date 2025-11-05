# Local AI Agent Assistants Manager

## Project summary

The purpose of this project is to build a CLI tool that makes managing a fleet of local AI Assistants easier.  We leverage the awesome power of Docker AI Models and MCP tools to simplify complex dependency management.

## Technology stack

- Written in Typescript that runs natively in Node.js v23.6 or later
- Packaged and distributed as an NPM module
- Installed globally as a single executable "ai"
- Open sourced using Github
- Node Test Runner Testing framework (native test framework)
- 100% test coverage
- AI assistance managing documentation
- CI/CD using github publishes to NPM
- Powered by Docker and Docker AI Models

## CLI Commands

```bash
ai status       # check installation and validate dependencies
ai run          # run interactive chat with agent or model
ai profile      # configure user profile settings and attributes
ai agent        # manage agent models, attributes, configurations, and tools (includes install)
ai session      # manage agent chat history and attributes
```

### Usage: `ai run [--options] <agent|model> <prompt-text> [<more-prompt-text>...]`

The `run` command calls an AI agent or model with a text prompt. When an agent name is provided, it loads the full agent configuration (model, system prompt, parameters, tools, MCP servers). When a model name is provided, it uses default settings. This command uses HTTP calls into llama.cpp for better configuration, observability and control. We've enhanced the basic docker model calling capabilities with RAG, tool calling, memory, sessions, observability, feature flags (slash commands etc..), and guardrails. We implement these features as MCP tool calls whenever possible, so that our main executable is as light and simple as possible, whose main responsibility is a streaming orchestrator, tool call manager, and conversation loop controller.

### Usage: `ai run [--options] <agent|model>`

This runs an interactive prompt session, allowing the user to continually interact in a conversation loop. This interactive shell also allows "slash commands" that can control settings during runtime

OPTIONS

- `--ctx-size` - the amount of text in tokens, that the model can consider
- `--max-tokens` - the maximum response size
- `--temperature` - the level of randomness in the model's output
- `--top_p` - controls the range of probability (lower is more predictable)
- `--top_n` - top n accuracy sampling parameter (lower is more focused)
- `--mcp-servers` - enabled docker mcp servers
- `--tools` - enabled docker mcp tools
- `--tool-choice` - allow model to choose tool or force named function calling
- `--tool-call-mode` - can be 'native' or 'prompt' for better compatibility
- `--thinking` - show model thinking stream
- `--debug` - show agent, tool calling, and prompt status information

SLASH COMMANDS (executed by interactive loop)

- `/help` - show help text for slash commands in interactive mode
- `/clear` - clears the terminal screen
- `/save` - saves the current chat session to a file
- `/load` - loads a previous chat session from a file
- `/compact` - summarizes the current chat session and starts a new session with that new context
- `/reset` - resets the chat history for this session
- `/ctx-size <size>` - set the model context window size for future calls
- `/max-size <size>` - set the models max response size for future calls
- `/temperature <float>` - set the models temperature for future calls
- `/top_p <float>` - set the models top p for future calls
- `/top_n <float>` - set the models top n for future calls
- `/mcp-server enable <name>` - enables an mcp server for future calls
- `/mcp-server disable <name>` - disables an mcp server for future calls
- `/tool enable <name>` - enables a tool in future calls
- `/tool disable <name>` - disables a tool in future calls
- `/tool-choice <choice>` - sets tool choice for future calls
- `/tool-call-mode <mode>` - sets tool call mode for future calls
- `/thinking <boolean>` - sets thinking mode for future calls
- `/debug <boolean>` - sets debug mode for future calls
- `/quit`, `/q`, `/exit` `/e`, `/x` - exit the interactive session

### Usage: `ai profile [subcommand]`

SUBCOMMANDS:

- `show`                                    # show all user profile information
- `new <name>`                              # create a new profile and select that profile
- `select <name>`                           # select a different user profile
- `edit [name]`                             # edit profile in default editor (current if no name given)
- `add <attribute-name> <attribute-value>`  # add a user attribute to the current profile
- `remove <attribute-name>`                 # remove a user attribute from the current profile 
- `import`                                  # creates a user profile from a JSON file
- `export`                                  # exports a user profile as a JSON file

### Usage: `ai agent [subcommand]`

SUBCOMMANDS:

- `ls`                                                  # list all agent profiles
- `show <name>`                                         # show agent profile information
- `new <name>`                                          # create a new agent executable from an interactive form
- `edit <name>`                                         # edit agent in default editor
- `remove <name>`                                       # delete an agent executable
- `enable-tool <tool-name> <tool-value>`                # enables an mcp tool to the current profile
- `disable-tool <tool-name>`                            # disables an mcp tool from the current profile
- `add-attribute <attribute-name> <attribute-value>`    # add an agent attribute to the current profile
- `remove-attribute <attribute-name>`                   # remove an agent attribute from the current profile
- `import`                                              # creates an agent from a JSON file
- `export`                                              # exports agent as a JSON file
- `install`                                             # installs all agents as executables to PATH

### Usage: `ai session [subcommand]`

SUBCOMMANDS:

- `ls`                                                  # list all sessions with short one line summary of chat history
- `show <name>`                                         # show session information (metadata about each active agents chat history)
- `new <name>`                                          # create a new session (clean chat history)
- `remove <name>`                                       # delete a session
- `reset`                                               # deletes all sessions
- `import`                                              # restores session from a JSON file
- `export`                                              # exports session to a JSON file
