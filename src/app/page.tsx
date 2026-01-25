'use client';

import { useEffect, useState } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { differenceInDays, format, parseISO } from 'date-fns';
import { RevenueEntry, Settings } from '@/lib/types';
import { getRevenueEntries, getSettings } from '@/lib/storage';

export default function Home() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ targetRevenue: 10000, demoDay: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEntries(getRevenueEntries());
    setSettings(getSettings());
  }, []);

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

  // Calculate week-over-week growth rate
  const calculateGrowthRate = () => {
    if (sortedEntries.length < 2) return 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekRevenue = sortedEntries
      .filter(e => new Date(e.date) >= oneWeekAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    const lastWeekRevenue = sortedEntries
      .filter(e => new Date(e.date) >= twoWeeksAgo && new Date(e.date) < oneWeekAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    if (lastWeekRevenue === 0) return thisWeekRevenue > 0 ? 100 : 0;
    return ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;
  };

  const growthRate = calculateGrowthRate();

  // Days until demo day
  const daysUntilDemo = settings.demoDay
    ? differenceInDays(parseISO(settings.demoDay), new Date())
    : null;

  // Required weekly growth rate to hit target
  const calculateRequiredGrowth = () => {
    if (!settings.demoDay || totalRevenue >= settings.targetRevenue) return 0;
    if (totalRevenue === 0) return Infinity;

    const weeksLeft = (daysUntilDemo || 0) / 7;
    if (weeksLeft <= 0) return Infinity;

    // Formula: targetRevenue = currentRevenue * (1 + r)^weeks
    // Solving for r: r = (targetRevenue/currentRevenue)^(1/weeks) - 1
    const requiredMultiplier = settings.targetRevenue / totalRevenue;
    const weeklyGrowthRate = (Math.pow(requiredMultiplier, 1 / weeksLeft) - 1) * 100;
    return weeklyGrowthRate;
  };

  const requiredGrowth = calculateRequiredGrowth();

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
            Total Revenue
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
          {/* Current Growth Rate */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className={`text-3xl font-bold ${growthRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Weekly Growth
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

          {/* Required Growth */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className={`text-3xl font-bold ${requiredGrowth <= growthRate ? 'text-green-500' : 'text-yellow-500'}`}>
              {requiredGrowth === Infinity ? '—' : `${requiredGrowth.toFixed(1)}%`}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Required Weekly
            </div>
          </div>

          {/* Days Until Demo */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <div className="text-3xl font-bold">
              {daysUntilDemo !== null ? daysUntilDemo : '—'}
            </div>
            <div className="text-zinc-500 text-sm mt-1">
              Days to Demo
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
