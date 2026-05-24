/**
 * JEE Airgap Shield — Background Service Worker
 * Manages dynamic declarativeNetRequest rules and focus-session tab tracking.
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

const YOUTUBE_EDU_CHANNELS = [
  "physicswallah",
  "khanacademy",
  "vedantujeeenglish",
  "unacademyjeeenglish",
  "mathongo",
  "nv-sir",
  "etoosindia",
];

// ─── Focus session tab tracking ───────────────────────────────────────────────

let focusTrackingActive = false;
let focusSessionLog = [];
let focusHealthyDomains = [];
let focusBlockedDomains = [];
let activeEntry = null;
let onActivatedListener = null;
let onUpdatedListener = null;

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function domainMatches(list, domain) {
  return list.some((entry) => domain === entry || domain.endsWith(`.${entry}`));
}

function isYoutubeDomain(domain) {
  return domain === "youtube.com" || domain.endsWith(".youtube.com");
}

function classifyYoutube(url) {
  try {
    const lower = url.toLowerCase();
    const path = new URL(url).pathname.toLowerCase();

    const hasEduChannel = YOUTUBE_EDU_CHANNELS.some(
      (channel) =>
        lower.includes(`/@${channel}`) ||
        lower.includes(`/c/${channel}`) ||
        lower.includes(`/channel/${channel}`) ||
        lower.includes(channel),
    );

    if (path.startsWith("/@")) {
      const handle = path.slice(2).split("/")[0];
      if (YOUTUBE_EDU_CHANNELS.some((channel) => handle.includes(channel))) {
        return "healthy";
      }
      return "distraction";
    }

    if (path.includes("/watch") || path.includes("/playlist")) {
      return hasEduChannel ? "healthy" : "distraction";
    }

    return "distraction";
  } catch {
    return "distraction";
  }
}

function classifyVisit(domain, url) {
  if (domainMatches(focusHealthyDomains, domain)) return "healthy";
  if (domainMatches(focusBlockedDomains, domain)) return "distraction";
  if (isYoutubeDomain(domain)) return classifyYoutube(url);
  return "neutral";
}

function closeActiveEntry(endTime) {
  if (!activeEntry) return;
  activeEntry.endTime = endTime;
  focusSessionLog.push(activeEntry);
  activeEntry = null;
  void chrome.storage.local.set({ focusSessionLog });
}

function startEntry(url, startTime) {
  const domain = extractDomain(url);
  if (!domain) return;
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return;

  closeActiveEntry(startTime);
  activeEntry = { url, domain, startTime, endTime: null };
}

async function recordTab(tabId) {
  if (!focusTrackingActive) return;

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab?.url) return;
    startEntry(tab.url, Date.now());
  } catch (err) {
    console.warn("[Focus] Could not record tab:", err);
  }
}

function startFocusTracking(healthyDomains, blockedDomains) {
  stopFocusTracking(false);

  focusTrackingActive = true;
  focusSessionLog = [];
  activeEntry = null;
  focusHealthyDomains = (healthyDomains ?? []).map(normalizeDomain).filter(Boolean);
  focusBlockedDomains = (blockedDomains ?? []).map(normalizeDomain).filter(Boolean);

  onActivatedListener = (activeInfo) => {
    void recordTab(activeInfo.tabId);
  };

  onUpdatedListener = (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab?.active) {
      void recordTab(tabId);
    }
  };

  chrome.tabs.onActivated.addListener(onActivatedListener);
  chrome.tabs.onUpdated.addListener(onUpdatedListener);

  void chrome.storage.local.set({ focusSessionLog: [] });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) void recordTab(tabs[0].id);
  });

  console.log("[Focus] Session tracking started.");
}

function computeFocusSummary() {
  const now = Date.now();
  closeActiveEntry(now);

  let healthyMs = 0;
  let distractionMs = 0;
  let neutralMs = 0;
  const neutralDomainsSet = new Set();
  const domainMs = {};

  for (const entry of focusSessionLog) {
    const end = entry.endTime ?? now;
    const durationMs = Math.max(0, end - entry.startTime);
    if (durationMs <= 0) continue;

    const classification = classifyVisit(entry.domain, entry.url);

    if (classification === "healthy") healthyMs += durationMs;
    else if (classification === "distraction") distractionMs += durationMs;
    else {
      neutralMs += durationMs;
      neutralDomainsSet.add(entry.domain);
    }

    if (!domainMs[entry.domain]) {
      domainMs[entry.domain] = { ms: 0, url: entry.url };
    }
    domainMs[entry.domain].ms += durationMs;
  }

  const topDomains = Object.entries(domainMs)
    .map(([domain, data]) => ({
      domain,
      minutes: Math.round((data.ms / 60000) * 10) / 10,
      classification: classifyVisit(domain, data.url),
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10);

  return {
    healthyMinutes: Math.round((healthyMs / 60000) * 10) / 10,
    distractionMinutes: Math.round((distractionMs / 60000) * 10) / 10,
    neutralMinutes: Math.round((neutralMs / 60000) * 10) / 10,
    neutralDomains: Array.from(neutralDomainsSet),
    topDomains,
  };
}

function stopFocusTracking(clearLog = true) {
  focusTrackingActive = false;

  if (onActivatedListener) {
    chrome.tabs.onActivated.removeListener(onActivatedListener);
    onActivatedListener = null;
  }

  if (onUpdatedListener) {
    chrome.tabs.onUpdated.removeListener(onUpdatedListener);
    onUpdatedListener = null;
  }

  if (clearLog) {
    focusSessionLog = [];
    activeEntry = null;
    void chrome.storage.local.set({ focusSessionLog: [] });
  }

  console.log("[Focus] Session tracking stopped.");
}

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

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map((r) => r.id);

  const newRules = [];
  let ruleId = 1;

  for (const domain of blocklist) {
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
    `[Airgap] Shield ENABLED — blocking domains: ${blocklist.join(", ")} | keywords: ${keywords.join(", ")}`,
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
  const { type, blocklist, keywords, healthySites, blockedDomains } = message ?? {};

  if (type === "FOCUS_SESSION_START") {
    startFocusTracking(healthySites ?? [], blockedDomains ?? []);
    sendResponse({ success: true });
    return false;
  }

  if (type === "FOCUS_SESSION_END") {
    const summary = computeFocusSummary();
    stopFocusTracking(true);
    sendResponse({ success: true, ...summary });
    return false;
  }

  if (type === "AIRGAP_ON") {
    enableAirgap(blocklist ?? DEFAULT_BLOCKLIST, keywords ?? DEFAULT_KEYWORDS)
      .then(() => sendResponse({ success: true, state: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
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

  return false;
});
