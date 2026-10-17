import seed from '@/shared/seed.json';

export type RecordData = {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  sortOrder?: number;
  price?: number;
  veg?: boolean;
  bestseller?: boolean;
  categoryId?: string;
  sectionId?: string;
  itemId?: string;
  groupId?: string;
  image?: string;
  prepTime?: number;
  cta?: string;
  [key: string]: unknown;
};

export type Kitchen = typeof seed.kitchen;
export type Content = {
  kitchen: Kitchen;
  [key: string]: Kitchen | RecordData[];
};

export const sample = seed as unknown as Content;

// In browser client, always use relative same-origin /api/... calls so all requests go
// cleanly through the Next.js / Netlify proxy (no CORS issues, no referrer policy restrictions,
// and no direct backend URLs exposed in browser DevTools).
const API_BASE_URL = typeof window !== 'undefined'
  ? ''
  : (
      process.env.BACKEND_ORIGIN ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.VITE_API_BASE_URL ||
      'http://localhost:4000'
    ).trim().replace(/\/+$/, '');

export async function api(url: string, method = 'GET', body?: unknown, customHeaders?: Record<string, string>): Promise<any> {
  const cleanUrl = url.replace(/^\/?api\//, '');
  const fullUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : (API_BASE_URL ? `${API_BASE_URL}/api/${cleanUrl}` : `/api/${cleanUrl}`);

  const r = await fetch(fullUrl, {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...customHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data: any = await r.json();
  if (!r.ok) throw Error(data.error || 'Request failed');
  return data;
}

export const money = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
