'use client';

import { useEffect, useState } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { differenceInDays, differenceInSeconds, format, parseISO } from 'date-fns';
import { RevenueEntry, Settings } from '@/lib/types';
import { getRevenueEntries, getSettings } from '@/lib/storage';

export default function Home() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ targetRevenue: 10000, demoDay: '' });
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setMounted(true);
    setEntries(getRevenueEntries());
    setSettings(getSettings());
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (!settings.demoDay) return;

    const updateCountdown = () => {
      const now = new Date();
      const demo = parseISO(settings.demoDay);
      const totalSeconds = Math.max(0, differenceInSeconds(demo, now));

      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [settings.demoDay]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate cumulative revenue for chart
  let cumulative = 0;
  const chartData = sortedEntries.map(entry => {
    cumulative += entry.amount;
    return {
      date: format(parseISO(entry.date), 'MMM d'),
      revenue: cumulative,
      added: entry.amount,
    };
  });

  // Current total revenue
  const totalRevenue = entries.reduce((sum, e) => sum + e.amount, 0);

  // Days until demo day
  const daysUntilDemo = settings.demoDay
    ? differenceInDays(parseISO(settings.demoDay), new Date())
    : null;

  // Calculate money needed this week to stay on track
  const weeklyTarget = (() => {
    if (!settings.demoDay || totalRevenue >= settings.targetRevenue) return 0;

    const weeksLeft = (daysUntilDemo || 0) / 7;
    if (weeksLeft <= 0) return settings.targetRevenue - totalRevenue;

    const remaining = settings.targetRevenue - totalRevenue;
    return remaining / weeksLeft;
  })();


  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold">Revenue</h1>
          <a
            href="/admin"
            className="text-zinc-500 hover:text-white transition-colors text-sm"
          >
            Edit
          </a>
        </div>

        {/* Main Revenue Display */}
        <div className="mb-12">
          <div className="text-6xl font-bold mb-2">
            ${totalRevenue.toLocaleString()}
          </div>
          <div className="text-zinc-500">
            MRR
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="mb-12 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Money Needed This Week */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className="text-3xl font-bold text-yellow-500">
              ${weeklyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Needed/Week
            </div>
          </div>

          {/* Target Revenue */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className="text-3xl font-bold">
              ${settings.targetRevenue.toLocaleString()}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Target
            </div>
          </div>

          {/* Remaining to Target */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className="text-3xl font-bold">
              ${Math.max(0, settings.targetRevenue - totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Remaining
            </div>
          </div>

          {/* Countdown to Demo */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className="text-2xl font-bold font-mono">
              {settings.demoDay ? (
                <span>
                  {countdown.days}<span className="text-zinc-500 text-lg">d </span>
                  {String(countdown.hours).padStart(2, '0')}<span className="text-zinc-500 text-lg">h </span>
                  {String(countdown.minutes).padStart(2, '0')}<span className="text-zinc-500 text-lg">m </span>
                  {String(countdown.seconds).padStart(2, '0')}<span className="text-zinc-500 text-lg">s</span>
                </span>
              ) : '—'}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Until Demo Day
            </div>
          </div>
        </div>

        {/* Progress to Target */}
        {settings.targetRevenue > 0 && (
          <div className="mt-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-500">Progress to Target</span>
              <span className="text-zinc-400">
                {((totalRevenue / settings.targetRevenue) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((totalRevenue / settings.targetRevenue) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
