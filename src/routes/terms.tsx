import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Matrix" },
      { name: "description", content: "Terms and Conditions for using Matrix — AI-powered study platform." },
    ],
  }),
  component: TermsPage,
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

function TermsPage() {
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Terms & Conditions</h1>
        <p className="text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-8">

        <Section title="Acceptance of Terms">
          <P>
            By accessing or using Matrix ("we", "our", "us"), you agree to be bound by these Terms & Conditions
            and our <Link to="/privacy" className="text-foreground underline underline-offset-2">Privacy Policy</Link>.
            If you do not agree, do not use the platform.
          </P>
        </Section>

        <Section title="Who Can Use Matrix">
          <P>
            Matrix is open to all students. By creating an account, you confirm that the information
            you provide is accurate and that you will keep your account credentials secure.
            You are responsible for activity that occurs under your account due to your own actions.
            On our part, we commit to protecting your data, maintaining platform availability, and
            never sharing your account information with third parties without your consent.
          </P>
        </Section>

        <Section title="Paid Plans & Billing">
          <Ul items={[
            "Paid plans are billed monthly or annually in advance.",
            "Prompt allowances reset at the start of each billing cycle and do not roll over.",
            "We reserve the right to change plan pricing with 30 days' notice to active subscribers.",
            "You can cancel your subscription at any time; access continues until the end of the paid period.",
          ]} />
        </Section>

        <Section title="Refunds">
          <P>
            All payments made to Matrix are <strong className="text-foreground">non-refundable</strong>.
            By completing a purchase you acknowledge and agree to this policy. Please review the plan
            details carefully before subscribing. For questions, see our{" "}
            <Link to="/refund" className="text-foreground underline underline-offset-2">Refund Policy</Link>.
          </P>
        </Section>

        <Section title="Acceptable Use">
          <P>You agree not to:</P>
          <Ul items={[
            "Use Matrix for any unlawful purpose or in violation of any applicable laws.",
            "Attempt to reverse-engineer, scrape, or extract content from the platform in bulk.",
            "Share your account with others, sell access, or create multiple accounts to circumvent usage limits.",
            "Submit content that is abusive, harmful, or violates the rights of others.",
            "Attempt to overload, attack, or disrupt the platform or its infrastructure.",
          ]} />
        </Section>

        <Section title="AI-Generated Content">
          <P>
            Matrix uses AI to generate educational content. This content is intended as a study aid only —
            it may contain errors and should not be treated as a substitute for verified textbooks,
            teachers, or official exam material. We do not guarantee the accuracy of AI responses.
          </P>
        </Section>

        <Section title="Intellectual Property">
          <P>
            All platform code, design, and branding belong to Matrix. Content you submit (questions,
            notes) remains yours. By submitting content for community features, you grant us a
            non-exclusive licence to display it on the platform.
          </P>
        </Section>

        <Section title="Termination">
          <P>
            We may suspend or terminate accounts that violate these terms, abuse platform limits,
            or engage in conduct harmful to other users.
          </P>
        </Section>

        <Section title="Disclaimer & Liability">
          <P>
            Matrix is provided "as is" without warranties of any kind. We are not liable for
            any loss of data, exam performance, or indirect damages arising from use of the platform.
          </P>
        </Section>

        <Section title="Governing Law">
          <P>
            These terms are governed by the laws of India. Any disputes shall be subject to the
            exclusive jurisdiction of the courts in India.
          </P>
        </Section>

        <Section title="Changes to These Terms">
          <P>
            We may update these terms as the platform evolves. Significant changes will be notified
            via email or an in-app notice. Continued use after changes constitutes acceptance.
          </P>
        </Section>

        <Section title="Contact">
          <P>
            Questions about these terms — email us at{" "}
            <a href="mailto:mradulagrawal48125@gmail.com" className="text-foreground underline underline-offset-2">
              mradulagrawal48125@gmail.com
            </a>
            . We aim to respond within 2 business days.
          </P>
        </Section>

      </div>

      <div className="mt-12 border-t border-border pt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Matrix. All rights reserved.</span>
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
      </div>
    </div>
  );
}
