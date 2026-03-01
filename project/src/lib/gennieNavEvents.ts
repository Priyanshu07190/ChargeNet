/**
 * Gennie Navigation Event Bus
 * 
 * Solves: React Router's navigate() doesn't re-trigger useSearchParams 
 * when the base path stays the same (e.g. /host-dashboard → /host-dashboard?tab=x)
 * 
 * How it works:
 * 1. voiceActionEngine dispatches a 'gennie-navigate' custom event with tab/route info
 * 2. Dashboard/HostDashboard listen for this event and switch tabs directly
 * 3. For cross-page navigation (e.g. /dashboard → /chargers), normal navigate() is used
 */

export interface GennieNavigationEvent {
  tab?: string;       // Tab to switch to
  route?: string;     // Full route (for cross-page navigation)
}

/**
 * Dispatch a navigation event from Gennie
 */
export function dispatchGennieNav(detail: GennieNavigationEvent) {
  console.log('🎯 Gennie nav event:', detail);
  window.dispatchEvent(new CustomEvent('gennie-navigate', { detail }));
}

/**
 * Listen for Gennie navigation events.
 * Returns cleanup function.
 */
export function onGennieNav(callback: (detail: GennieNavigationEvent) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<GennieNavigationEvent>).detail;
    callback(detail);
  };
  window.addEventListener('gennie-navigate', handler);
  return () => window.removeEventListener('gennie-navigate', handler);
}
