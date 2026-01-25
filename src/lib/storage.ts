import { RevenueEntry, Settings } from './types';

const REVENUE_KEY = 'rev-tracker-entries';
const SETTINGS_KEY = 'rev-tracker-settings';

export function getRevenueEntries(): RevenueEntry[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(REVENUE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveRevenueEntries(entries: RevenueEntry[]): void {
  localStorage.setItem(REVENUE_KEY, JSON.stringify(entries));
}

export function addRevenueEntry(entry: Omit<RevenueEntry, 'id'>): RevenueEntry {
  const entries = getRevenueEntries();
  const newEntry = { ...entry, id: crypto.randomUUID() };
  entries.push(newEntry);
  saveRevenueEntries(entries);
  return newEntry;
}

export function deleteRevenueEntry(id: string): void {
  const entries = getRevenueEntries().filter(e => e.id !== id);
  saveRevenueEntries(entries);
}

export function getSettings(): Settings {
  if (typeof window === 'undefined') {
    return { targetRevenue: 10000, demoDay: '' };
  }
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { targetRevenue: 10000, demoDay: '' };
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
