export interface RevenueEntry {
  id: string;
  amount: number;
  date: string; // ISO date string
  note?: string;
}

export interface Settings {
  targetRevenue: number;
  demoDay: string; // ISO date string
}
