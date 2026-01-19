'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_NABIL_BANK_PROMPT } from '@/lib/gemini';

interface BankConfig {
  bankEmail: string;
  promptTemplate: string;
  linkedAt: string;
}

export default function Settings() {
  const [bankEmail, setBankEmail] = useState('');
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_NABIL_BANK_PROMPT);
  const [configs, setConfigs] = useState<BankConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await fetch('/api/bank-settings');
    const data = await res.json();
    setConfigs(data.prompts || []);
  };

  const handleSave = async () => {
    if (!bankEmail.trim()) {
      setMessage('Please enter a bank email address');
      return;
    }

    setSaving(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/bank-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankEmail, promptTemplate }),
      });

      if (res.ok) {
        setMessage('Bank configuration saved successfully!');
        setBankEmail('');
        setPromptTemplate(DEFAULT_NABIL_BANK_PROMPT);
        await fetchSettings();
      } else {
        setMessage('Error saving configuration');
      }
    } catch (error) {
      setMessage('Error saving configuration');
    }
    
    setSaving(false);
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Remove ${email}?`)) return;

    try {
      await fetch(`/api/bank-settings?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      setMessage('Bank email removed');
      await fetchSettings();
    } catch (error) {
      setMessage('Error removing bank email');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Bank Email Settings</h1>

        {message && (
          <div className={`p-4 rounded mb-6 ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Configured Bank Emails</h2>
          {configs.length === 0 ? (
            <p className="text-gray-500">
              No bank emails configured yet. Add one below to start syncing transactions.
            </p>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <div key={config.bankEmail} className="p-4 bg-gray-50 rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">{config.bankEmail}</p>
                    <p className="text-sm text-gray-500">
                      Syncing from: {new Date(config.linkedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(config.bankEmail)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Add Bank Email</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Bank Email Address
            </label>
            <input
              type="email"
              value={bankEmail}
              onChange={(e) => setBankEmail(e.target.value)}
              placeholder="txn-alert@nabilbank.com"
              className="w-full p-2 border rounded"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the email address your bank uses to send transaction notifications
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Gemini Prompt Template
            </label>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              rows={10}
              className="w-full p-2 border rounded font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-1">
              Customize how Gemini AI parses transaction emails from this bank
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={!bankEmail || saving}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Bank Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}