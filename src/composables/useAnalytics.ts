declare global {
  interface Window {
    goatcounter?: {
      count: (opts: {
        path: string;
        title: string;
        event: string;
        vars?: Record<string, string>;
      }) => void;
    };
  }
}

export function useAnalytics() {
  const isAvailable = () =>
    typeof window !== 'undefined' &&
    !!window.goatcounter &&
    typeof window.goatcounter.count === 'function';

  function track(
    event: string,
    opts?: {
      path?: string;
      title?: string;
      vars?: Record<string, string>;
    }
  ) {
    if (!isAvailable()) return;
    try {
      window.goatcounter!.count({
        path: opts?.path ?? `/event/${event}`,
        title: opts?.title ?? event,
        event,
        vars: opts?.vars
      });
    } catch (e) {
      console.debug('analytics error', e);
    }
  }

  return { track };
}
