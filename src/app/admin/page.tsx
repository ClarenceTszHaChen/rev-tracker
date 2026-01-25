'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { RevenueEntry, Settings } from '@/lib/types';
import {
  getRevenueEntries,
  addRevenueEntry,
  deleteRevenueEntry,
  getSettings,
  saveSettings,
} from '@/lib/storage';

export default function AdminPage() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ targetRevenue: 10000, demoDay: '' });
  const [mounted, setMounted] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');

  useEffect(() => {
    setMounted(true);
    setEntries(getRevenueEntries());
    setSettings(getSettings());
  }, []);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;

    addRevenueEntry({
      amount: parseFloat(amount),
      date,
      note: note || undefined,
    });

    setEntries(getRevenueEntries());
    setAmount('');
    setNote('');
  };

  const handleDelete = (id: string) => {
    deleteRevenueEntry(id);
    setEntries(getRevenueEntries());
  };

  const handleSettingsChange = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold">Settings</h1>
          <a
            href="/"
            className="text-zinc-500 hover:text-white transition-colors text-sm"
          >
            Back to Dashboard
          </a>
        </div>

        {/* Settings */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Goals</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-500 mb-2">Target Revenue</label>
              <input
                type="number"
                value={settings.targetRevenue}
                onChange={(e) => handleSettingsChange({ targetRevenue: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-500 mb-2">Demo Day (YYYY-MM-DD)</label>
              <input
                type="text"
                placeholder="2026-03-23"
                value={settings.demoDay}
                onChange={(e) => handleSettingsChange({ demoDay: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        </div>

        {/* Add Revenue Form */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add Revenue</h2>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-500 mb-2">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-500 mb-2">Date (YYYY-MM-DD)</label>
                <input
                  type="text"
                  placeholder="2026-01-25"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-500 mb-2">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Customer ABC"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Add Revenue
            </button>
          </form>
        </div>

        {/* Revenue Entries */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue History</h2>
          {sortedEntries.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No entries yet</p>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3 px-4 bg-zinc-800 rounded-lg"
                >
                  <div>
                    <div className="font-medium">${entry.amount.toLocaleString()}</div>
                    <div className="text-sm text-zinc-500">
                      {format(parseISO(entry.date), 'MMM d, yyyy')}
                      {entry.note && ` — ${entry.note}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
