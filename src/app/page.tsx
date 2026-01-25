'use client';

import { useEffect, useState, useCallback } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { differenceInDays, differenceInSeconds, format, parseISO } from 'date-fns';
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

  // Calculate required weekly growth rate and this week's target
  const weeksLeft = (daysUntilDemo || 0) / 7;

  // Required weekly growth rate to hit target: r = (target/current)^(1/weeks) - 1
  const requiredGrowthRate = (() => {
    if (!settings.demoDay || totalRevenue <= 0 || totalRevenue >= settings.targetRevenue) return 0;
    if (weeksLeft <= 0) return 0;
    return (Math.pow(settings.targetRevenue / totalRevenue, 1 / weeksLeft) - 1) * 100;
  })();

  // This week's MRR goal = current * (1 + growth rate)
  const thisWeekGoal = (() => {
    if (!settings.demoDay || totalRevenue <= 0 || totalRevenue >= settings.targetRevenue) return totalRevenue;
    if (weeksLeft <= 0) return settings.targetRevenue;
    const rate = requiredGrowthRate / 100;
    return totalRevenue * (1 + rate);
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
          {/* This Week's Goal */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className="text-3xl font-bold text-yellow-500">
              ${thisWeekGoal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              This Week&apos;s Goal
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

          {/* Required Growth Rate */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className="text-3xl font-bold text-green-500">
              {requiredGrowthRate > 0 ? `${requiredGrowthRate.toFixed(1)}%` : '—'}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Weekly Growth Needed
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
