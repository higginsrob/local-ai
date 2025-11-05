// Tool calling orchestration
import type { ToolCall } from '../types/session.ts';
import type { MCPManager } from './mcp-client.ts';
import type { Tool } from '../types/docker-ai.ts';
import type { MCPTool } from '../types/mcp.ts';

export class ToolManager {
  private mcpManager: MCPManager;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
  }

  async getAvailableTools(): Promise<Tool[]> {
    const allTools = await this.mcpManager.getAllTools();
    const tools: Tool[] = [];

    for (const { server, tools: mcpTools } of allTools) {
      for (const mcpTool of mcpTools) {
        tools.push(this.convertMCPToolToOpenAITool(mcpTool, server));
      }
    }

    return tools;
  }

  private convertMCPToolToOpenAITool(mcpTool: MCPTool, server: string): Tool {
    return {
      type: 'function',
      function: {
        name: `${server}::${mcpTool.name}`,
        description: mcpTool.description,
        parameters: mcpTool.inputSchema,
      },
    };
  }

  async executeTool(toolCall: ToolCall): Promise<string> {
    const [server, toolName] = toolCall.function.name.split('::');
    
    if (!server || !toolName) {
      throw new Error(`Invalid tool name format: ${toolCall.function.name}`);
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await this.mcpManager.callTool(server, toolName, args);
      
      // Extract text content from MCP result
      if (result.content && result.content.length > 0) {
        const textContent = result.content
          .filter(c => c.type === 'text' && c.text)
          .map(c => c.text)
          .join('\n');
        return textContent || JSON.stringify(result);
      }
      
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async executeToolCalls(toolCalls: ToolCall[]): Promise<Array<{ tool_call_id: string; content: string }>> {
    const results: Array<{ tool_call_id: string; content: string }> = [];

    for (const toolCall of toolCalls) {
      const content = await this.executeTool(toolCall);
      results.push({
        tool_call_id: toolCall.id,
        content,
      });
    }

    return results;
  }
}

