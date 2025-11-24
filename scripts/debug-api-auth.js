/**
 * Debug API Authentication
 * Shows exactly what we're sending to help troubleshoot
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

console.log('\n🔍 API Authentication Debug\n');
console.log('='.repeat(60));

// Show credentials (masked)
console.log('\n📋 Credentials:');
console.log(`API Base URL: ${process.env.NEXT_PUBLIC_API_BASE_URL}`);
console.log(`API Key: ${process.env.PORTAL_API_KEY?.substring(0, 15)}...`);
console.log(`API Secret: ${process.env.PORTAL_API_SECRET?.substring(0, 15)}...`);
console.log(`Customer ID: ${process.env.PORTAL_CUSTOMER_ID}`);
console.log(`Partner Code: ${process.env.PORTAL_PARTNER_CODE}`);

// Generate timestamp
const timestamp = Date.now();
console.log(`\n⏰ Timestamp: ${timestamp}`);
console.log(`   Length: ${timestamp.toString().length} digits (should be 13)`);

// Prepare request
const method = 'POST';
const path = '/api/orders';
const body = JSON.stringify({
  poNumber: 'TEST-001',
  customerName: 'Test Customer',
  items: []
});

console.log(`\n📤 Request Details:`);
console.log(`   Method: ${method}`);
console.log(`   Path: ${path}`);
console.log(`   Body: ${body}`);

// Build payload for signature
const payload = `${timestamp}${method}${path}${body}`;
console.log(`\n🔐 HMAC Payload:`);
console.log(`   Format: timestamp + method + path + body`);
console.log(`   Length: ${payload.length} characters`);
console.log(`   First 100 chars: ${payload.substring(0, 100)}...`);

// Generate signature
const signature = crypto
  .createHmac('sha256', process.env.PORTAL_API_SECRET)
  .update(payload)
  .digest('hex');

console.log(`\n🔑 HMAC Signature:`);
console.log(`   Algorithm: HMAC-SHA256`);
console.log(`   Output: hex`);
console.log(`   Signature: ${signature}`);
console.log(`   Length: ${signature.length} characters (should be 64)`);

// Show headers
console.log(`\n📨 Request Headers:`);
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': process.env.PORTAL_API_KEY,
  'X-Customer-ID': process.env.PORTAL_CUSTOMER_ID,
  'X-Timestamp': timestamp.toString(),
  'X-Signature': signature,
};

for (const [key, value] of Object.entries(headers)) {
  const displayValue = key.includes('Key') || key.includes('Signature')
    ? value.substring(0, 20) + '...'
    : value;
  console.log(`   ${key}: ${displayValue}`);
}

// Make request
console.log(`\n🚀 Making Request...\n`);
console.log('='.repeat(60));

async function testRequest() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
      method,
      headers,
      body,
    });

    console.log(`\n📥 Response:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`);
    response.headers.forEach((value, key) => {
      console.log(`      ${key}: ${value}`);
    });

    const responseText = await response.text();
    console.log(`\n   Body:`);
    try {
      const json = JSON.parse(responseText);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(responseText);
    }

    if (response.ok) {
      console.log('\n✅ SUCCESS! Authentication working!');
    } else {
      console.log('\n❌ FAILED! Authentication not working.');
      console.log('\n🔍 Debugging Checklist:');
      console.log('   1. Is HMAC middleware deployed to production?');
      console.log('   2. Are credentials correct in database?');
      console.log('   3. Is timestamp validation allowing our timestamp?');
      console.log('   4. Is signature calculation matching server-side?');
      console.log('   5. Are headers being read correctly?');
    }

  } catch (error) {
    console.error('\n❌ Request Error:');
    console.error(error.message);
  }

  console.log('\n' + '='.repeat(60));
}

testRequest();

