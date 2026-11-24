type CacheOwner = { releaseCache(): void };
const dirtyTasks = new Set<CacheOwner>();
const quarterHour = 15 * 60 * 1000;
let cleanup: NodeJS.Timeout | undefined;

export function scheduleCacheRelease(task: CacheOwner) {
  dirtyTasks.add(task);
  if (cleanup) return;
  cleanup = setTimeout(() => {
    cleanup = undefined;
    for (const owner of dirtyTasks) owner.releaseCache();
  }, quarterHour - Date.now() % quarterHour);
  cleanup.unref();
}

export function forgetCache(task: CacheOwner) {
  dirtyTasks.delete(task);
  if (!dirtyTasks.size && cleanup) {
    clearTimeout(cleanup);
    cleanup = undefined;
  }
}
