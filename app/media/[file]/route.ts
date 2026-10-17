export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

function resolveMediaTarget(reqUrl: string): URL {
  const url = new URL(reqUrl);
  let base = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    process.env.BACKEND_ORIGIN ||
    'http://localhost:4000'
  ).trim().replace(/\/+$/, '');

  if (base.endsWith('/api')) {
    base = base.slice(0, -4);
  }

  return new URL(url.pathname, base);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!/^\/media\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(url.pathname)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const target = resolveMediaTarget(req.url);
    const r = await fetch(target);
    return new Response(r.body, {
      status: r.status,
      headers: {
        'Content-Type': r.headers.get('content-type') || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
      },
    });
  } catch {
    return new Response('Unavailable', { status: 503 });
  }
}
