import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'month';
  const days = period === 'week' ? 7 : 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const allTransactions = await Transaction.find({
    userId: user._id,
  }).populate('categoryId');

  const recentTransactions = allTransactions.filter(
    t => new Date(t.date) >= startDate
  );

  const totalIncome = allTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = allTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const byCategory = recentTransactions.reduce((acc: any, t) => {
    const categoryName = (t.categoryId as any)?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = { income: 0, expense: 0 };
    }
    acc[categoryName][t.type] += t.amount;
    return acc;
  }, {});

  return NextResponse.json({
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byCategory,
    transactionCount: allTransactions.length,
  });
}