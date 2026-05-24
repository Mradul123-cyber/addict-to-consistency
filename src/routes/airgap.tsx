import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Globe, Heart, Lock, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { NEVER_HEALTHY, useAirgap } from "@/hooks/useAirgap";

export const Route = createFileRoute("/airgap")({
  head: () => ({
    meta: [
      { title: "Airgap Shield — JEE Console" },
      {
        name: "description",
        content:
          "Manage your Airgap Shield blocklist, blocked keywords, and extension status from one place.",
      },
      { property: "og:title", content: "Airgap Shield" },
      {
        property: "og:description",
        content:
          "Manage your Airgap Shield blocklist, blocked keywords, and extension status from one place.",
      },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/airgap" },
    ],
    links: [{ rel: "canonical", href: "https://addict-to-consistency.lovable.app/airgap" }],
  }),
  component: AirgapPage,
});

const OFF_REASONS = [
  { value: "finished-session", label: "I finished my session" },
  { value: "genuine-emergency", label: "Genuine emergency" },
  { value: "waste-time", label: "I want to waste time" },
] as const;

type OffReason = (typeof OFF_REASONS)[number]["value"];

function AirgapPage() {
  const {
    isOn,
    isExtensionReady,
    isPreferencesReady,
    toggle,
    blocklist,
    keywords,
    healthySites,
    addBlocklistEntry,
    removeBlocklistEntry,
    addHealthySiteEntry,
    removeHealthySiteEntry,
    addKeyword,
    removeKeyword,
  } = useAirgap();

  const [domainInput, setDomainInput] = useState("");
  const [healthyInput, setHealthyInput] = useState("");
  const [healthyInputError, setHealthyInputError] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isSavingHealthy, setIsSavingHealthy] = useState(false);
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);
  const [isOffDialogOpen, setIsOffDialogOpen] = useState(false);
  const [offReason, setOffReason] = useState<OffReason | "">("");
  const [offReflection, setOffReflection] = useState("");
  const [offStep, setOffStep] = useState<1 | 2>(1);

  const selectedReason = OFF_REASONS.find((option) => option.value === offReason);
  const canFinishOffFlow = offReflection.trim().length >= 20;

  const resetOffFlow = () => {
    setIsOffDialogOpen(false);
    setOffReason("");
    setOffReflection("");
    setOffStep(1);
  };

  const openOffFlow = () => {
    setIsOffDialogOpen(true);
    setOffReason("");
    setOffReflection("");
    setOffStep(1);
  };

  const handleAddDomain = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingDomain(true);

    const result = await addBlocklistEntry(domainInput);
    if (!result.ok) {
      toast.error(result.error);
      setIsSavingDomain(false);
      return;
    }

    setDomainInput("");
    setIsSavingDomain(false);
  };

  const handleAddHealthySite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHealthyInputError(null);
    setIsSavingHealthy(true);

    const result = await addHealthySiteEntry(healthyInput);
    if (!result.ok) {
      setHealthyInputError(result.error);
      toast.error(result.error);
      setIsSavingHealthy(false);
      return;
    }

    setHealthyInput("");
    setIsSavingHealthy(false);
  };

  const handleAddKeyword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingKeyword(true);

    const result = await addKeyword(keywordInput);
    if (!result.ok) {
      toast.error(result.error);
      setIsSavingKeyword(false);
      return;
    }

    setKeywordInput("");
    setIsSavingKeyword(false);
  };

  const handleOffFlowConfirm = async () => {
    if (offStep === 1) {
      if (!offReason) return;
      setOffStep(2);
      return;
    }

    if (!canFinishOffFlow) return;

    await toggle();
    resetOffFlow();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full border p-2 text-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Airgap Shield</h1>
          <p className="text-sm text-muted-foreground">
            Control distraction blocking from one page and sync your custom rules across devices.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Extension Control</CardTitle>
              <CardDescription>
                Keep the Chrome extension installed to enforce your saved rules in real time.
              </CardDescription>
            </div>
            <Badge variant={isExtensionReady ? (isOn ? "default" : "outline") : "secondary"}>
              {isExtensionReady ? (isOn ? "ON" : "OFF") : "Extension not detected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPreferencesReady && (
            <p className="text-sm text-muted-foreground">Syncing your saved Airgap rules...</p>
          )}

          <div className="rounded-lg border bg-secondary/30 p-4">
            <p className="text-sm text-muted-foreground">
              Healthy sites: <span className="font-medium text-foreground">{healthySites.length}</span>
              {" · "}
              Domains blocked: <span className="font-medium text-foreground">{blocklist.length}</span>
              {" · "}
              Keywords blocked: <span className="font-medium text-foreground">{keywords.length}</span>
            </p>
          </div>

          {isExtensionReady ? (
            isOn ? (
              <Dialog open={isOffDialogOpen} onOpenChange={(open) => (open ? openOffFlow() : resetOffFlow())}>
                <Button variant="secondary" onClick={openOffFlow}>
                  Turn Airgap Off
                </Button>
                <DialogContent>
                  {offStep === 1 ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>Why are you turning off the shield?</DialogTitle>
                        <DialogDescription>
                          Pick the reason consciously before you proceed.
                        </DialogDescription>
                      </DialogHeader>

                      <RadioGroup
                        value={offReason}
                        onValueChange={(value) => setOffReason(value as OffReason)}
                        className="gap-3"
                      >
                        {OFF_REASONS.map((option) => (
                          <label
                            key={option.value}
                            htmlFor={option.value}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40"
                          >
                            <RadioGroupItem id={option.value} value={option.value} className="mt-1" />
                            <span className="text-sm text-foreground">{option.label}</span>
                          </label>
                        ))}
                      </RadioGroup>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={resetOffFlow}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          disabled={!offReason}
                          variant={offReason === "waste-time" ? "destructive" : "default"}
                          onClick={() => {
                            void handleOffFlowConfirm();
                          }}
                        >
                          {offReason === "waste-time"
                            ? "Yes, I choose distraction over my IIT rank"
                            : "Continue"}
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle>Reflection Lock</DialogTitle>
                        <DialogDescription>
                          Complete the sentence before the shield can turn off.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="rounded-lg border bg-secondary/30 p-3">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Selected reason
                          </div>
                          <p className="mt-2 text-sm text-foreground">
                            {selectedReason?.label ?? "No reason selected"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Complete this sentence to confirm: I am turning off the shield because...
                          </p>
                          <Textarea
                            value={offReflection}
                            onChange={(event) => setOffReflection(event.target.value)}
                            placeholder="I am turning off the shield because..."
                            className="min-h-28"
                          />
                          <p className="text-xs text-muted-foreground">
                            {Math.max(20 - offReflection.trim().length, 0)} more characters required
                          </p>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={resetOffFlow}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          disabled={!canFinishOffFlow}
                          onClick={() => {
                            void handleOffFlowConfirm();
                          }}
                        >
                          Turn Off Shield
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            ) : (
              <Button
                variant="default"
                onClick={() => {
                  void toggle();
                }}
              >
                Turn Airgap On
              </Button>
            )
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Install or reload the extension to apply these rules in Chrome.
              </p>
              <Button asChild variant="outline">
                <a href="/airgap-install.html" target="_blank" rel="noreferrer">
                  Install instructions
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Healthy Sites</CardTitle>
            </div>
            <CardDescription>
              Domains counted as focused study during sessions. Add specific edu URLs or channel
              paths — not broad social platforms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-2" onSubmit={handleAddHealthySite}>
              <div className="flex gap-2">
                <Input
                  value={healthyInput}
                  onChange={(event) => {
                    setHealthyInput(event.target.value);
                    setHealthyInputError(null);
                  }}
                  placeholder="khanacademy.org or youtube.com/@PhysicsWallah"
                />
                <Button type="submit" disabled={isSavingHealthy}>
                  Add
                </Button>
              </div>
              {healthyInputError && (
                <p className="text-xs text-destructive">{healthyInputError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Never-healthy roots: {NEVER_HEALTHY.join(", ")}
              </p>
            </form>

            <div className="space-y-2">
              {healthySites.map((entry) => (
                <div
                  key={entry}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-foreground">{entry}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${entry}`}
                    onClick={() => {
                      void removeHealthySiteEntry(entry);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Blocked Sites</CardTitle>
            </div>
            <CardDescription>
              Add a domain or full URL. Saved entries are normalized to hostnames.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-2" onSubmit={handleAddDomain}>
              <Input
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
                placeholder="youtube.com or https://example.com/path"
              />
              <Button type="submit" disabled={isSavingDomain}>
                Add
              </Button>
            </form>

            <div className="space-y-2">
              {blocklist.map((entry) => (
                <div
                  key={entry}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-foreground">{entry}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${entry}`}
                    onClick={() => {
                      void removeBlocklistEntry(entry);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Blocked Keywords</CardTitle>
            </div>
            <CardDescription>
              Block any URL containing these terms, such as reels, shorts, or memes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-2" onSubmit={handleAddKeyword}>
              <Input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="shorts"
              />
              <Button type="submit" disabled={isSavingKeyword}>
                Add
              </Button>
            </form>

            <div className="space-y-2">
              {keywords.length > 0 ? (
                keywords.map((entry) => (
                  <div
                    key={entry}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-foreground">{entry}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${entry}`}
                      onClick={() => {
                        void removeKeyword(entry);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  No keyword rules yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
