// Server-side proxy. No database credentials or backend secrets enter client code.
export async function OPTIONS(req: Request) {
  const reqOrigin = req.headers.get('origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': reqOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie, x-order-token, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function proxy(req: Request) {
  const reqOrigin = req.headers.get('origin') || '*';
  const origin = process.env.BACKEND_ORIGIN || 'http://localhost:4000';
  const url = new URL(req.url);
  const target = new URL(url.pathname + url.search, origin);
  const headers = new Headers();
  for (const key of ['content-type', 'cookie', 'x-order-token', 'origin', 'authorization']) {
    const v = req.headers.get(key);
    if (v) headers.set(key, v);
  }

  try {
    const r = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
      redirect: 'manual',
    });

    const out = new Headers();
    for (const key of ['content-type', 'set-cookie']) {
      const value = r.headers.get(key);
      if (value) out.set(key, value);
    }
    out.set('Access-Control-Allow-Origin', reqOrigin);
    out.set('Access-Control-Allow-Credentials', 'true');
    out.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    out.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie, x-order-token, Origin');
    out.set('Cache-Control', 'no-store');

    return new Response(r.body, { status: r.status, headers: out });
  } catch {
    return Response.json(
      { error: 'Kitchen service is unavailable. Please try later.' },
      {
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': reqOrigin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie, x-order-token, Origin',
        },
      }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
