export const metadata = {
  title: 'Terms of Service — Finance Manager',
};

const EFFECTIVE_DATE = 'April 6, 2026';
const CONTACT_EMAIL = 'pantshaswat@gmail.com'; // TODO: replace with your public contact email

export default function TermsOfServicePage() {
  return (
    <main className="max-w-3xl mx-auto p-8 text-[var(--color-text)]">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Terms of Service</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">
        Effective date: {EFFECTIVE_DATE}
      </p>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>
          These Terms govern your use of Finance Manager (&ldquo;the app&rdquo;, &ldquo;we&rdquo;).
          By signing in, you agree to these Terms. If you do not agree, do not use the app.
        </p>

        <div>
          <h2 className="text-base font-semibold mb-2">1. What the app does</h2>
          <p>
            The app lets you connect your Google account, read bank notification emails from
            sender addresses you configure, extract transaction information using AI, and view
            your finances as categorized transactions and analytics.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">2. Your account</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              You must have a valid Google account and be authorized to access any emails the app
              processes on your behalf.
            </li>
            <li>
              You are responsible for keeping your Google account secure and for all activity
              under your account in the app.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">3. Acceptable use</h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the app for unlawful, fraudulent, or abusive purposes.</li>
            <li>
              Attempt to probe, scan, or test the vulnerability of the app or its infrastructure,
              or breach security or authentication measures.
            </li>
            <li>Reverse-engineer or attempt to extract source code, except as permitted by law.</li>
            <li>Use the app to process accounts or emails you do not own or lack permission to access.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">4. AI-generated data</h2>
          <p>
            Transactions are extracted automatically by a third-party AI model (Google Gemini).
            Extracted fields (amount, date, merchant, category, etc.) may be inaccurate or
            incomplete. You are responsible for reviewing and correcting your transaction history.
            Do not rely on the app for tax, legal, accounting, or investment decisions.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">5. Service availability</h2>
          <p>
            The app is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We
            may modify, suspend, or discontinue all or part of the service at any time without
            notice. Sync and AI parsing depend on external APIs (Google, Gemini) that can be
            rate-limited, delayed, or unavailable.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">6. Privacy</h2>
          <p>
            Your use of the app is also governed by our{' '}
            <a href="/privacy" className="text-[var(--color-brand)] underline">
              Privacy Policy
            </a>
            , which describes how we access and handle your data.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">7. Termination</h2>
          <p>
            You may stop using the app at any time and revoke its access to your Google account.
            We may suspend or terminate your access if you violate these Terms or misuse the
            service. You can request full deletion of your data by emailing us.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">8. Disclaimer of warranties</h2>
          <p>
            To the maximum extent permitted by law, the app is provided without warranties of any
            kind, whether express or implied, including merchantability, fitness for a particular
            purpose, accuracy, and non-infringement.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">9. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, we shall not be liable for any indirect,
            incidental, consequential, special, or punitive damages, or any loss of profits,
            revenue, data, or goodwill arising from your use of the app.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">10. Changes to these Terms</h2>
          <p>
            We may update these Terms as the app evolves. Continued use of the app after changes
            take effect constitutes acceptance of the updated Terms.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">11. Contact</h2>
          <p>
            Questions about these Terms:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--color-brand)] underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
