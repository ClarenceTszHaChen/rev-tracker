import { RevenueEntry, Settings } from './types';

interface AppData {
  entries: RevenueEntry[];
  settings: Settings;
}

const defaultData: AppData = {
  entries: [],
  settings: {
    targetRevenue: 25000,
    demoDay: '',
  },
};

// Fetch all data from the server
export async function fetchData(): Promise<AppData> {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch {
    return defaultData;
  }
}

// Save all data to the server
export async function saveData(data: AppData): Promise<boolean> {
  try {
    const response = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Helper to add an entry
export async function addEntry(entry: Omit<RevenueEntry, 'id'>): Promise<AppData> {
  const data = await fetchData();
  const newEntry = { ...entry, id: crypto.randomUUID() };
  data.entries.push(newEntry);
  await saveData(data);
  return data;
}

// Helper to delete an entry
export async function deleteEntry(id: string): Promise<AppData> {
  const data = await fetchData();
  data.entries = data.entries.filter(e => e.id !== id);
  await saveData(data);
  return data;
}

// Helper to update settings
export async function updateSettings(settings: Partial<Settings>): Promise<AppData> {
  const data = await fetchData();
  data.settings = { ...data.settings, ...settings };
  await saveData(data);
  return data;
}
