import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Matrix" },
      { name: "description", content: "Refund and Cancellation Policy for Matrix." },
    ],
  }),
  component: RefundPage,
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

function RefundPage() {
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Refund & Cancellation Policy</h1>
        <p className="text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-8">

        <Section title="No Refund Policy">
          <P>
            All payments made to Matrix are <strong className="text-foreground">non-refundable</strong>.
            Once a subscription is purchased, no refunds will be issued — whether for full or partial
            use of the plan, dissatisfaction with AI responses, or any other reason.
          </P>
          <P>
            We encourage you to use the <strong className="text-foreground">free tier</strong> to
            experience the platform before subscribing to any paid plan.
          </P>
        </Section>

        <Section title="Cancellation">
          <P>
            You may cancel your subscription at any time from your account settings. Cancellation
            stops future billing immediately. You retain access to your paid plan features until
            the end of your current billing period — no extensions or credits are provided
            for unused time.
          </P>
        </Section>

        <Section title="Failed or Duplicate Payments">
          <P>
            If you were charged more than once for the same subscription due to a technical error,
            contact us at{" "}
            <a href="mailto:mradulagrawal48125@gmail.com" className="text-foreground underline underline-offset-2">
              mradulagrawal48125@gmail.com
            </a>{" "}
            with your payment details. We will investigate and refund any duplicate charge within
            5–7 business days.
          </P>
        </Section>

        <Section title="Contact">
          <P>
            For any billing questions, reach us at{" "}
            <a href="mailto:mradulagrawal48125@gmail.com" className="text-foreground underline underline-offset-2">
              mradulagrawal48125@gmail.com
            </a>.
          </P>
        </Section>

      </div>

      <div className="mt-12 border-t border-border pt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Matrix. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
        </div>
      </div>
    </div>
  );
}
