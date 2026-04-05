export const metadata = {
  title: 'Privacy Policy — Finance Manager',
};

const EFFECTIVE_DATE = 'April 6, 2026';
const CONTACT_EMAIL = 'pantshaswat@gmail.com'; 

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto p-8 text-[var(--color-text)]">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">
        Effective date: {EFFECTIVE_DATE}
      </p>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>
          Finance Manager (&ldquo;the app&rdquo;, &ldquo;we&rdquo;) is a personal finance tracker
          that reads bank notification emails from your Gmail inbox, extracts transaction details
          using AI, and displays them as categorized entries. This policy explains what data we
          access, why, and how it is handled.
        </p>

        <div>
          <h2 className="text-base font-semibold mb-2">1. Information we access</h2>
          <p className="mb-2">When you sign in with Google, we request:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your basic Google profile: name, email address, profile picture.</li>
            <li>
              Read-only access to your Gmail inbox
              (<code className="text-xs">gmail.readonly</code> scope), limited to searching and
              reading messages from bank sender addresses you explicitly configure in the app.
            </li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> request permission to send, delete, or modify your emails.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">2. How we use your data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Gmail content</strong> — only messages from sender addresses you configure
              (e.g. your bank&rsquo;s notification email) are fetched. The email body is sent to
              Google&rsquo;s Gemini API to extract transaction fields (amount, date, merchant,
              reference, etc.).
            </li>
            <li>
              <strong>Extracted transaction data</strong> — stored in our database and associated
              with your account so the app can show your dashboard, analytics, and history.
            </li>
            <li>
              <strong>Profile info</strong> — used only to identify your account and display your
              name/avatar in the UI.
            </li>
          </ul>
          <p className="mt-2">
            We do not use your Gmail data for advertising, sell it, or share it with third parties
            beyond the processors listed below.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">3. Google API services user data policy</h2>
          <p>
            Our use and transfer of information received from Google APIs to any other app adheres
            to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-brand)] underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. Raw email content is used only to extract
            transaction information you can see in the app, is not transferred to others except to
            provide the service, is not used for advertising, and is not read by humans except
            (a) with your explicit consent, (b) for security purposes, or (c) to comply with
            applicable law.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">4. Data storage and retention</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account data and extracted transactions are stored in MongoDB Atlas.</li>
            <li>
              We do not store raw email bodies long-term. Once an email is parsed, only the
              extracted transaction fields and an internal reference to the message are retained.
            </li>
            <li>
              Your Google access token is held in server memory only for the duration of an
              active sync job and is never persisted to the database.
            </li>
            <li>
              Data is retained for as long as your account exists. You may delete your data at any
              time (see Your rights).
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">5. Third-party processors</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Google (OAuth & Gmail API)</strong> — for authentication and email retrieval.
            </li>
            <li>
              <strong>Google Gemini API</strong> — the content of bank notification emails is sent
              to Gemini for transaction extraction.
            </li>
            <li>
              <strong>MongoDB Atlas</strong> — database hosting.
            </li>
            <li>
              <strong>Vercel</strong> — application hosting.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">6. Your rights</h2>
          <p>You can at any time:</p>
          <ul className="list-disc pl-6 space-y-1 mt-1">
            <li>Delete individual transactions or categories from within the app.</li>
            <li>
              Revoke this app&rsquo;s access to your Google account at{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-brand)] underline"
              >
                myaccount.google.com/permissions
              </a>
              .
            </li>
            <li>
              Request full deletion of your account and all associated data by emailing{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--color-brand)] underline">
                {CONTACT_EMAIL}
              </a>
              .
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">7. Security</h2>
          <p>
            Data in transit is protected with TLS. Credentials and secrets are stored as
            environment variables on the hosting platform. No system is perfectly secure; please
            use a strong Google account password and enable two-factor authentication.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">8. Changes to this policy</h2>
          <p>
            We may update this policy as the app evolves. Material changes will be reflected here
            with an updated effective date.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">9. Contact</h2>
          <p>
            Questions or data-deletion requests:{' '}
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
