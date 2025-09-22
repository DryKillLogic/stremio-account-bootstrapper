declare global {
  interface Window {
    goatcounter?: {
      count: (opts: { path: string; title: string; event: string }) => void;
    };
  }
}

export function useAnalytics() {
  const isAvailable = () =>
    typeof window !== 'undefined' &&
    !!window.goatcounter &&
    typeof window.goatcounter.count === 'function';

  function track(event: string, opts?: { path?: string; title?: string }) {
    if (!isAvailable()) return;
    try {
      window.goatcounter!.count({
        path: opts?.path ?? `/event/${event}`,
        title: opts?.title ?? event,
        event
      });
    } catch (e) {
      console.debug('analytics error', e);
    }
  }

  return { track };
}
