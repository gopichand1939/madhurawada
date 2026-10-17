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

export async function GET(req: Request) {
  const origin = process.env.BACKEND_ORIGIN || 'http://localhost:4000';
  const url = new URL(req.url);
  if (!/^\/media\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(url.pathname)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const r = await fetch(new URL(url.pathname, origin));
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
