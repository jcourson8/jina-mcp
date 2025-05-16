import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const origin = process.argv[2] || "https://rjina.vercel.app";

async function main() {
  console.log(`Connecting to MCP server at: ${origin}/mcp`);
  const transport = new StreamableHTTPClientTransport(new URL(`${origin}/mcp`));

  const client = new Client(
    {
      name: "example-client-streamable",
      version: "1.0.0",
    },
    {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {},
      },
    }
  );

  try {
    await client.connect(transport);
    console.log("Connected to server.");
    console.log("Server Capabilities:", client.getServerCapabilities());

    const availableTools = await client.listTools();
    console.log("Available Tools:", JSON.stringify(availableTools, null, 2));

    // Check if the fetch_url_content tool is available
    const fetchToolInfo = availableTools.tools.find(tool => tool.name === "fetch_url_content");

    if (fetchToolInfo) {
      console.log("\nAttempting to call 'fetch_url_content' tool...");
      const toolArgs = {
        url: "https://rjina.vercel.app/", // A test URL
        // apiKey: "your-jina-api-key", // Optional: replace with your key if you have one
        outputFormat: "text",        // Optional: try "markdown", "html", "screenshot"
        generateImageAlt: true,       // Optional
        noCache: true,                // Optional
        // targetSelector: "body",    // Optional
      };
      console.log("Calling with arguments:", toolArgs);

      const fetchResult = await client.callTool({
        name: "fetch_url_content",
        arguments: toolArgs,
      });

      console.log("\nResult from 'fetch_url_content':");
      if (fetchResult.isError) {
        console.error("Tool Error:", JSON.stringify(fetchResult.content, null, 2));
      } else {
        console.log(JSON.stringify(fetchResult.content, null, 2));
      }
    } else {
      console.log("'fetch_url_content' tool not found in server capabilities.");
    }

  } catch (error) {
    console.error("Error during MCP client operations:", error);
  } finally {
    if (client.isConnected) {
      console.log("\nClosing connection...");
      await client.close();
      console.log("Connection closed.");
    }
  }
}

main().catch(err => {
  console.error("Unhandled error in main:", err);
  process.exit(1);
});
