export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);

    // Clone headers to inject optimized caching and security
    const newHeaders = new Headers(response.headers);

    // Static Asset Caching Strategy
    if (
      url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.wasm') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.svg')
    ) {
      // Fingerprinted / immutable static assets: cache for 1 year
      newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      // HTML entry point: revalidate so new updates arrive instantly without stale cache
      newHeaders.set('Cache-Control', 'public, max-age=0, must-revalidate');
    } else {
      // Other static files (favicon, manifest, etc.)
      newHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    }

    // Modern Security & Performance headers
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
};
