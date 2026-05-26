/**
 * JEE Airgap Shield — Content Script
 *
 * Bridges window.postMessage (from the React app) to the background
 * service worker via chrome.runtime.sendMessage.
 *
 * Injected only on the JEE Console app pages (see manifest.json).
 */

const VALID_TYPES = [
  "AIRGAP_ON",
  "AIRGAP_OFF",
  "AIRGAP_GET_STATE",
  "FOCUS_SESSION_START",
  "FOCUS_SESSION_END",
];

const APP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "addict-to-consistency.lovable.app",
]);

function isAllowedOrigin(origin) {
  try {
    const url = new URL(origin);
    if (!APP_HOSTS.has(url.hostname)) return false;

    if (url.hostname === "addict-to-consistency.lovable.app") {
      return url.protocol === "https:";
    }

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

window.postMessage({ type: "AIRGAP_EXTENSION_READY" }, "*");

window.addEventListener("message", (event) => {
  if (!isAllowedOrigin(event.origin)) return;
  if (event.source !== window) return;

  const { type, blocklist, keywords, healthySites, blockedDomains } = event.data ?? {};
  if (!VALID_TYPES.includes(type)) return;

  chrome.runtime.sendMessage(
    { type, blocklist, keywords, healthySites, blockedDomains },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[Airgap] Background response error:", chrome.runtime.lastError.message);
        return;
      }

      window.postMessage(
        {
          type: "AIRGAP_RESPONSE",
          originalType: type,
          ...(response ?? {}),
        },
        event.origin,
      );
    },
  );
});
