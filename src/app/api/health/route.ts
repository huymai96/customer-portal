import { NextResponse } from 'next/server';

export async function GET() {
  const timestamp = new Date().toISOString();
  console.log('[health] GET', timestamp);
  return NextResponse.json({
    ok: true,
    message: 'health ok',
    timestamp,
  });
}

