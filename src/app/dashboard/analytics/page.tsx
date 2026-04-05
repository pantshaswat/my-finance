'use client';

import { useEffect, useState } from 'react';
import { Card, StatCard, EmptyState, formatCurrency } from '@/components/ui';
import { LineChart, Donut } from '@/components/charts';

type Period = '7d' | '30d' | '90d' | '12m';

interface AnalyticsData {
  period: string;
  days: number;
  startDate: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  prev: { income: number; expense: number; balance: number };
  daily: Array<{ date: string; income: number; expense: number }>;
  byCategory: Record<string, { income: number; expense: number; color?: string }>;
  topMerchants: Array<{ name: string; amount: number }>;
  largest: Array<{ _id: string; description: string; amount: number; type: string; date: string; category: string }>;
  allTime: { income: number; expense: number; count: number };
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const res = await fetch(`/api/analytics?period=${period}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-[var(--color-text-muted)]">Loading…</div>;
  if (!data) return <div className="p-8 text-[var(--color-text-muted)]">No data</div>;

  const expenseCats = Object.entries(data.byCategory)
    .map(([name, v], i) => ({ label: name, value: v.expense, color: v.color || PALETTE[i % PALETTE.length] }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  const incomeCats = Object.entries(data.byCategory)
    .map(([name, v], i) => ({ label: name, value: v.income, color: v.color || PALETTE[i % PALETTE.length] }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  const momExpense = pctChange(data.totalExpense, data.prev.expense);
  const momIncome = pctChange(data.totalIncome, data.prev.income);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' – '}
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1">
          {(['7d', '30d', '90d', '12m'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Income"
          value={formatCurrency(data.totalIncome)}
          tone="income"
          hint={momIncome ? `${momIncome > 0 ? '▲' : '▼'} ${Math.abs(momIncome).toFixed(0)}% vs prev` : undefined}
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(data.totalExpense)}
          tone="expense"
          hint={momExpense ? `${momExpense > 0 ? '▲' : '▼'} ${Math.abs(momExpense).toFixed(0)}% vs prev` : undefined}
        />
        <StatCard
          label="Net"
          value={formatCurrency(data.balance)}
          tone={data.balance >= 0 ? 'income' : 'expense'}
        />
        <StatCard
          label="Transactions"
          value={data.transactionCount.toString()}
          tone="brand"
          hint={`${data.allTime.count} all-time`}
        />
      </div>

      <Card className="p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold">Daily flow</h2>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-income)]" /> Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-expense)]" /> Expense
            </span>
          </div>
        </div>
        <LineChart data={data.daily} height={220} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Expense breakdown</h2>
          <CategoryBreakdown slices={expenseCats} total={data.totalExpense} />
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Income breakdown</h2>
          <CategoryBreakdown slices={incomeCats} total={data.totalIncome} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Top merchants</h2>
          {data.topMerchants.length === 0 ? (
            <EmptyState title="No merchant data" body="Sync bank emails to populate this." />
          ) : (
            <div className="space-y-2">
              {data.topMerchants.map((m) => (
                <div key={m.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate">{m.name}</span>
                    <span className="text-[var(--color-expense)] font-semibold whitespace-nowrap ml-2">
                      {formatCurrency(m.amount)}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-bg)] rounded-full h-1.5">
                    <div
                      className="bg-[var(--color-expense)] h-1.5 rounded-full"
                      style={{
                        width: `${(m.amount / data.topMerchants[0].amount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Largest transactions</h2>
          {data.largest.length === 0 ? (
            <EmptyState title="No transactions yet" />
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {data.largest.map((t) => (
                <div key={t._id} className="py-2.5 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {t.category}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold whitespace-nowrap ${
                    t.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'
                  }`}>
                    {t.type === 'income' ? '+' : '−'} {formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function CategoryBreakdown({
  slices,
  total,
}: {
  slices: Array<{ label: string; value: number; color: string }>;
  total: number;
}) {
  if (slices.length === 0) return <EmptyState title="No data in this period" />;
  return (
    <div className="flex gap-6 items-center">
      <Donut slices={slices} />
      <div className="flex-1 space-y-1.5 min-w-0">
        {slices.slice(0, 8).map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="text-[var(--color-text-muted)] font-medium">
              {((s.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function pctChange(current: number, prev: number): number {
  if (prev === 0) return 0;
  return ((current - prev) / prev) * 100;
}
