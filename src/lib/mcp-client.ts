import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "../server/mcp";

let client: Client | null = null;
let clientPromise: Promise<Client> | null = null;

export async function getMcpClient(): Promise<Client> {
  if (client) return client;
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const server = new McpServer({ name: "omnispect-x", version: "1.0.0" });
    registerAllTools(server);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const c = new Client({ name: "demo-agent", version: "1.0.0" });
    await c.connect(clientTransport);

    client = c;
    return c;
  })();

  return clientPromise;
}

// Helper to call a tool and parse the text response
export async function callMcpTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const c = await getMcpClient();
  const result = await c.callTool({ name, arguments: args });

  const content = result.content as Array<{ type: string; text?: string }> | undefined;
  const textContent = content?.find(
    (c) => c.type === "text"
  ) as { type: "text"; text: string } | undefined;

  if (!textContent) throw new Error(`MCP tool '${name}' returned no text content`);
  if (result.isError) throw new Error(`MCP tool '${name}' error: ${textContent.text}`);

  return JSON.parse(textContent.text) as T;
}
