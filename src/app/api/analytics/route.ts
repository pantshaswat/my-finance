import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { authOptions } from '@/lib/auth';

const PERIOD_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
};

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '30d';
  const days = PERIOD_DAYS[period] ?? 30;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Previous period for MoM comparison.
  const prevStart = new Date(startDate);
  prevStart.setDate(prevStart.getDate() - days);

  const all = await Transaction.find({ userId: user._id }).populate('categoryId').lean();

  const inPeriod = all.filter((t: any) => new Date(t.date) >= startDate);
  const inPrev = all.filter((t: any) => {
    const d = new Date(t.date);
    return d >= prevStart && d < startDate;
  });

  const sum = (ts: any[], type: 'income' | 'expense') =>
    ts.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);

  const totalIncome = sum(inPeriod, 'income');
  const totalExpense = sum(inPeriod, 'expense');
  const prevIncome = sum(inPrev, 'income');
  const prevExpense = sum(inPrev, 'expense');

  // Daily time series (filled so charts align).
  const dailyMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 0; i <= days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dailyMap[dateKey(d)] = { income: 0, expense: 0 };
  }
  for (const t of inPeriod as any[]) {
    const k = dateKey(new Date(t.date));
    if (dailyMap[k]) dailyMap[k][t.type as 'income' | 'expense'] += t.amount;
  }
  const daily = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));

  // By category.
  const byCategory: Record<string, { income: number; expense: number; color?: string }> = {};
  for (const t of inPeriod as any[]) {
    const name = t.categoryId?.name || 'Uncategorized';
    if (!byCategory[name]) byCategory[name] = { income: 0, expense: 0, color: t.categoryId?.color };
    byCategory[name][t.type as 'income' | 'expense'] += t.amount;
  }

  // Top merchants (expense only, from email-sourced txns).
  const merchantMap: Record<string, number> = {};
  for (const t of inPeriod as any[]) {
    if (t.type !== 'expense') continue;
    const m = t.merchant || t.description;
    if (!m) continue;
    merchantMap[m] = (merchantMap[m] || 0) + t.amount;
  }
  const topMerchants = Object.entries(merchantMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Largest transactions in period.
  const largest = [...inPeriod]
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 5)
    .map((t: any) => ({
      _id: t._id,
      description: t.description,
      amount: t.amount,
      type: t.type,
      date: t.date,
      category: t.categoryId?.name || 'Uncategorized',
    }));

  return NextResponse.json({
    period,
    days,
    startDate,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: inPeriod.length,
    prev: { income: prevIncome, expense: prevExpense, balance: prevIncome - prevExpense },
    daily,
    byCategory,
    topMerchants,
    largest,
    allTime: {
      income: sum(all as any[], 'income'),
      expense: sum(all as any[], 'expense'),
      count: all.length,
    },
  });
}
