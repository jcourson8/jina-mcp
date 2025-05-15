# Unofficial Jina Reader MCP Server on Vercel

This project provides an **unofficial** wrapper for the [Jina Reader API](https://jina.ai/reader/) using the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). It allows Language Models (LLMs) and other MCP-compatible clients to easily fetch, read, and process content from any URL in an LLM-friendly format, leveraging Jina Reader's capabilities.

## Key Features

This server primarily exposes the `fetch_url_content` tool, which allows you to:
- Fetch content from a given URL.
- Optionally provide a Jina Reader API key for higher rate limits.
- Control various aspects of the fetching and parsing process through parameters that map to Jina Reader API headers, such as:
  - Image alt text generation (`X-With-Generated-Alt`)
  - Cookie forwarding (`X-Set-Cookie`)
  - Output formats (markdown, html, text, screenshot URL via `X-Respond-With`)
  - Proxy usage (`X-Proxy-Url`)
  - Caching behavior (`X-Cache-Tolerance`, `X-No-Cache`)
  - CSS selectors for targeting or waiting for content (`X-Target-Selector`, `X-Wait-For-Selector`)
  - Request timeout (`X-Timeout`)
  - Requesting JSON output or using POST for the URL.

**Disclaimer:** This is an unofficial project and is not affiliated with or endorsed by Jina AI.
