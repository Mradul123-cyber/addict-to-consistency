import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Matrix" },
      { name: "description", content: "Privacy Policy for Matrix — AI-powered study platform." },
    ],
  }),
  component: PrivacyPage,
});

const LAST_UPDATED = "June 7, 2025";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Matrix
        </Link>
      </div>

      <div className="mb-10 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-8">

        <Section title="Introduction">
          <P>
            Matrix is an AI-powered study platform for students. This policy explains what data
            we collect, how we use it, and your choices. By using Matrix, you agree to these practices.
          </P>
        </Section>

        <Section title="Information We Collect">
          <P><strong className="text-foreground">Account</strong> — email, display name, daily study goal, and selected subjects.</P>
          <P><strong className="text-foreground">Study activity</strong> — focus session logs, chapter progress, streaks, and community notes.</P>
          <P><strong className="text-foreground">AI sessions</strong> — questions asked, board content generated, and voice preference. Files you upload (images/PDFs) are processed in the moment and not retained after your session.</P>
          <P><strong className="text-foreground">Abuse prevention</strong> — IP address and a device identifier stored locally on your device. Neither is used for advertising or linked to your identity beyond enforcing free-tier limits.</P>
        </Section>

        <Section title="How We Use Your Information">
          <Ul items={[
            "Deliver and improve the Matrix learning experience.",
            "Show you your own study progress and stats.",
            "Power the AI teaching board with session context.",
            "Enforce fair usage limits and prevent abuse.",
            "Send account-related emails (e.g. password resets, policy updates) — no promotional emails without your consent.",
          ]} />
        </Section>

        <Section title="Information Sharing">
          <P>
            We do not sell your data or share it with advertisers. Data is shared only with trusted
            infrastructure providers (auth, storage, AI, voice) under strict data-protection agreements,
            when required by law, or in a merger/acquisition under the same privacy commitments.
          </P>
        </Section>

        <Section title="Data Retention & Storage">
          <P>
            Account and study data is kept while your account is active. You can delete your account
            and all associated data at any time by contacting us. AI session content can be deleted
            individually from within the app. We use browser local storage for preferences (theme, voice) — no third-party tracking
            or advertising cookies.
          </P>
        </Section>

        <Section title="Your Rights">
          <Ul items={[
            "Access the personal information we hold about you.",
            "Request correction or deletion of your data.",
            "Withdraw consent at any time where processing is consent-based.",
          ]} />
          <P>To exercise these rights, email us at the address below.</P>
        </Section>

        <Section title="Children's Privacy">
          <P>
            Many Matrix users are under 18. We collect only what is necessary to provide the service —
            no ads, no behavioral profiling, no sharing with third parties for commercial purposes.
            Parents or guardians with concerns can contact us and we will promptly address them.
          </P>
        </Section>

        <Section title="Changes to This Policy">
          <P>
            We may update this policy as the product evolves. Significant changes will be reflected
            in the date at the top of this page. Continued use constitutes acceptance.
          </P>
        </Section>

        <Section title="Contact">
          <P>
            Questions, rights requests, or security concerns — email us at{" "}
            <a href="mailto:mradulagrawal48125@gmail.com" className="text-foreground underline underline-offset-2">
              mradulagrawal48125@gmail.com
            </a>
            . We aim to respond within 2 business days.
          </P>
        </Section>

      </div>

      <div className="mt-12 border-t border-border pt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Matrix. All rights reserved.</span>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
      </div>
    </div>
  );
}
