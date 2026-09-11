import { api } from './kitchen';

// Session management
export function getVisitorSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('kitchen_visitor_session_id');
  if (!id) {
    const rand = Math.random().toString(36).substring(2, 7);
    id = `sess_${rand}_${Date.now().toString(36)}`;
    sessionStorage.setItem('kitchen_visitor_session_id', id);
  }
  return id;
}

export function getDeviceType(): 'Mobile' | 'Tablet' | 'Desktop' {
  if (typeof window === 'undefined') return 'Desktop';
  const w = window.innerWidth;
  if (w < 640) return 'Mobile';
  if (w < 1024) return 'Tablet';
  return 'Desktop';
}

let sessionStartTime = typeof window !== 'undefined' ? Date.now() : 0;

export function trackVisitorEvent(eventType: string, target?: string, details?: any) {
  if (typeof window === 'undefined') return;
  const sessionId = getVisitorSessionId();
  const durationSeconds = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
  const device = getDeviceType();

  api('public/madhurawada/track', 'POST', {
    sessionId,
    eventType,
    target,
    details,
    device,
    durationSeconds,
  }).catch(() => {
    // Silent fail for non-blocking telemetry
  });
}
