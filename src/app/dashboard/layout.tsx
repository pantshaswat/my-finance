'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '◉' },
  { href: '/dashboard/transactions', label: 'Transactions', icon: '≡' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '◊' },
  { href: '/dashboard/categories', label: 'Categories', icon: '◈' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col">
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          <p className="font-semibold text-lg tracking-tight">finance</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">email-synced</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                }`}
              >
                <span className="w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--color-border)]">
          {session?.user && (
            <div className="px-2 py-2">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                {session.user.email}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="btn btn-ghost w-full justify-start"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
