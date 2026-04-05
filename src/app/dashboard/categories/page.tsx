'use client';

import { useEffect, useState } from 'react';
import { Category } from '@/types';
import { Card, Modal, EmptyState } from '@/components/ui';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'expense', color: '#6366f1' });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    setCategories(await res.json());
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setShowAdd(false);
    setFormData({ name: '', type: 'expense', color: '#6366f1' });
    fetchCategories();
  };

  const expense = categories.filter((c) => c.type === 'expense');
  const income = categories.filter((c) => c.type === 'income');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {categories.length} total · {income.length} income · {expense.length} expense
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Category</button>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <CategoryList title="Expenses" categories={expense} tone="expense" />
        <CategoryList title="Income" categories={income} tone="income" />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add category">
        <form onSubmit={handleAdd} className="space-y-4">
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
            <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CategoryList({
  title,
  categories,
  tone,
}: { title: string; categories: Category[]; tone: 'income' | 'expense' }) {
  const toneClass = tone === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]';
  return (
    <Card className="p-5">
      <h2 className={`text-sm font-semibold mb-3 ${toneClass}`}>{title}</h2>
      {categories.length === 0 ? (
        <EmptyState title="None yet" />
      ) : (
        <div className="space-y-1">
          {categories.map((c) => (
            <div
              key={c._id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg)]"
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-sm">{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
