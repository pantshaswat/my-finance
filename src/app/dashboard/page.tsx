'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Analytics, Transaction, Category, SyncJob } from '@/types';
import { Card, StatCard, Modal, EmptyState, formatCurrency, formatDateTime, toDateTimeLocal } from '@/components/ui';

export default function Dashboard() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [syncJob, setSyncJob] = useState<SyncJob | null>(null);

  const syncing = syncJob?.status === 'queued' || syncJob?.status === 'running';

  useEffect(() => {
    if (session?.user?.email) {
      fetchData();
      pollSyncStatus();
    }
    // Only re-run when the user actually changes, not on every session refetch.
  }, [session?.user?.email]);

  useEffect(() => {
    if (!syncing) return;
    const id = setInterval(() => pollSyncStatus(syncJob?._id), 2000);
    return () => clearInterval(id);
  }, [syncing, syncJob?._id]);

  const fetchData = async () => {
    try {
      const [a, t, c] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/transactions'),
        fetch('/api/categories'),
      ]);
      if (a.ok) setAnalytics(await a.json());
      if (t.ok) setTransactions(await t.json());
      if (c.ok) setCategories(await c.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const pollSyncStatus = async (jobId?: string) => {
    const qs = jobId ? `?jobId=${jobId}` : '';
    const res = await fetch(`/api/sync-emails/status${qs}`);
    if (!res.ok) return;
    const { job } = await res.json();
    if (!job) return;
    setSyncJob(job);
    if (job.status === 'completed' || job.status === 'failed') fetchData();
  };

  const syncEmails = async () => {
    const res = await fetch('/api/sync-emails', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Sync failed to start');
      return;
    }
    const { jobId } = await res.json();
    pollSyncStatus(jobId);
  };

  if (loading) return <div className="p-8 text-[var(--color-text-muted)]">Loading…</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {session?.user?.name ? `Hi ${session.user.name.split(' ')[0]}, ` : ''}
            here's where your money went.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddCategory(true)} className="btn btn-secondary">
            + Category
          </button>
          <button onClick={() => setShowAddTransaction(true)} className="btn btn-secondary">
            + Transaction
          </button>
          <button onClick={syncEmails} disabled={syncing} className="btn btn-primary">
            {syncing ? 'Syncing…' : 'Sync emails'}
          </button>
        </div>
      </header>

      {syncJob && (
        <SyncBanner job={syncJob} onDismiss={() => setSyncJob(null)} syncing={syncing} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total income"
          value={formatCurrency(analytics?.totalIncome || 0)}
          tone="income"
        />
        <StatCard
          label="Total expenses"
          value={formatCurrency(analytics?.totalExpense || 0)}
          tone="expense"
        />
        <StatCard
          label="Net balance"
          value={formatCurrency(analytics?.balance || 0)}
          tone={analytics && analytics.balance >= 0 ? 'income' : 'expense'}
          hint={`${analytics?.transactionCount || 0} transactions total`}
        />
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold">Recent transactions</h2>
          <a href="/dashboard/transactions" className="text-xs text-[var(--color-brand)] hover:underline">
            View all →
          </a>
        </div>
        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            body="Add one manually or sync your bank emails to get started."
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {transactions.slice(0, 10).map((t) => (
              <TransactionRow key={t._id} t={t} />
            ))}
          </div>
        )}
      </Card>

      <AddTransactionModal
        open={showAddTransaction}
        categories={categories}
        onClose={() => setShowAddTransaction(false)}
        onSuccess={() => { setShowAddTransaction(false); fetchData(); }}
      />
      <AddCategoryModal
        open={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSuccess={() => { setShowAddCategory(false); fetchData(); }}
      />
    </div>
  );
}

function SyncBanner({ job, onDismiss, syncing }: { job: SyncJob; onDismiss: () => void; syncing: boolean }) {
  const tone =
    job.status === 'failed' ? 'expense'
    : job.status === 'completed' ? 'income'
    : 'brand';
  const bg =
    tone === 'expense' ? 'bg-[var(--color-expense-soft)] border-[var(--color-expense)]/20'
    : tone === 'income' ? 'bg-[var(--color-income-soft)] border-[var(--color-income)]/20'
    : 'bg-[var(--color-brand-soft)] border-[var(--color-brand)]/20';

  return (
    <div className={`mb-6 p-4 rounded-lg border ${bg} flex justify-between items-start`}>
      <div className="flex-1">
        <p className="font-medium text-sm">
          {syncing && 'Syncing emails…'}
          {job.status === 'completed' && 'Sync complete'}
          {job.status === 'failed' && 'Sync failed'}
        </p>
        {job.currentMessage && syncing && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{job.currentMessage}</p>
        )}
        {job.error && <p className="text-sm text-[var(--color-expense)] mt-1">{job.error}</p>}
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          parsed {job.totals.parsed} · ignored {job.totals.ignored} · skipped {job.totals.skipped}
          {' · '}failed {job.totals.failed} · fetched {job.totals.fetched}
        </p>
      </div>
      {!syncing && (
        <button onClick={onDismiss} className="btn-ghost btn text-lg leading-none px-2 py-0">×</button>
      )}
    </div>
  );
}

function TransactionRow({ t }: { t: Transaction }) {
  const catName = typeof t.categoryId === 'object' ? t.categoryId.name : 'Unknown';
  return (
    <div className="flex justify-between items-center py-3">
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{t.description}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-text-muted)]">
          <span>{formatDateTime(t.date, { omitYear: true })}</span>
          <span>·</span>
          <span>{catName}</span>
          {t.source === 'email' && <span className="badge badge-neutral">email</span>}
        </div>
      </div>
      <p className={`font-semibold text-sm ${t.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}`}>
        {t.type === 'income' ? '+' : '−'} {formatCurrency(t.amount).replace('Rs. ', 'Rs ')}
      </p>
    </div>
  );
}

function AddTransactionModal({ open, categories, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    description: '',
    date: toDateTimeLocal(new Date()),
    categoryId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        amount: parseFloat(formData.amount),
        // datetime-local has no timezone — treat as local time.
        date: new Date(formData.date).toISOString(),
      }),
    });
    onSuccess();
  };

  const filtered = categories.filter((c: Category) => c.type === formData.type);

  return (
    <Modal open={open} onClose={onClose} title="Add transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value, categoryId: '' })}
            className="input"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="input"
            required
          >
            <option value="">Select category</option>
            {filtered.map((c: Category) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Amount</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Date & time</label>
          <input
            type="datetime-local"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="input"
            required
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn btn-primary flex-1 justify-center">Add</button>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function AddCategoryModal({ open, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({ name: '', type: 'expense', color: '#6366f1' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    onSuccess();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add category">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="input"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className="label">Color</label>
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="input h-10 p-1"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn btn-primary flex-1 justify-center">Create</button>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
