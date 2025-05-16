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

  server.tool(
    "search",
    "Performs a web search using Jina Reader API (s.jina.ai). Supports various search parameters including type (web/images/news), provider (Google/Bing), language, location, and search operators.",
    {
      q: z.string().describe("The search query string."),
      apiKey: z.string().describe("Jina Reader API key for authentication."),
      type: z.enum(["web", "images", "news"]).optional().default("web").describe("Type of search results to return."),
      provider: z.enum(["google", "bing"]).optional().describe("Search provider to use."),
      count: z.number().int().min(0).max(20).optional().describe("Number of results to return (max 20)."),
      num: z.number().int().min(0).max(20).optional().describe("Alternative to count - number of results to return (max 20)."),
      gl: z.string().optional().describe("Geographic location - two-letter country code."),
      hl: z.string().optional().describe("Interface language code (e.g. 'en' for English)."),
      location: z.string().optional().describe("Location string for local search results."),
      page: z.number().int().optional().describe("Page number for paginated results."),
      fallback: z.boolean().optional().default(true).describe("Whether to use fallback options if primary search fails."),
      nfpr: z.boolean().optional().describe("No Foreign Page Results - only show pages in specified language."),
      ext: z.array(z.string()).optional().describe("File extensions to filter results by."),
      filetype: z.array(z.string()).optional().describe("File types to filter results by."),
      intitle: z.array(z.string()).optional().describe("Terms that must appear in the page title."),
      site: z.array(z.string()).optional().describe("Limit results to specific websites."),
      loc: z.array(z.string()).optional().describe("Language codes to filter results by."),
      outputFormat: z.enum(["json", "text"]).optional().describe("Response format (application/json or text/plain)."),
      noCache: z.boolean().optional().describe("Bypass cache for fresh results."),
      cacheTolerance: z.number().int().optional().describe("Cache tolerance in seconds."),
    },
    async ({
      q,
      apiKey,
      type = "web",
      provider,
      count,
      num,
      gl,
      hl,
      location,
      page,
      fallback = true,
      nfpr,
      ext,
      filetype,
      intitle,
      site,
      loc,
      outputFormat,
      noCache,
      cacheTolerance,
    }) => {
      try {
        const requestHeaders: HeadersInit = {};
        if (apiKey) requestHeaders['Authorization'] = `Bearer ${apiKey}`;
        if (outputFormat === 'json') requestHeaders['Accept'] = 'application/json';
        if (noCache) requestHeaders['X-No-Cache'] = 'true';
        if (typeof cacheTolerance === 'number') requestHeaders['X-Cache-Tolerance'] = String(cacheTolerance);

        const searchParams = new URLSearchParams();
        searchParams.append('q', q);
        if (type) searchParams.append('type', type);
        if (provider) searchParams.append('provider', provider);
        if (count) searchParams.append('count', String(count));
        if (num) searchParams.append('num', String(num));
        if (gl) searchParams.append('gl', gl);
        if (hl) searchParams.append('hl', hl);
        if (location) searchParams.append('location', location);
        if (page) searchParams.append('page', String(page));
        if (fallback !== undefined) searchParams.append('fallback', String(fallback));
        if (nfpr !== undefined) searchParams.append('nfpr', String(nfpr));
        if (ext?.length) ext.forEach(e => searchParams.append('ext', e));
        if (filetype?.length) filetype.forEach(f => searchParams.append('filetype', f));
        if (intitle?.length) intitle.forEach(t => searchParams.append('intitle', t));
        if (site?.length) site.forEach(s => searchParams.append('site', s));
        if (loc?.length) loc.forEach(l => searchParams.append('loc', l));

        const response = await fetch(`https://s.jina.ai/search?${searchParams.toString()}`, {
          headers: requestHeaders,
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Error performing search: ${response.status} ${response.statusText}. ${errorText}` }],
            isError: true,
          };
        }

        const responseText = await response.text();
        return {
          content: [{ type: "text", text: responseText }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Network error during search: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
});

export { handler as GET, handler as POST, handler as DELETE };
