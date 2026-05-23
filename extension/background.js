/**
 * JEE Airgap Shield — Background Service Worker
 * Manages dynamic declarativeNetRequest rules to block distracting domains.
 * State is persisted in chrome.storage.local so it survives browser restarts.
 */

const DEFAULT_BLOCKLIST = [
  "youtube.com",
  "instagram.com",
  "reddit.com",
  "twitter.com",
  "netflix.com",
  "facebook.com",
  "snapchat.com",
  "tiktok.com",
  "twitch.tv",
  "discord.com",
  "pinterest.com",
  "linkedin.com",
  "quora.com",
  "9gag.com",
  "tumblr.com",
];

const DEFAULT_KEYWORDS = [];

// ─── Startup / Install ──────────────────────────────────────────────────────

async function restoreState() {
  try {
    const { airgapOn, airgapBlocklist, airgapKeywords } = await chrome.storage.local.get([
      "airgapOn",
      "airgapBlocklist",
      "airgapKeywords",
    ]);
    if (airgapOn) {
      await enableAirgap(airgapBlocklist ?? DEFAULT_BLOCKLIST, airgapKeywords ?? DEFAULT_KEYWORDS);
      console.log("[Airgap] Shield restored on startup.");
    }
  } catch (err) {
    console.error("[Airgap] Failed to restore state:", err);
  }
}

chrome.runtime.onStartup.addListener(restoreState);
chrome.runtime.onInstalled.addListener(restoreState);

// ─── Core Logic ─────────────────────────────────────────────────────────────

async function enableAirgap(blocklist, keywords = DEFAULT_KEYWORDS) {
  const redirectUrl = chrome.runtime.getURL("blocked.html");

  // Remove all existing dynamic rules first
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map((r) => r.id);

  // Build one rule per domain (both www and bare)
  const newRules = [];
  let ruleId = 1;

  for (const domain of blocklist) {
    // Bare domain
    newRules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { url: redirectUrl },
      },
      condition: {
        urlFilter: `||${domain}^`,
        resourceTypes: ["main_frame"],
      },
    });
    // www. variant (catches cases not matched by || syntax on some builds)
    newRules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { url: redirectUrl },
      },
      condition: {
        urlFilter: `||www.${domain}^`,
        resourceTypes: ["main_frame"],
      },
    });
  }

  for (const keyword of keywords) {
    newRules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { url: redirectUrl },
      },
      condition: {
        urlFilter: `*${keyword}*`,
        resourceTypes: ["main_frame"],
      },
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: newRules,
  });

  await chrome.storage.local.set({
    airgapOn: true,
    airgapBlocklist: blocklist,
    airgapKeywords: keywords,
    airgapActivatedAt: Date.now(),
  });

  console.log(
    `[Airgap] Shield ENABLED — blocking domains: ${blocklist.join(", ")} | keywords: ${keywords.join(", ")}`
  );
}

async function disableAirgap() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map((r) => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: [],
  });

  await chrome.storage.local.set({ airgapOn: false });
  console.log("[Airgap] Shield DISABLED.");
}

// ─── Message Handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, blocklist, keywords } = message ?? {};

  if (type === "AIRGAP_ON") {
    enableAirgap(blocklist ?? DEFAULT_BLOCKLIST, keywords ?? DEFAULT_KEYWORDS)
      .then(() => sendResponse({ success: true, state: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async
  }

  if (type === "AIRGAP_OFF") {
    disableAirgap()
      .then(() => sendResponse({ success: true, state: false }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === "AIRGAP_GET_STATE") {
    chrome.storage.local
      .get(["airgapOn", "airgapBlocklist", "airgapKeywords", "airgapActivatedAt"])
      .then(({ airgapOn, airgapBlocklist, airgapKeywords, airgapActivatedAt }) => {
        sendResponse({
          state: !!airgapOn,
          blocklist: airgapBlocklist ?? DEFAULT_BLOCKLIST,
          keywords: airgapKeywords ?? DEFAULT_KEYWORDS,
          activatedAt: airgapActivatedAt ?? null,
        });
      })
      .catch((err) => sendResponse({ state: false, error: err.message }));
    return true;
  }
});
