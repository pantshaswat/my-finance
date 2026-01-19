'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Analytics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Record<string, { income: number; expense: number }>;
  transactionCount: number;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('month');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    setLoading(false);
  };

  const getDateRange = () => {
    const today = new Date();
    const days = period === 'week' ? 7 : 30;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    
    return {
      start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      end: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!analytics) return <div className="p-8">No data available</div>;

  const dateRange = getDateRange();
  const categoryData = Object.entries(analytics.byCategory).map(([name, data]) => ({
    name,
    expense: data.expense,
    income: data.income,
    net: data.income - data.expense,
  }));

  const topExpenses = [...categoryData]
    .sort((a, b) => b.expense - a.expense)
    .slice(0, 5);

  const topIncome = [...categoryData]
    .sort((a, b) => b.income - a.income)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Finance Manager</h1>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Dashboard
            </Link>
            <Link href="/dashboard/transactions" className="text-blue-600 hover:underline">
              Transactions
            </Link>
            <Link href="/dashboard/categories" className="text-blue-600 hover:underline">
              Categories
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">Analytics</h2>
            <p className="text-gray-600 mt-1">
              {dateRange.start} - {dateRange.end}
            </p>
          </div>
          <div className="flex gap-2 bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 rounded ${
                period === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 rounded ${
                period === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Total Income</h3>
            <p className="text-2xl font-bold text-green-600">
              Rs. {analytics.totalIncome.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600">
              Rs. {analytics.totalExpense.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Net Balance</h3>
            <p className={`text-2xl font-bold ${analytics.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs. {analytics.balance.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Total Transactions</h3>
            <p className="text-2xl font-bold text-blue-600">
              {analytics.transactionCount}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Top Expenses</h3>
            <div className="space-y-3">
              {topExpenses.length > 0 ? topExpenses.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-red-600 font-bold">Rs. {cat.expense.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${(cat.expense / analytics.totalExpense) * 100}%` }}
                    />
                  </div>
                </div>
              )) : <p className="text-gray-500">No expense data</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Top Income</h3>
            <div className="space-y-3">
              {topIncome.length > 0 ? topIncome.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-green-600 font-bold">Rs. {cat.income.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(cat.income / analytics.totalIncome) * 100}%` }}
                    />
                  </div>
                </div>
              )) : <p className="text-gray-500">No income data</p>}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">All Categories</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-right py-3 px-4">Income</th>
                  <th className="text-right py-3 px-4">Expense</th>
                  <th className="text-right py-3 px-4">Net</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.length > 0 ? categoryData.map((cat) => (
                  <tr key={cat.name} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{cat.name}</td>
                    <td className="py-3 px-4 text-right text-green-600">
                      Rs. {cat.income.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">
                      Rs. {cat.expense.toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${cat.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Rs. {cat.net.toFixed(2)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No transactions in this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}