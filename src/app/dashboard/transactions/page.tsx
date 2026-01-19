'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Transaction, Category } from '@/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [transRes, catRes] = await Promise.all([
      fetch('/api/transactions'),
      fetch('/api/categories'),
    ]);
    setTransactions(await transRes.json());
    setCategories(await catRes.json());
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t._id);
    setEditData({
      _id: t._id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: new Date(t.date).toISOString().split('T')[0],
      categoryId: typeof t.categoryId === 'object' ? t.categoryId._id : t.categoryId,
    });
  };

  const handleSave = async () => {
    await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this transaction?')) {
      await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">All Transactions</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t._id} className="border-b">
                  {editingId === t._id ? (
                    <>
                      <td className="p-3">
                        <input
                          type="date"
                          value={editData.date}
                          onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={editData.categoryId}
                          onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })}
                          className="w-full p-1 border rounded"
                        >
                          {categories.filter(c => c.type === editData.type).map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={editData.type}
                          onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                          className="w-full p-1 border rounded"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editData.amount}
                          onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                          className="w-full p-1 border rounded text-right"
                        />
                      </td>
                      <td className="p-3">{t.source}</td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={handleSave} className="text-green-600 hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-600 hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="p-3">{t.description}</td>
                      <td className="p-3">{typeof t.categoryId === 'object' ? t.categoryId.name : 'Unknown'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}Rs. {t.amount.toFixed(2)}
                      </td>
                      <td className="p-3">{t.source}</td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => handleEdit(t)} className="text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(t._id)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}