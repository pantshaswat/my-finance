'use client';

import { useEffect, useState, useMemo } from 'react';
import { Transaction, Category } from '@/types';
import { Card, EmptyState, formatCurrency, formatDateTime, toDateTimeLocal } from '@/components/ui';

type Filter = 'all' | 'income' | 'expense' | 'email' | 'manual';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [tr, cr] = await Promise.all([fetch('/api/transactions'), fetch('/api/categories')]);
    setTransactions(await tr.json());
    setCategories(await cr.json());
  };

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === 'income' && t.type !== 'income') return false;
      if (filter === 'expense' && t.type !== 'expense') return false;
      if (filter === 'email' && t.source !== 'email') return false;
      if (filter === 'manual' && t.source !== 'manual') return false;
      if (search) {
        const q = search.toLowerCase();
        const catName = typeof t.categoryId === 'object' ? t.categoryId.name : '';
        return (
          t.description.toLowerCase().includes(q) ||
          (t.merchant || '').toLowerCase().includes(q) ||
          catName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, filter, search]);

  const handleEdit = (t: Transaction) => {
    setEditingId(t._id);
    setEditData({
      _id: t._id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: toDateTimeLocal(t.date),
      categoryId: typeof t.categoryId === 'object' ? t.categoryId._id : t.categoryId,
    });
  };

  const handleSave = async () => {
    await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editData, date: new Date(editData.date).toISOString() }),
    });
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {filtered.length} of {transactions.length} shown
        </p>
      </header>

      <Card className="mb-4 p-4 flex gap-3 items-center flex-wrap">
        <input
          type="text"
          placeholder="Search description, merchant, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[240px]"
        />
        <div className="flex gap-1 bg-[var(--color-bg)] rounded-lg p-1">
          {(['all', 'income', 'expense', 'email', 'manual'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize ${
                filter === f
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No transactions match" body="Try a different filter or search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                <tr className="text-left">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Description</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium text-right">Amount</th>
                  <th className="p-3 font-medium">Source</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filtered.map((t) => (
                  <tr key={t._id} className="hover:bg-[var(--color-bg)]">
                    {editingId === t._id ? (
                      <EditRow
                        t={t}
                        categories={categories}
                        editData={editData}
                        setEditData={setEditData}
                        onSave={handleSave}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <ViewRow t={t} onEdit={() => handleEdit(t)} onDelete={() => handleDelete(t._id)} />
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ViewRow({ t, onEdit, onDelete }: { t: Transaction; onEdit: () => void; onDelete: () => void }) {
  const catName = typeof t.categoryId === 'object' ? t.categoryId.name : 'Unknown';
  return (
    <>
      <td className="p-3 whitespace-nowrap text-[var(--color-text-muted)]">
        {formatDateTime(t.date)}
      </td>
      <td className="p-3">
        <p className="font-medium">{t.description}</p>
        {t.merchant && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.merchant}</p>
        )}
      </td>
      <td className="p-3">{catName}</td>
      <td className="p-3">
        <span className={`badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
          {t.type}
        </span>
      </td>
      <td className={`p-3 text-right font-semibold whitespace-nowrap ${
        t.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'
      }`}>
        {t.type === 'income' ? '+' : '−'} {formatCurrency(t.amount)}
      </td>
      <td className="p-3">
        <span className="badge badge-neutral">{t.source}</span>
      </td>
      <td className="p-3 text-right whitespace-nowrap">
        <button onClick={onEdit} className="btn-ghost btn text-xs">Edit</button>
        <button onClick={onDelete} className="btn-danger btn text-xs">Delete</button>
      </td>
    </>
  );
}

function EditRow({ t, categories, editData, setEditData, onSave, onCancel }: any) {
  return (
    <>
      <td className="p-2">
        <input
          type="datetime-local"
          value={editData.date}
          onChange={(e) => setEditData({ ...editData, date: e.target.value })}
          className="input text-xs"
        />
      </td>
      <td className="p-2">
        <input
          type="text"
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          className="input text-xs"
        />
      </td>
      <td className="p-2">
        <select
          value={editData.categoryId}
          onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })}
          className="input text-xs"
        >
          {categories.filter((c: Category) => c.type === editData.type).map((c: Category) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <select
          value={editData.type}
          onChange={(e) => setEditData({ ...editData, type: e.target.value })}
          className="input text-xs"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </td>
      <td className="p-2">
        <input
          type="number"
          step="0.01"
          value={editData.amount}
          onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
          className="input text-xs text-right"
        />
      </td>
      <td className="p-2 text-[var(--color-text-muted)] text-xs">{t.source}</td>
      <td className="p-2 text-right whitespace-nowrap">
        <button onClick={onSave} className="btn btn-primary text-xs">Save</button>
        <button onClick={onCancel} className="btn btn-ghost text-xs">Cancel</button>
      </td>
    </>
  );
}
