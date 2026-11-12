let foreground = 0;
export function beginForegroundWork() {
  foreground++;
  let ended = false;
  return () => {
    if (!ended) {
      ended = true;
      foreground--;
    }
  };
}
export function createBackgroundPoller(
  run: () => Promise<void>,
  visible: () => boolean,
  interval = 60000,
) {
  let stopped = false,
    busy = false,
    lastStart = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    if (!stopped) timer = setTimeout(() => void refresh(), interval);
  };
  async function refresh() {
    if (stopped || busy) return;
    if (foreground || !visible() || Date.now() - lastStart < interval) {
      schedule();
      return;
    }
    busy = true;
    lastStart = Date.now();
    try {
      await run();
    } catch {
      /* The caller owns its error state; keep the next poll bounded. */
    } finally {
      busy = false;
      schedule();
    }
  }
  return {
    refresh,
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
