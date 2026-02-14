'use client';

import { useEffect, useState, useCallback } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { differenceInDays, differenceInSeconds, format, parseISO, startOfWeek, endOfWeek as getEndOfWeek } from 'date-fns';
import { RevenueEntry, Settings } from '@/lib/types';
import { fetchData, updateSettings as apiUpdateSettings } from '@/lib/storage';

export default function Home() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ targetRevenue: 25000, demoDay: '' });
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [editingTarget, setEditingTarget] = useState(false);
  const [editingDemo, setEditingDemo] = useState(false);

  const loadData = useCallback(async () => {
    const data = await fetchData();
    setEntries(data.entries);
    setSettings(data.settings);
    setLoading(false);
  }, []);

  const handleUpdateSettings = async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await apiUpdateSettings(newSettings);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  if (loading) {
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

  // Aggregate entries by date, then calculate cumulative revenue
  const dailyTotals = new Map<string, number>();
  for (const entry of sortedEntries) {
    const key = entry.date;
    dailyTotals.set(key, (dailyTotals.get(key) || 0) + entry.amount);
  }
  let cumulative = 0;
  const chartData = Array.from(dailyTotals.entries()).map(([date, amount]) => {
    cumulative += amount;
    return {
      date: format(parseISO(date), 'MMM d'),
      revenue: cumulative,
      added: amount,
    };
  });


  // Current total revenue
  const totalRevenue = entries.reduce((sum, e) => sum + e.amount, 0);


  // Split remaining revenue evenly across full calendar weeks (Mon-Sun) until demo
  const remaining = settings.targetRevenue - totalRevenue;
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = getEndOfWeek(now, { weekStartsOn: 1 }); // Sunday
  const demo = settings.demoDay ? parseISO(settings.demoDay) : null;

  // Count full weeks from this week's Monday to demo day
  const weeksUntilDemo = demo ? Math.max(1, Math.ceil(differenceInDays(demo, weekStart) / 7)) : 0;
  const addThisWeek = weeksUntilDemo > 0 && remaining > 0 ? Math.round(remaining / weeksUntilDemo) : 0;
  const perWeekNeeded = addThisWeek;



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

        {/* Main Revenue Display - HUGE */}
        <div className="mb-16 text-center">
          <div className="text-[120px] md:text-[180px] font-bold leading-none tracking-tight">
            ${totalRevenue.toLocaleString()}
          </div>
          <div className="text-zinc-500 text-2xl mt-4">
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
                  domain={[0, 'dataMax']}
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
                  type="linear"
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
          {/* This Week's Goal - even split across calendar weeks */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className="text-3xl font-bold text-yellow-500">
              {addThisWeek > 0 ? `+$${addThisWeek.toLocaleString()}` : '—'}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Add {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
            </div>
          </div>

          {/* Target Revenue */}
          <div
            className="bg-zinc-900 rounded-xl p-6 cursor-pointer hover:bg-zinc-800 transition-colors"
            onClick={() => setEditingTarget(true)}
          >
            {editingTarget ? (
              <input
                type="number"
                autoFocus
                defaultValue={settings.targetRevenue}
                className="text-3xl font-bold bg-transparent w-full outline-none"
                onBlur={(e) => {
                  handleUpdateSettings({ targetRevenue: parseFloat(e.target.value) || 0 });
                  setEditingTarget(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateSettings({ targetRevenue: parseFloat(e.currentTarget.value) || 0 });
                    setEditingTarget(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="text-3xl font-bold">
                ${settings.targetRevenue.toLocaleString()}
              </div>
            )}
            <div className="text-zinc-500 text-sm mt-1">
              Target
            </div>
          </div>

          {/* Revenue Needed Per Week */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className="text-3xl font-bold text-green-500">
              {perWeekNeeded > 0 ? `$${Math.round(perWeekNeeded).toLocaleString()}` : '—'}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Needed Per Week
            </div>
          </div>

          {/* Countdown to Demo */}
          <div
            className="bg-zinc-900 rounded-xl p-6 cursor-pointer hover:bg-zinc-800 transition-colors"
            onClick={() => setEditingDemo(true)}
          >
            {editingDemo ? (
              <input
                type="text"
                autoFocus
                placeholder="YYYY-MM-DD"
                defaultValue={settings.demoDay}
                className="text-xl font-bold bg-transparent w-full outline-none"
                onBlur={(e) => {
                  handleUpdateSettings({ demoDay: e.target.value });
                  setEditingDemo(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateSettings({ demoDay: e.currentTarget.value });
                    setEditingDemo(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {settings.demoDay ? (
                  <span>
                    {countdown.days}<span className="text-zinc-500 text-lg">d </span>
                    {String(countdown.hours).padStart(2, '0')}<span className="text-zinc-500 text-lg">h </span>
                    {String(countdown.minutes).padStart(2, '0')}<span className="text-zinc-500 text-lg">m </span>
                    {String(countdown.seconds).padStart(2, '0')}<span className="text-zinc-500 text-lg">s</span>
                  </span>
                ) : 'Set date'}
              </div>
            )}
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
