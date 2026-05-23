import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";

export const DEFAULT_BLOCKLIST = [
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

export const DEFAULT_KEYWORDS: string[] = [];

const RESPONSE_TIMEOUT_MS = 1200;

type AirgapCommand = "AIRGAP_ON" | "AIRGAP_OFF" | "AIRGAP_GET_STATE";

type AirgapResponse = {
  type: "AIRGAP_RESPONSE";
  originalType?: AirgapCommand;
  state?: boolean;
  blocklist?: string[];
  keywords?: string[];
  success?: boolean;
  error?: string;
  activatedAt?: number | null;
};

type PendingRequest = {
  id: number;
  type: AirgapCommand;
  timeoutId: number;
  resolve: (response: AirgapResponse) => void;
  reject: (reason?: unknown) => void;
};

type PersistedPreferences = {
  blocklist: string[];
  keywords: string[];
};

function isAirgapResponse(value: unknown): value is AirgapResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      (value as { type?: string }).type === "AIRGAP_RESPONSE",
  );
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function isValidHostname(hostname: string) {
  return /^(localhost|(\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/i.test(
    hostname,
  );
}

function sanitizeBlocklist(values: string[]) {
  return uniqueStrings(
    values
      .map((value) => normalizeBlocklistEntry(value))
      .filter((value): value is string => value !== null),
  );
}

function sanitizeKeywords(values: string[]) {
  return uniqueStrings(
    values
      .map((value) => normalizeKeyword(value))
      .filter((value): value is string => value !== null),
  );
}

export function normalizeBlocklistEntry(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (!isValidHostname(hostname)) return null;
    return hostname;
  } catch {
    return null;
  }
}

export function normalizeKeyword(input: string) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized.length < 2) return null;
  if (normalized.includes("*")) return null;
  return normalized;
}

