import { put, list, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

const BLOB_NAME = 'rev-tracker-data.json';

interface AppData {
  entries: Array<{
    id: string;
    amount: number;
    date: string;
    note?: string;
  }>;
  settings: {
    targetRevenue: number;
    demoDay: string;
  };
}

const defaultData: AppData = {
  entries: [],
  settings: {
    targetRevenue: 25000,
    demoDay: '',
  },
};

export async function GET() {
  try {
    // List blobs to find our data file
    const { blobs } = await list({ prefix: BLOB_NAME });
    const blob = blobs.find(b => b.pathname === BLOB_NAME);

    if (blob?.url) {
      // Add cache-busting query param
      const response = await fetch(`${blob.url}?t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(defaultData);
  } catch {
    return NextResponse.json(defaultData);
  }
}

export async function PUT(request: Request) {
  try {
    const data: AppData = await request.json();

    // Just overwrite - addRandomSuffix: false allows this
    const blob = await put(BLOB_NAME, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Error saving data:', error);
    return NextResponse.json({ error: 'Failed to save data', details: String(error) }, { status: 500 });
  }
}
