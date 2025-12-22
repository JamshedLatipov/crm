// Small pure helper utilities extracted from the large softphone component
// to keep the component file focused and easier to split further.

export function generateClientCallId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Try to extract a stable identifier from a JsSIP session-like object
export function getSessionCallKey(session: any): string | null {
  try {
    if (!session) return null;
    if (session.__clientCallId) return String(session.__clientCallId);
    if (session.call_id) return String(session.call_id);
    if (session.id) return String(session.id);
    // try to read SIP Call-ID from request headers if present
    try {
      const hdr =
        session.request?.getHeader?.('Call-ID') ??
        session.request?.headers?.['call-id']?.[0]?.raw;
      if (hdr) return String(hdr);
    } catch {
      /* ignore */
    }
    return null;
  } catch {
    return null;
  }
}

export function extractDigits(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/\+?\d+/g);
  if (!m) return raw.replace(/\D/g, '');
  return m.join('');
}

export function cleanClipboardNumber(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[^0-9*#+]/g, '');
}

export function formatDurationFromStart(startMs: number | null): string {
  if (!startMs) return '00:00';
  const diff = Math.floor((Date.now() - startMs) / 1000);
  const mm = String(Math.floor(diff / 60)).padStart(2, '0');
  const ss = String(diff % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