export function useAirgap() {
  const { user } = useAuth();
  const [isOn, setIsOn] = useState(false);
  const [isExtensionReady, setIsExtensionReady] = useState(false);
  const [blocklist, setBlocklist] = useState<string[]>(DEFAULT_BLOCKLIST);
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [isPreferencesReady, setIsPreferencesReady] = useState(false);

  const nextRequestIdRef = useRef(0);
  const pendingRequestsRef = useRef<PendingRequest[]>([]);

  const clearPendingRequests = useCallback(() => {
    for (const request of pendingRequestsRef.current) {
      window.clearTimeout(request.timeoutId);
      request.reject(new Error("Airgap hook unmounted."));
    }
    pendingRequestsRef.current = [];
  }, []);

  const applyResponseState = useCallback(
    (response: AirgapResponse) => {
      if (typeof response.state === "boolean") {
        setIsOn(response.state);
      }

      if (!isPreferencesReady) {
        if (Array.isArray(response.blocklist) && response.blocklist.length > 0) {
          setBlocklist(sanitizeBlocklist(response.blocklist));
        }

        if (Array.isArray(response.keywords)) {
          setKeywords(sanitizeKeywords(response.keywords));
        }
      }
    },
    [isPreferencesReady],
  );

  const sendAirgapMessage = useCallback(
    (type: AirgapCommand, nextBlocklist?: string[], nextKeywords?: string[]) =>
      new Promise<AirgapResponse>((resolve, reject) => {
        if (typeof window === "undefined") {
          reject(new Error("Window is unavailable."));
          return;
        }

        const requestId = nextRequestIdRef.current + 1;
        nextRequestIdRef.current = requestId;

        const timeoutId = window.setTimeout(() => {
          pendingRequestsRef.current = pendingRequestsRef.current.filter(
            (request) => request.id !== requestId,
          );
          reject(new Error("Extension unavailable."));
        }, RESPONSE_TIMEOUT_MS);

        pendingRequestsRef.current.push({
          id: requestId,
          type,
          timeoutId,
          resolve,
          reject,
        });

        window.postMessage(
          {
            type,
            ...(nextBlocklist ? { blocklist: nextBlocklist } : {}),
            ...(nextKeywords ? { keywords: nextKeywords } : {}),
          },
          window.location.origin,
        );
      }),
    [],
  );

  const syncState = useCallback(async () => {
    try {
      const response = await sendAirgapMessage("AIRGAP_GET_STATE");
      setIsExtensionReady(true);
      applyResponseState(response);
      return response;
    } catch {
      setIsExtensionReady(false);
      setIsOn(false);
      return null;
    }
  }, [applyResponseState, sendAirgapMessage]);

  const persistPreferences = useCallback(
    async (next: PersistedPreferences) => {
      if (!user) {
        return { ok: false, error: "Sign in to edit the Airgap lists." };
      }

      const safeBlocklist = sanitizeBlocklist(next.blocklist);
      const safeKeywords = sanitizeKeywords(next.keywords);

      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            airgapBlocklist: safeBlocklist,
            airgapKeywords: safeKeywords,
          },
          { merge: true },
        );

        setBlocklist(safeBlocklist);
        setKeywords(safeKeywords);

        if (isExtensionReady && isOn) {
          const response = await sendAirgapMessage("AIRGAP_ON", safeBlocklist, safeKeywords);
          applyResponseState(response);
        }

        return { ok: true as const };
      } catch (error) {
        console.error("Failed to persist Airgap preferences:", error);
        return { ok: false as const, error: "Could not save Airgap preferences." };
      }
    },
    [applyResponseState, isExtensionReady, isOn, sendAirgapMessage, user],
  );

  const addBlocklistEntry = useCallback(
    async (input: string) => {
      const normalized = normalizeBlocklistEntry(input);
      if (!normalized) {
        return { ok: false as const, error: "Enter a valid domain or URL." };
      }

      if (blocklist.includes(normalized)) {
        return { ok: false as const, error: "This domain is already blocked." };
      }

      return persistPreferences({
        blocklist: [...blocklist, normalized],
        keywords,
      });
    },
    [blocklist, keywords, persistPreferences],
  );

  const removeBlocklistEntry = useCallback(
    async (entry: string) =>
      persistPreferences({
        blocklist: blocklist.filter((value) => value !== entry),
        keywords,
      }),
    [blocklist, keywords, persistPreferences],
  );

  const addKeyword = useCallback(
    async (input: string) => {
      const normalized = normalizeKeyword(input);
      if (!normalized) {
        return { ok: false as const, error: "Enter a keyword with at least 2 characters." };
      }

      if (keywords.includes(normalized)) {
        return { ok: false as const, error: "This keyword is already blocked." };
      }

      return persistPreferences({
        blocklist,
        keywords: [...keywords, normalized],
      });
    },
    [blocklist, keywords, persistPreferences],
  );

  const removeKeyword = useCallback(
    async (entry: string) =>
      persistPreferences({
        blocklist,
        keywords: keywords.filter((value) => value !== entry),
      }),
    [blocklist, keywords, persistPreferences],
  );

  const toggle = useCallback(async () => {
    let nextType: AirgapCommand = isOn ? "AIRGAP_OFF" : "AIRGAP_ON";

    if (!isExtensionReady) {
      const currentState = await syncState();
      if (!currentState) return;
      nextType = currentState.state ? "AIRGAP_OFF" : "AIRGAP_ON";
    }

    try {
      const response = await sendAirgapMessage(nextType, blocklist, keywords);
      if (response.success === false) return;

      setIsExtensionReady(true);
      applyResponseState(response);
    } catch {
      setIsExtensionReady(false);
    }
  }, [applyResponseState, blocklist, isExtensionReady, isOn, keywords, sendAirgapMessage, syncState]);

  useEffect(() => {
    if (!user) {
      setBlocklist(DEFAULT_BLOCKLIST);
      setKeywords(DEFAULT_KEYWORDS);
      setIsPreferencesReady(true);
      return undefined;
    }

    const userDocRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      async (snapshot) => {
        const data = snapshot.data();
        const nextBlocklist = Array.isArray(data?.airgapBlocklist)
          ? sanitizeBlocklist(data.airgapBlocklist)
          : DEFAULT_BLOCKLIST;
        const nextKeywords = Array.isArray(data?.airgapKeywords)
          ? sanitizeKeywords(data.airgapKeywords)
          : DEFAULT_KEYWORDS;

        setBlocklist(nextBlocklist);
        setKeywords(nextKeywords);
        setIsPreferencesReady(true);

        const shouldSeedBlocklist = !Array.isArray(data?.airgapBlocklist);
        const shouldSeedKeywords = !Array.isArray(data?.airgapKeywords);
        const shouldNormalizeBlocklist =
          Array.isArray(data?.airgapBlocklist) && !arraysEqual(nextBlocklist, data.airgapBlocklist);
        const shouldNormalizeKeywords =
          Array.isArray(data?.airgapKeywords) && !arraysEqual(nextKeywords, data.airgapKeywords);

        if (
          shouldSeedBlocklist ||
          shouldSeedKeywords ||
          shouldNormalizeBlocklist ||
          shouldNormalizeKeywords
        ) {
          await setDoc(
            userDocRef,
            {
              airgapBlocklist: nextBlocklist,
              airgapKeywords: nextKeywords,
            },
            { merge: true },
          );
        }
      },
      (error) => {
        console.error("Failed to subscribe to Airgap preferences:", error);
        setIsPreferencesReady(true);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data?.type === "AIRGAP_EXTENSION_READY") {
        setIsExtensionReady(true);
        void syncState();
        return;
      }

      if (!isAirgapResponse(event.data)) return;

      const response = event.data;
      setIsExtensionReady(true);
      applyResponseState(response);

      if (!response.originalType) return;

      const pendingIndex = pendingRequestsRef.current.findIndex(
        (request) => request.type === response.originalType,
      );

      if (pendingIndex === -1) return;

      const [pendingRequest] = pendingRequestsRef.current.splice(pendingIndex, 1);
      window.clearTimeout(pendingRequest.timeoutId);

      if (response.success === false) {
        pendingRequest.reject(new Error(response.error ?? "Airgap request failed."));
        return;
      }

      pendingRequest.resolve(response);
    };

    window.addEventListener("message", handleMessage);
    void syncState();

    return () => {
      window.removeEventListener("message", handleMessage);
      clearPendingRequests();
    };
  }, [applyResponseState, clearPendingRequests, syncState]);

  useEffect(() => {
    if (!isExtensionReady || !isOn || !isPreferencesReady) return;

    void sendAirgapMessage("AIRGAP_ON", blocklist, keywords).catch(() => {
      setIsExtensionReady(false);
    });
  }, [blocklist, isExtensionReady, isOn, isPreferencesReady, keywords, sendAirgapMessage]);

  return {
    isOn,
    isExtensionReady,
    isPreferencesReady,
    toggle,
    blocklist,
    keywords,
    addBlocklistEntry,
    removeBlocklistEntry,
    addKeyword,
    removeKeyword,
  };
}
