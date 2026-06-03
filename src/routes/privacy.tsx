import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Matrix" },
      { name: "description", content: "Privacy Policy for Matrix — AI-powered JEE preparation platform." },
    ],
  }),
  component: PrivacyPage,
});

const LAST_UPDATED = "June 3, 2025";

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

      <div className="space-y-10">

        <Section title="Introduction">
          <P>
            Matrix ("we", "our", or "us") is an AI-powered study platform built for JEE aspirants.
            We take your privacy seriously. This policy explains what information we collect, how we use it,
            and the choices you have. By using Matrix, you agree to the practices described here.
          </P>
        </Section>

        <Section title="Information We Collect">
          <P><strong className="text-foreground">Account information</strong></P>
          <Ul items={[
            "Your email address and display name when you create an account.",
            "Profile preferences such as your daily study goal and selected subjects.",
          ]} />

          <P><strong className="text-foreground">Study activity</strong></P>
          <Ul items={[
            "Focus session logs — subject, duration, and timestamps.",
            "Chapter and concept progress you mark within the app.",
            "Study streaks and calendar data.",
            "Notes you write or submit for community review.",
          ]} />

          <P><strong className="text-foreground">AI teaching sessions</strong></P>
          <Ul items={[
            "Questions you ask the AI teaching board and the board content generated in response.",
            "Files you upload (images or PDFs) to get help with — these are processed to extract context and are not stored permanently beyond your session.",
            "Your chosen voice preference for AI explanations.",
          ]} />

          <P><strong className="text-foreground">Technical information</strong></P>
          <Ul items={[
            "Your IP address — used solely to prevent abuse of our free features (e.g., creating many accounts to bypass limits). It is never used for advertising or sold.",
            "A device identifier stored locally on your device — used to prevent abuse on the same device. This data stays on your device and is not linked to your identity.",
            "Basic usage counts (number of AI prompts used, uploads used) to enforce free plan limits.",
          ]} />
        </Section>

        <Section title="How We Use Your Information">
          <Ul items={[
            "To provide and improve the Matrix learning experience.",
            "To track your study progress and show you your own stats.",
            "To power the AI teaching board with context from your session.",
            "To enforce fair usage limits and prevent abuse of free features.",
            "To send important account-related communications (no marketing emails without your consent).",
          ]} />
        </Section>

        <Section title="Information Sharing">
          <P>
            We do not sell your personal information. We do not share your data with advertisers or
            data brokers. Your data may be shared only in these limited cases:
          </P>
          <Ul items={[
            "With trusted technology providers who help us run the platform (authentication, data storage, AI processing, voice synthesis). These providers are bound by strict data protection agreements and may only use your data to provide services to us.",
            "If required by law, court order, or to protect the rights and safety of our users.",
            "In the event of a merger or acquisition, your data would transfer to the new entity under the same privacy commitments.",
          ]} />
        </Section>

        <Section title="Data Retention">
          <P>
            We retain your account and study data for as long as your account is active.
            You may request deletion of your account and associated data at any time by contacting us.
            AI session content is stored to allow you to revisit past sessions; you can delete individual
            sessions from within the app at any time.
          </P>
          <P>
            Files you upload for AI assistance (images, PDFs) are processed in the moment and are not
            retained on our servers after your session ends.
          </P>
        </Section>

        <Section title="Your Rights">
          <P>You have the right to:</P>
          <Ul items={[
            "Access the personal information we hold about you.",
            "Request correction of inaccurate data.",
            "Request deletion of your account and data.",
            "Withdraw consent at any time where processing is based on consent.",
          ]} />
          <P>To exercise any of these rights, contact us at the email below.</P>
        </Section>

        <Section title="Children's Privacy">
          <P>
            Matrix is designed for students preparing for competitive exams, many of whom may be under 18.
            We do not knowingly collect any sensitive personal information beyond what is necessary to
            provide the service. We do not run ads, build behavioral profiles, or share student data
            with third parties for commercial purposes.
          </P>
          <P>
            If you are a parent or guardian and believe your child has provided us with information
            without your consent, please contact us and we will promptly address it.
          </P>
        </Section>

        <Section title="Security">
          <P>
            We use industry-standard security practices to protect your data, including encrypted
            data transmission and access controls. No system is completely secure, but we continually
            work to protect your information. If you discover a security issue, please report it to us.
          </P>
        </Section>

        <Section title="Cookies and Local Storage">
          <P>
            Matrix uses browser local storage to remember your preferences (such as theme and voice
            settings) across sessions. We do not use third-party tracking cookies or advertising cookies.
          </P>
        </Section>

        <Section title="Changes to This Policy">
          <P>
            We may update this policy as our product evolves. When we make significant changes, we will
            update the date at the top of this page. Continued use of Matrix after changes are posted
            constitutes your acceptance of the updated policy.
          </P>
        </Section>

        <Section title="Contact Us">
          <P>
            If you have questions about this policy, want to exercise your rights, or need to report
            a concern, please reach out. We aim to respond within 2 business days.
          </P>
          <P>
            Once we have our dedicated support email set up, it will be listed here. In the meantime,
            you can reach us through the app.
          </P>
        </Section>

      </div>

      <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Matrix. All rights reserved.
      </div>
    </div>
  );
}
