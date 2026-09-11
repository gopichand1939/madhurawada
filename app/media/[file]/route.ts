export async function GET(req: Request) { const origin = process.env.BACKEND_ORIGIN; if (!origin)
    return new Response('Unavailable', { status: 503 }); const url = new URL(req.url); if (!/^\/media\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(url.pathname))
    return new Response('Not found', { status: 404 }); try {
    const r = await fetch(new URL(url.pathname, origin));
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' } });
}
catch {
    return new Response('Unavailable', { status: 503 });
} }
