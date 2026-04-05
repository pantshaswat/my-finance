'use client';

import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'income' | 'expense' | 'brand';
  hint?: string;
}) {
  const toneColor =
    tone === 'income'
      ? 'text-[var(--color-income)]'
      : tone === 'expense'
      ? 'text-[var(--color-expense)]'
      : tone === 'brand'
      ? 'text-[var(--color-brand)]'
      : 'text-[var(--color-text)]';

  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-2xl font-semibold mt-2 ${toneColor}`}>{value}</p>
      {hint && <p className="text-xs text-[var(--color-text-faint)] mt-1">{hint}</p>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`card p-6 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost btn text-xl leading-none px-2 py-0">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      <p className="font-medium text-[var(--color-text)]">{title}</p>
      {body && <p className="text-sm text-[var(--color-text-muted)] mt-1">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function formatDateTime(d: string | Date, opts?: { omitYear?: boolean }) {
  const date = typeof d === 'string' ? new Date(d) : d;
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: opts?.omitYear ? undefined : 'numeric',
  });
  if (!hasTime) return datePart;
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

/** Convert a JS Date to the value format expected by <input type="datetime-local">. */
export function toDateTimeLocal(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function formatCurrency(n: number, currency = 'Rs.') {
  return `${currency} ${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
