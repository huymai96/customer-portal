#!/usr/bin/env tsx
/**
 * Production verification script
 * Tests critical endpoints and product pages
 */

const PROD_URL = process.argv[2] || 'https://customer-portal-q3i8dv5ip-promos-ink.vercel.app';

interface TestResult {
  name: string;
  url: string;
  status: number;
  success: boolean;
  details?: string;
}

async function testEndpoint(name: string, url: string): Promise<TestResult> {
  try {
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000)
    });
    const status = response.status;
    const success = status >= 200 && status < 300;
    let details = '';
    
    if (success && response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      if (name.includes('search')) {
        details = `Found ${data.items?.length || 0} results`;
      } else if (name.includes('product')) {
        details = `Suppliers: ${data.suppliers?.length || 0}, Colors: ${data.suppliers?.[0]?.product?.colors?.length || 0}, Sizes: ${data.suppliers?.[0]?.product?.sizes?.length || 0}`;
      }
    }
    
    return { name, url, status, success, details };
  } catch (error) {
    return { 
      name, 
      url, 
      status: 0, 
      success: false, 
      details: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function main() {
  console.log(`\n🧪 Testing production: ${PROD_URL}\n`);
  
  const tests: Array<{ name: string; url: string }> = [
    { name: 'Health Check', url: `${PROD_URL}/api/health` },
    { name: 'Search PC43', url: `${PROD_URL}/api/products/search?query=PC43` },
    { name: 'Search 5000', url: `${PROD_URL}/api/products/search?query=5000` },
    { name: 'Search A230', url: `${PROD_URL}/api/products/search?query=A230` },
    { name: 'Search BC3001', url: `${PROD_URL}/api/products/search?query=BC3001` },
  ];
  
  // Get canonical IDs from search results
  const searchResults: TestResult[] = [];
  for (const test of tests.filter(t => t.name.includes('Search'))) {
    const result = await testEndpoint(test.name, test.url);
    searchResults.push(result);
    
    if (result.success) {
      try {
        const response = await fetch(test.url);
        const data = await response.json();
        if (data.items?.[0]?.canonicalStyleId) {
          const canonicalId = data.items[0].canonicalStyleId;
          tests.push({
            name: `Product Detail ${test.name.split(' ')[1]}`,
            url: `${PROD_URL}/api/products/${canonicalId}`
          });
          tests.push({
            name: `Product Page ${test.name.split(' ')[1]}`,
            url: `${PROD_URL}/product/${canonicalId}`
          });
        }
      } catch (e) {
        // Skip if we can't parse
      }
    }
  }
  
  // Run all tests
  const results: TestResult[] = [];
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url);
    results.push(result);
    console.log(`${result.success ? '✅' : '❌'} ${result.name}: ${result.status} ${result.details ? `(${result.details})` : ''}`);
    if (!result.success) {
      console.log(`   URL: ${result.url}`);
      if (result.details) console.log(`   Error: ${result.details}`);
    }
  }
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`\n📊 Summary: ${passed}/${total} tests passed\n`);
  
  if (passed < total) {
    process.exit(1);
  }
}

main().catch(console.error);



