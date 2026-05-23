/**
 * JEE Airgap Shield — Content Script
 *
 * Bridges window.postMessage (from the React app) to the background
 * service worker via chrome.runtime.sendMessage.
 *
 * Injected only on the JEE Workstation app pages (see manifest.json).
 */

const VALID_TYPES = ["AIRGAP_ON", "AIRGAP_OFF", "AIRGAP_GET_STATE"];

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

// Signal to the React app that the extension is installed
window.postMessage({ type: "AIRGAP_EXTENSION_READY" }, "*");

window.addEventListener("message", (event) => {
  // Security: only process messages from our own app origins
  if (!isAllowedOrigin(event.origin)) return;

  // Only handle from the same window (not iframes)
  if (event.source !== window) return;

  const { type, blocklist, keywords } = event.data ?? {};
  if (!VALID_TYPES.includes(type)) return;

  // Forward to background service worker
  chrome.runtime.sendMessage({ type, blocklist, keywords }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("[Airgap] Background response error:", chrome.runtime.lastError.message);
      return;
    }

    // Post the response back to the React app
    window.postMessage(
      {
        type: "AIRGAP_RESPONSE",
        originalType: type,
        ...(response ?? {}),
      },
      event.origin
    );
  });
});
