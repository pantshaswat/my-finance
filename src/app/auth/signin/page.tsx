'use client';

import { signIn } from 'next-auth/react';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="card p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-2xl font-semibold tracking-tight">finance</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Automatic transaction tracking from your bank emails.
          </p>
        </div>
        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="btn btn-primary w-full justify-center py-3"
        >
          Continue with Google
        </button>
        <p className="text-xs text-[var(--color-text-faint)] text-center mt-4">
          Grants read-only access to your Gmail to scan bank emails.
        </p>
      </div>
    </div>
  );
}
