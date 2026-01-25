import { put, head } from '@vercel/blob';
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
    // Try to get existing blob
    const blobInfo = await head(BLOB_NAME).catch(() => null);

    if (blobInfo?.url) {
      const response = await fetch(blobInfo.url);
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

    const blob = await put(BLOB_NAME, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Error saving data:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
