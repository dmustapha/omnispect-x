// Thin relay: forwards requests to web3.okx.com with all headers intact.
// Runs on Cloudflare's edge, bypassing client-side geo-restrictions.

const OKX_BASE = "https://web3.okx.com";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", proxy: "okx" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Forward everything under /api/* to OKX
    if (!url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    const target = `${OKX_BASE}${url.pathname}${url.search}`;

    // Clone headers, strip host
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ray");

    const res = await fetch(target, {
      method: request.method,
      headers,
      body: request.method !== "GET" ? request.body : undefined,
    });

    // Return response with CORS headers
    const responseHeaders = new Headers(res.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  },
};
