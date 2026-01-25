import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// Get the blob URL base from the token
function getBlobUrlBase(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  // Token format: vercel_blob_rw_{storeId}_{rest}
  const match = token.match(/^vercel_blob_rw_([^_]+)_/);
  if (!match) return null;

  const storeId = match[1].toLowerCase();
  return `https://${storeId}.public.blob.vercel-storage.com`;
}

export async function GET() {
  try {
    const baseUrl = getBlobUrlBase();
    if (!baseUrl) {
      return NextResponse.json(defaultData);
    }

    // Fetch directly from the known URL with cache busting
    const response = await fetch(`${baseUrl}/${BLOB_NAME}?t=${Date.now()}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(defaultData);
    }

    const data = await response.json();
    return NextResponse.json({ ...data, _ts: Date.now() }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    });
  } catch {
    return NextResponse.json(defaultData, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const data: AppData = await request.json();

    const blob = await put(BLOB_NAME, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Error saving data:', error);
    return NextResponse.json({ error: 'Failed to save data', details: String(error) }, { status: 500 });
  }
}
