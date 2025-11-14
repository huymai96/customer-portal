import { NextResponse } from 'next/server';
import { loadConfig } from '@/integrations/ssactivewear/config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const style = searchParams.get('style') || '5000';
    
    const config = loadConfig();
    const url = `${config.restBaseUrl}/products?style=${style}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountNumber}:${config.apiKey}`).toString('base64')}`,
      },
      cache: 'no-store',
    });
    
    const text = await response.text();
    
    return NextResponse.json({
      url,
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      bodyPreview: text.substring(0, 500),
      bodyLength: text.length,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

