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
    const response = await fetch(`/api/data?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch {
    return defaultData;
  }
}

// Save all data to the server and return success
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

// Helper to add an entry - returns optimistic data immediately
export async function addEntry(entry: Omit<RevenueEntry, 'id'>): Promise<AppData> {
  const data = await fetchData();
  const newEntry = { ...entry, id: crypto.randomUUID() };
  data.entries.push(newEntry);
  const success = await saveData(data);
  if (!success) {
    // Revert on failure
    data.entries.pop();
  }
  return data; // Return what we have locally
}

// Helper to delete an entry - returns optimistic data immediately
export async function deleteEntry(id: string): Promise<AppData> {
  const data = await fetchData();
  const originalEntries = [...data.entries];
  data.entries = data.entries.filter(e => e.id !== id);
  const success = await saveData(data);
  if (!success) {
    // Revert on failure
    data.entries = originalEntries;
  }
  return data; // Return what we have locally
}

// Helper to update settings - returns optimistic data immediately
export async function updateSettings(settings: Partial<Settings>): Promise<AppData> {
  const data = await fetchData();
  const originalSettings = { ...data.settings };
  data.settings = { ...data.settings, ...settings };
  const success = await saveData(data);
  if (!success) {
    // Revert on failure
    data.settings = originalSettings;
  }
  return data; // Return what we have locally
}
