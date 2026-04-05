'use client';

import { signIn } from 'next-auth/react';

export default function SignIn() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--color-brand), transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--color-income), transparent 70%)' }}
      />

      <div className="relative min-h-screen flex flex-col">
        <main className="flex-1 grid lg:grid-cols-2 gap-10 items-center max-w-6xl w-full mx-auto px-6 py-12">
          {/* Left: pitch */}
          <section className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium text-[var(--color-text-muted)] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-income)] animate-pulse" />
              Automatic. Private. Instant.
            </div>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-[var(--color-text)]">
              Your bank emails,{' '}
              <span className="text-[var(--color-brand)]">turned into finances.</span>
            </h1>
            <p className="mt-4 text-base text-[var(--color-text-muted)] max-w-md">
              Connect Gmail once. We read only your bank notifications, extract every transaction
              with AI, and show you where your money actually goes.
            </p>

            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-3 items-start">
                  <span className="mt-0.5 h-6 w-6 flex items-center justify-center rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)] shrink-0">
                    {f.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{f.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Right: sign-in card */}
          <section className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="card p-8 w-full max-w-sm shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-9 w-9 rounded-lg bg-[var(--color-brand)] text-white flex items-center justify-center font-semibold">
                  ₨
                </div>
                <p className="text-lg font-semibold tracking-tight">Finance Manager</p>
              </div>

              <h2 className="text-xl font-semibold tracking-tight">Welcome</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Sign in to sync your transactions.
              </p>

              <button
                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] transition-colors font-medium text-sm"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <p className="text-xs text-[var(--color-text-faint)] text-center mt-5 leading-relaxed">
                We request <strong>read-only</strong> Gmail access, scoped to sender addresses you
                configure. We never send, modify, or delete emails.
              </p>

              <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-center">
                <p className="text-xs text-[var(--color-text-faint)]">
                  By continuing you agree to our{' '}
                  <a href="/terms" className="text-[var(--color-brand)] hover:underline">
                    Terms
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-[var(--color-brand)] hover:underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative py-6 text-center text-xs text-[var(--color-text-faint)]">
          © {new Date().getFullYear()} Finance Manager
        </footer>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: 'Email-driven, zero manual entry',
    body: 'Bank notifications are parsed automatically into categorized transactions.',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="m4 8 8 5 8-5" />
      </svg>
    ),
  },
  {
    title: 'Read-only, never stored',
    body: 'Only the bank senders you list are scanned. Raw emails aren’t kept.',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: 'Analytics that make sense',
    body: 'Trends, category breakdowns, top merchants, and month-over-month changes.',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 5-6" />
      </svg>
    ),
  },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.96 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
