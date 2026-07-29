(() => {
  const storageKey = "maigo-poster-session";
  const seenKey = "maigo-poster-last-seen";
  const today = new Date().toISOString().slice(0, 10);
  let sessionId = "";

  try {
    sessionId = localStorage.getItem(storageKey) || "";
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(storageKey, sessionId);
    }
  } catch {
    sessionId = crypto.randomUUID();
  }

  for (const input of document.querySelectorAll("[data-session-field]")) {
    input.value = sessionId;
  }

  const track = (name, campaignId = "") =>
    fetch("/api/events", {
      body: JSON.stringify({ campaignId, name, sessionId }),
      headers: { "content-type": "application/json" },
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);

  window.maigoPoster = { sessionId, track };
  void track("visited");

  try {
    const lastSeen = localStorage.getItem(seenKey);
    if (lastSeen && lastSeen !== today) void track("returned");
    localStorage.setItem(seenKey, today);
  } catch {
    // Metrics are optional; the product still works when storage is unavailable.
  }
})();
