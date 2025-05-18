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

  // Google Flights SerpApi Tool
  const googleFlightsRawShape = {
    api_key: z.string().describe("Your SerpApi private key. This is a required parameter."),
    departure_id: z.string().optional().describe("Departure airport code(s) or location kgmid(s) (e.g., 'AUS', 'CDG,ORY', '/m/0vzm'). Separate multiple values with a comma."),
    arrival_id: z.string().optional().describe("Arrival airport code(s) or location kgmid(s) (e.g., 'LHR', 'CDG,ORY', '/m/04jpl'). Separate multiple values with a comma."),
    gl: z.string().optional().describe("Defines the country to use for the Google Flights search (e.g., 'us', 'uk'). See SerpApi Google countries page for a full list."),
    hl: z.string().optional().describe("Defines the language to use for the Google Flights search (e.g., 'en', 'es'). See SerpApi Google languages page for a full list."),
    currency: z.string().optional().describe("Defines the currency for returned prices (e.g., 'USD', 'EUR'). Defaults to 'USD'. See SerpApi Google Travel Currencies page."),
    flight_type: z.enum(["1", "2", "3"]).optional()
      .describe("Type of flights: '1' for Round trip (default), '2' for One way, '3' for Multi-city. If '3', use multi_city_json."),
    outbound_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional()
      .describe("Outbound date in YYYY-MM-DD format (e.g., '2025-05-19')."),
    return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional()
      .describe("Return date in YYYY-MM-DD format (e.g., '2025-05-25'). Required if flight_type is '1' (Round trip)."),
    travel_class: z.enum(["1", "2", "3", "4"]).optional()
      .describe("Travel class: '1' for Economy (default), '2' for Premium economy, '3' for Business, '4' for First."),
    multi_city_json: z.string().optional()
      .describe("JSON string for multi-city flights. Example: '[{\"departure_id\":\"CDG\",\"arrival_id\":\"NRT\",\"date\":\"2025-05-25\"},...]'. Required if flight_type is '3'."),
    show_hidden: z.boolean().optional().describe("Set to true to include hidden flight results. Defaults to false."),
    deep_search: z.boolean().optional().describe("Set to true for deep search (more precise results, longer response time). Defaults to false."),
    adults: z.number().int().min(0).optional().describe("Number of adults. Defaults to 1."),
    children: z.number().int().min(0).optional().describe("Number of children. Defaults to 0."),
    infants_in_seat: z.number().int().min(0).optional().describe("Number of infants in seat. Defaults to 0."),
    infants_on_lap: z.number().int().min(0).optional().describe("Number of infants on lap. Defaults to 0."),
    sort_by: z.enum(["1", "2", "3", "4", "5", "6"]).optional()
      .describe("Sorting order: '1' for Top flights (default), '2' for Price, '3' for Departure time, '4' for Arrival time, '5' for Duration, '6' for Emissions."),
    stops: z.enum(["0", "1", "2", "3"]).optional()
      .describe("Number of stops: '0' for Any stops (default), '1' for Nonstop only, '2' for 1 stop or fewer, '3' for 2 stops or fewer."),
    exclude_airlines: z.string().optional().describe("Comma-separated airline codes/alliances to exclude (e.g., 'UA,DL' or 'STAR_ALLIANCE'). Cannot be used with include_airlines."),
    include_airlines: z.string().optional().describe("Comma-separated airline codes/alliances to include (e.g., 'UA,DL' or 'STAR_ALLIANCE'). Cannot be used with exclude_airlines."),
    bags: z.number().int().min(0).optional().describe("Number of carry-on bags. Defaults to 0."),
    max_price: z.number().int().min(0).optional().describe("Maximum ticket price. Defaults to unlimited."),
    outbound_times: z.string().optional().describe("Outbound times range (e.g., '4,18' for 4am-7pm departure, or '4,18,3,19' for 4am-7pm departure and 3am-8pm arrival)."),
    return_times: z.string().optional().describe("Return times range. Format similar to outbound_times. Used if flight_type is '1'."),
    emissions: z.enum(["1"]).optional().describe("Emission level: '1' for Less emissions only."),
    layover_duration: z.string().optional().describe("Layover duration in minutes, comma-separated min,max (e.g., '90,330' for 1.5-5.5 hours)."),
    exclude_conns: z.string().optional().describe("Comma-separated connecting airport codes to exclude (e.g., 'CDG,AUS')."),
    max_duration: z.number().int().min(0).optional().describe("Maximum flight duration in minutes (e.g., 1500 for 25 hours)."),
    departure_token: z.string().optional().describe("Token for selecting a flight and getting returning flights (Round trip) or next leg flights (Multi-city). Cannot be used with booking_token."),
    booking_token: z.string().optional().describe("Token for getting booking options for selected flights. Cannot be used with departure_token. If used, date and Advanced Filters parameters might be ignored by SerpApi."),
    no_cache: z.boolean().optional().describe("Force SerpApi to fetch fresh results, ignoring cache. Cannot be used with async_search. Defaults to false."),
    async_search: z.boolean().optional().describe("Submit search to SerpApi asynchronously. Retrieve results later via Searches Archive API. Cannot be used with no_cache. Defaults to false."),
    zero_trace: z.boolean().optional().describe("Enterprise only. If true, SerpApi skips storing search parameters, files, and metadata. Defaults to false."),
  };

  const googleFlightsFullSchema = z.object(googleFlightsRawShape)
    .describe("Searches for flight information using the SerpApi Google Flights API. Allows detailed querying of flights, including departure/arrival locations, dates, passenger numbers, and advanced filters. Requires a SerpApi API key.")
    .refine(data => !(data.exclude_airlines && data.include_airlines), {
      message: "exclude_airlines and include_airlines cannot be used together.",
      path: ["exclude_airlines"], 
    }).refine(data => !(data.departure_token && data.booking_token), {
      message: "departure_token and booking_token cannot be used together.",
      path: ["departure_token"],
    }).refine(data => !(data.no_cache && data.async_search), {
      message: "no_cache and async_search cannot be used together.",
      path: ["no_cache"],
    }).refine(data => {
      if (data.flight_type === "1" && typeof data.return_date === 'undefined') {
        return false;
      }
      return true;
    }, {
      message: "return_date is required when flight_type is '1' (Round trip).",
      path: ["return_date"],
    }).refine(data => {
      if (data.flight_type === "3" && typeof data.multi_city_json === 'undefined') {
        return false;
      }
      return true;
    }, {
      message: "multi_city_json is required when flight_type is '3' (Multi-city).",
      path: ["multi_city_json"],
    });

  server.tool(
    "searchGoogleFlights", 
    googleFlightsRawShape,
    async (params: z.infer<z.ZodObject<typeof googleFlightsRawShape>>) => {
    let validatedParams;
    try {
      validatedParams = googleFlightsFullSchema.parse(params);
    } catch (validationError: any) {
      console.error("Input validation error for searchGoogleFlights:", validationError.errors);
      return {
        content: [{ type: "text", text: `Input validation error: ${validationError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}` }],
        isError: true,
      };
    }

    const { api_key, flight_type, async_search, ...restParams } = validatedParams;
    
    const queryParams = new URLSearchParams({
      engine: "google_flights",
      api_key: api_key,
    });

    if (typeof flight_type !== 'undefined') {
      queryParams.set("type", flight_type);
    }
    if (typeof async_search !== 'undefined') {
      queryParams.set("async", async_search.toString());
    }

    for (const [key, valueWithMaybeUndefined] of Object.entries(restParams)) {
      if (typeof valueWithMaybeUndefined !== 'undefined') {
        const value = valueWithMaybeUndefined;
        if (typeof value === 'boolean' || typeof value === 'number') {
          queryParams.set(key, value.toString());
        } else if (typeof value === 'string') { 
          queryParams.set(key, value);
        }
      }
    }

    const serpApiUrl = `https://serpapi.com/search.json?${queryParams.toString()}`;

    try {
      // @ts-ignore
      const response = await fetch(serpApiUrl);
      if (!response.ok) {
        // @ts-ignore
        const errorData = await response.text();
        console.error(`SerpApi Error (${response.status}): ${errorData}`);
        return {
          content: [{ type: "text", text: `Error fetching flight data from SerpApi: ${response.status} ${response.statusText}. Details: ${errorData}` }],
          isError: true,
        };
      }
      // @ts-ignore
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error: any) {
      console.error(`Network or other error calling SerpApi: ${error.message}`);
      return {
        content: [{ type: "text", text: `Failed to fetch flight data: ${error.message}` }],
        isError: true,
      };
    }
  });
});

export { handler as GET, handler as POST, handler as DELETE };
