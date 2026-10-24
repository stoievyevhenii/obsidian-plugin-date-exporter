export type CopyResult = 'copied' | 'selected';

export function selectReport(area: HTMLTextAreaElement): void {
  area.focus();
  area.select();
  area.setSelectionRange(0, area.value.length);
}

/** Web APIs only. Keep the visible text selected when automatic copying fails. */
export async function copyReport(text: string, area: HTMLTextAreaElement): Promise<CopyResult> {
  const win = area.ownerDocument.defaultView;
  try {
    if (win?.navigator.clipboard?.writeText) {
      await win.navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch { /* Permission / WebView restrictions: try selection based copy. */ }
  selectReport(area);
  try {
    if (area.ownerDocument.execCommand?.('copy')) return 'copied';
  } catch { /* Leave selected for Android's native text menu. */ }
  return 'selected';
}

export type ShareResult = 'shared' | 'cancelled' | 'unavailable';
export async function shareReport(text: string, fileName: string, area: HTMLTextAreaElement): Promise<ShareResult> {
  const nav = area.ownerDocument.defaultView?.navigator;
  if (!nav?.share) return 'unavailable';
  // Invoke directly in the click handler; no vault I/O before navigator.share().
  let data: ShareData = { title: fileName, text };
  try {
    const file = new File([text], fileName, { type: 'text/plain;charset=utf-8' });
    if (nav.canShare?.({ files: [file] })) data = { title: fileName, files: [file] };
  } catch { /* If file sharing is unsupported, use text sharing. */ }
  try { await nav.share(data); return 'shared'; }
  catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return 'cancelled';
    // Do not retry after losing transient user activation; the UI offers Copy.
    return 'unavailable';
  }
}
