# Initialize Project

- Your task is to generate the instructions and rules files that contain information describing how a coding agent seeing it for the first time can work most efficiently.
- You will do this task only one time per repository and doing a good job can SIGNIFICANTLY improve the quality of the agent's work, so take your time, think carefully, and search thoroughly before writing the instructions.
- Provide the agent with all the information it needs to understand the codebase, build, test, validate, and demo changes.
- Minimize the amount of searching the agent has to do to understand the codebase each time.
- Explain the dev tooling to support the agent in building, testing, validating, and demoing changes.
- While performing this task if there are any ambiguous decisions you need to make, please pause to ask me for input before completing the task.
- Read the ./cursor/project-description.md file to understand the goals and structure of this project
- Write the ./cursor/generate-project.md file that will be used to build this repo from scratch



[Agent Response]

I've carefully read both files. This is an exciting project - a CLI tool for managing local AI assistants using Docker AI Models and MCP tools!

Before I create the comprehensive instructions and rules files, I have some questions that will help me provide the best guidance:

Questions About Architecture & Dependencies

MCP Servers & Tools: Are the MCP servers external dependencies that users install separately via Docker, or are you building custom MCP servers as part of this project?

1. Both.  We mostly want to use MCP servers that are managed from dockers new 'docker mcp' commands, but we may also want to build custom tools for specific features we want to add.

Docker AI Models: Should I assume you're using Docker's official AI Models feature? Which models should be supported by default (e.g., llama3, mistral, etc.)?

2. Correct.  By default we should be compatible with all of the models from 'docker mcp catalog ls', but the main ones are gemma, phi, llama3, mistral, gwen, gpt-oss, smolvlm, deepseek, deepcoder, devstral, magistral, granite etc..

llama.cpp Integration: You mention using HTTP calls to llama.cpp instead of docker model run. Should llama.cpp be:

A separate dependency users install?
Managed/bundled by this tool?
Accessed via Docker AI Models (which uses llama.cpp under the hood)?

3. Access via Docker AI Models llama.cpp completions endpoint

Storage Locations: Where should the tool store:
User profiles?
Agent configurations?
Session/chat history?
(e.g., ~/.ai/, ~/.config/ai/, ~/.local/share/ai/, etc.)

4. ~/.ai

Project Structure: What directory structure would you prefer?
   src/     commands/     lib/     types/   tests/   dist/

5. yes this is fine

Build Tooling: Which build approach?
Just TypeScript compiler (tsc)?
Bundler like esbuild or rollup?

6. no compiler.  Node v23.6 and greater offers type stripping to automatically use typescript.  We will need dev tools to test our typescript is valid, but it will automatically be removed while running

Package Manager: Preferred package manager (npm, yarn, pnpm)?
7. npm

RAG Implementation: Should RAG be:
Implemented as an external MCP tool?
Part of the core CLI?

8. RAG implemented as a tool call

9. Memory implemented as a tool call

10. Interactive prompt implemented in app

11. Slash commands, implemented in app

These answers will help me create precise, actionable instructions that minimize ambiguity and searching for future coding agents. Take your time!