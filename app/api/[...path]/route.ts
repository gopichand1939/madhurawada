// Server-side proxy. No database credentials or backend secrets enter client code.
async function proxy(req: Request) { const origin = process.env.BACKEND_ORIGIN; if (!origin)
    return Response.json({ error: 'Backend is not connected. This site is a sample preview.' }, { status: 503 }); const url = new URL(req.url); const target = new URL(url.pathname + url.search, origin); const headers = new Headers(); for (const key of ['content-type', 'cookie', 'x-order-token', 'origin']) {
    const v = req.headers.get(key);
    if (v)
        headers.set(key, v);
} try {
    const r = await fetch(target, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(), redirect: 'manual' });
    const out = new Headers();
    for (const key of ['content-type', 'set-cookie']) {
        const value = r.headers.get(key);
        if (value)
            out.set(key, value);
    }
    out.set('Cache-Control', 'no-store');
    return new Response(r.body, { status: r.status, headers: out });
}
catch {
    return Response.json({ error: 'Kitchen service is unavailable. Please try later.' }, { status: 503 });
} }
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
