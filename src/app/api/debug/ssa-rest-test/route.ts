import { NextResponse } from 'next/server';
import { loadConfig, toStyleNumber } from '@/integrations/ssactivewear/config';

export async function GET() {
  try {
    const config = loadConfig();
    const styleNumber = toStyleNumber('B00060');
    
    // Test different URL patterns
    const tests = [
      { url: `${config.restBaseUrl}/products?style=${styleNumber}`, label: 'products with style param' },
      { url: `${config.restBaseUrl}/products/${styleNumber}`, label: 'products with path param' },
      { url: `${config.restBaseUrl}/styles?style=${styleNumber}`, label: 'styles with style param' },
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        const response = await fetch(test.url, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.accountNumber}:${config.apiKey}`).toString('base64')}`,
          },
        });
        
        results.push({
          test: test.label,
          url: test.url,
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
          preview: response.ok ? (await response.text()).substring(0, 200) : await response.text().then(t => t.substring(0, 200)),
        });
      } catch (error) {
        results.push({
          test: test.label,
          url: test.url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    return NextResponse.json({
      styleNumber,
      config: {
        restBaseUrl: config.restBaseUrl,
        accountNumber: config.accountNumber,
        apiKeyLength: config.apiKey.length,
      },
      results,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

