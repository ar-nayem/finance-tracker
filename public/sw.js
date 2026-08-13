// Minimal service worker — exists only to satisfy PWA/TWA installability
// criteria (a registered SW with a fetch handler). Deliberately does no
// caching: pages are server-rendered with force-dynamic and mutate via
// Server Actions, so caching responses here would show stale financial data.
self.addEventListener("fetch", () => {});
