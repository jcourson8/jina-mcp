import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

const handler = createMcpHandler((server) => {
  server.tool(
    "fetch_url_content",
    "Fetches content from a URL using Jina Reader API (r.jina.ai). Supports options like API key, image alt generation, cookie forwarding, output formats (markdown, html, text, screenshot URL), proxy, caching, CSS selectors, timeout, JSON output, and POST method for URLs with hash fragments.",
    {
      url: z.string().url().describe("The URL of the webpage to fetch content from."),
      apiKey: z.string().optional().describe("Optional Jina Reader API key for higher rate limits."),
      generateImageAlt: z.boolean().optional().describe("Set to true to generate alt text for images using a VLM (X-With-Generated-Alt: true)."),
      cookies: z.string().optional().describe("Cookie string to forward with the request (X-Set-Cookie)."),
      outputFormat: z.enum(["markdown", "html", "text", "screenshot"]).optional().describe("Desired output format (X-Respond-With). 'screenshot' returns a URL to the image."),
      proxyUrl: z.string().url().optional().describe("URL of a proxy server to use for the request (X-Proxy-Url)."),
      cacheTolerance: z.number().int().optional().describe("Cache tolerance in seconds. 0 means no cache (X-Cache-Tolerance)."),
      noCache: z.boolean().optional().describe("Set to true to bypass cache (equivalent to X-Cache-Tolerance: 0) (X-No-Cache: true)."),
      targetSelector: z.string().optional().describe("CSS selector to target a specific part of the page (X-Target-Selector)."),
      waitForSelector: z.string().optional().describe("CSS selector for an element to wait for before returning content (X-Wait-For-Selector)."),
      timeout: z.number().int().optional().describe("Maximum page load wait time in seconds (X-Timeout)."),
      jsonOutput: z.boolean().optional().describe("Set to true for JSON output (Accept: application/json). The content will be a JSON string."),
      usePostForUrl: z.boolean().optional().describe("Set to true to send the URL in the POST body (useful for URLs with # fragments)."),
    },
    async ({
      url,
      apiKey,
      generateImageAlt,
      cookies,
      outputFormat,
      proxyUrl,
      cacheTolerance,
      noCache,
      targetSelector,
      waitForSelector,
      timeout,
      jsonOutput,
      usePostForUrl,
    }: {
      url: string;
      apiKey?: string;
      generateImageAlt?: boolean;
      cookies?: string;
      outputFormat?: "markdown" | "html" | "text" | "screenshot";
      proxyUrl?: string;
      cacheTolerance?: number;
      noCache?: boolean;
      targetSelector?: string;
      waitForSelector?: string;
      timeout?: number;
      jsonOutput?: boolean;
      usePostForUrl?: boolean;
    }) => {
      try {
        const requestHeaders: HeadersInit = {};
        if (apiKey) requestHeaders['Authorization'] = `Bearer ${apiKey}`;
        if (generateImageAlt) requestHeaders['X-With-Generated-Alt'] = 'true';
        if (cookies) requestHeaders['X-Set-Cookie'] = cookies;
        if (outputFormat) requestHeaders['X-Respond-With'] = outputFormat;
        if (proxyUrl) requestHeaders['X-Proxy-Url'] = proxyUrl;
        if (typeof cacheTolerance === 'number') requestHeaders['X-Cache-Tolerance'] = String(cacheTolerance);
        if (noCache) requestHeaders['X-No-Cache'] = 'true';
        if (targetSelector) requestHeaders['X-Target-Selector'] = targetSelector;
        if (waitForSelector) requestHeaders['X-Wait-For-Selector'] = waitForSelector;
        if (typeof timeout === 'number') requestHeaders['X-Timeout'] = String(timeout);

        if (jsonOutput) {
          requestHeaders['Accept'] = 'application/json';
        }

        let response;
        const jinaBaseUrl = 'https://r.jina.ai/';

        if (usePostForUrl) {
          requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
          response = await fetch(jinaBaseUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: new URLSearchParams({ url }),
          });
        } else {
          response = await fetch(`${jinaBaseUrl}${url}`, { headers: requestHeaders });
        }

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Error fetching URL: ${response.status} ${response.statusText}. ${errorText}` }],
            isError: true,
          };
        }
        const textContent = await response.text();
        return {
          content: [{ type: "text", text: textContent }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Network error fetching URL: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
});

export { handler as GET, handler as POST, handler as DELETE };
