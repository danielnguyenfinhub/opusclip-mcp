import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import { projectTools } from './tools/projects.js';
import { collectionTools } from './tools/collections.js';
import { socialTools } from './tools/social.js';
import { brandTools } from './tools/brand.js';
import type { ToolDef } from './tools/projects.js';

const ALL_TOOLS: ToolDef[] = [
  ...projectTools,
  ...collectionTools,
  ...socialTools,
  ...brandTools,
];

const PORT = parseInt(process.env.PORT || '3000', 10);

function buildServer(): McpServer {
  const server = new McpServer({
    name: 'OpusClip MCP',
    version: '1.0.0',
  });

  for (const t of ALL_TOOLS) {
    server.tool(
      t.name,
      t.description,
      t.inputSchema?.properties
        ? Object.fromEntries(
            Object.entries(t.inputSchema.properties).map(([key, val]: [string, any]) => {
              let schema: z.ZodTypeAny;
              if (val.type === 'string' && val.enum) {
                schema = z.enum(val.enum as [string, ...string[]]);
              } else if (val.type === 'string') {
                schema = z.string();
              } else if (val.type === 'number') {
                schema = z.number();
              } else if (val.type === 'boolean') {
                schema = z.boolean();
              } else if (val.type === 'array') {
                schema = z.array(z.string());
              } else {
                schema = z.any();
              }
              const required = t.inputSchema?.required || [];
              if (!required.includes(key)) {
                schema = schema.optional();
              }
              return [key, schema];
            })
          )
        : {},
      async (args: any) => {
        try {
          return await t.handler(args);
        } catch (err: any) {
          return { content: [{ type: 'text', text: `❌ Tool error: ${err.message}` }] };
        }
      }
    );
  }

  return server;
}

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    name: 'OpusClip MCP Server',
    version: '1.0.0',
    tools: ALL_TOOLS.length,
    toolNames: ALL_TOOLS.map(t => t.name),
    endpoint: '/mcp',
    status: 'ok',
  });
});

app.all('/mcp', async (req, res) => {
  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (err: any) {
    console.error('MCP error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ OpusClip MCP Server running on port ${PORT}`);
  console.log(`   Tools: ${ALL_TOOLS.length}`);
  console.log(`   Endpoint: http://localhost:${PORT}/mcp`);
});
