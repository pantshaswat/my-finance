'use client';

import { useState, useEffect } from 'react';
import { Card, Modal, EmptyState } from '@/components/ui';
import { BANK_PRESETS } from '@/lib/bankPresets';

interface BankConfig {
  bankEmail: string;
  bankName?: string;
  promptTemplate: string;
  linkedAt: string;
  lastSyncedAt?: string;
  stats: Record<string, number>;
}

export default function Settings() {
  const [configs, setConfigs] = useState<BankConfig[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<BankConfig | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const res = await fetch('/api/bank-settings');
    const data = await res.json();
    setConfigs(data.prompts || []);
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Remove ${email}?`)) return;
    await fetch(`/api/bank-settings?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
    setMessage(`Removed ${email}`);
    fetchSettings();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bank connections</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Configure which senders in Gmail to scan for transactions.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Add bank</button>
      </header>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm">
          {message}
        </div>
      )}

      {configs.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No banks connected"
            body="Add a bank to start syncing transactions from your Gmail."
            action={<button onClick={() => setShowAdd(true)} className="btn btn-primary">Add your first bank</button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map((c) => (
            <Card key={c.bankEmail} className="p-5">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{c.bankName || c.bankEmail}</h3>
                    {c.bankName && (
                      <span className="text-xs text-[var(--color-text-muted)]">{c.bankEmail}</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-[var(--color-text-muted)] flex-wrap">
                    <span>Linked {new Date(c.linkedAt).toLocaleDateString()}</span>
                    {c.lastSyncedAt && (
                      <span>Last sync {new Date(c.lastSyncedAt).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <StatPill label="parsed" value={c.stats.parsed || 0} tone="income" />
                    <StatPill label="ignored" value={c.stats.ignored || 0} tone="neutral" />
                    <StatPill label="failed" value={c.stats.failed || 0} tone="expense" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(c)} className="btn btn-secondary">Edit prompt</button>
                  <button onClick={() => handleDelete(c.bankEmail)} className="btn btn-danger">Remove</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddBankModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => { setShowAdd(false); setMessage('Bank added'); fetchSettings(); }}
      />
      <EditPromptModal
        config={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setMessage('Prompt updated'); fetchSettings(); }}
      />
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: 'income' | 'expense' | 'neutral' }) {
  const bg =
    tone === 'income' ? 'badge-income'
    : tone === 'expense' ? 'badge-expense'
    : 'badge-neutral';
  return <span className={`badge ${bg}`}>{value} {label}</span>;
}

function AddBankModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [presetId, setPresetId] = useState(BANK_PRESETS[0].id);
  const [bankName, setBankName] = useState(BANK_PRESETS[0].bankName);
  const [bankEmail, setBankEmail] = useState(BANK_PRESETS[0].bankEmail);
  const [promptTemplate, setPromptTemplate] = useState(BANK_PRESETS[0].promptTemplate);
  const [saving, setSaving] = useState(false);

  const selectPreset = (id: string) => {
    const p = BANK_PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setBankName(p.bankName === 'Custom' ? '' : p.bankName);
    setBankEmail(p.bankEmail);
    setPromptTemplate(p.promptTemplate);
  };

  const handleSave = async () => {
    if (!bankEmail.trim()) return;
    setSaving(true);
    const res = await fetch('/api/bank-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankEmail: bankEmail.trim(), bankName: bankName.trim(), promptTemplate }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add bank connection" wide>
      <div className="space-y-4">
        <div>
          <label className="label">Preset</label>
          <div className="flex gap-2 flex-wrap">
            {BANK_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  presetId === p.id
                    ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                    : 'bg-[var(--color-surface)] border-[var(--color-border-strong)] hover:bg-[var(--color-bg)]'
                }`}
              >
                {p.bankName}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bank name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="input"
              placeholder="e.g. Nabil Bank"
            />
          </div>
          <div>
            <label className="label">Sender email</label>
            <input
              type="email"
              value={bankEmail}
              onChange={(e) => setBankEmail(e.target.value)}
              className="input"
              placeholder="txn-alert@nabilbank.com"
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Gemini prompt template</label>
          <textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            rows={10}
            className="input font-mono text-xs"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Describes how Gemini should read this bank's emails. The field schema is enforced
            separately — you don't need to repeat it here.
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={!bankEmail || saving} className="btn btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : 'Save bank'}
          </button>
          <button onClick={onClose} className="btn btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function EditPromptModal({ config, onClose, onSaved }: { config: BankConfig | null; onClose: () => void; onSaved: () => void }) {
  const [bankName, setBankName] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setBankName(config.bankName || '');
      setPromptTemplate(config.promptTemplate);
    }
  }, [config]);

  if (!config) return null;

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/bank-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankEmail: config.bankEmail, bankName, promptTemplate }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  };

  return (
    <Modal open={!!config} onClose={onClose} title={`Edit ${config.bankName || config.bankEmail}`} wide>
      <div className="space-y-4">
        <div>
          <label className="label">Bank name</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label">Prompt template</label>
          <textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            rows={12}
            className="input font-mono text-xs"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="btn btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
