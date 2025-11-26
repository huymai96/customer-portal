/**
 * API Health Check
 * Tests if the Promos Ink API is responding
 */

require('dotenv').config({ path: '.env.local' });

async function checkAPI() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  console.log('\n🔍 Checking API Health...\n');
  console.log(`Base URL: ${baseUrl}\n`);
  
  const endpoints = [
    '/',
    '/api',
    '/api/orders',
    '/api/v1/products',
    '/health',
    '/api-reference',
  ];
  
  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Customer-Portal-Test/1.0',
        },
      });
      
      const contentType = response.headers.get('content-type');
      let body = '';
      
      if (contentType?.includes('application/json')) {
        body = JSON.stringify(await response.json(), null, 2);
      } else {
        body = await response.text();
        if (body.length > 200) body = body.substring(0, 200) + '...';
      }
      
      console.log(`${endpoint}`);
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${contentType}`);
      if (body) console.log(`  Body: ${body.substring(0, 100)}...`);
      console.log('');
      
    } catch (error) {
      console.log(`${endpoint}`);
      console.log(`  Error: ${error.message}`);
      console.log('');
    }
  }
}

checkAPI();





