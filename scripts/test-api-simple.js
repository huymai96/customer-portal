/**
 * Simple API Test Script
 * Tests Promos Ink API integration without module caching issues
 * 
 * Run: node scripts/test-api-simple.js
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// HMAC signature generation
function generateHmacSignature(timestamp, method, path, body, secret) {
  const payload = `${timestamp}${method.toUpperCase()}${path}${body}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Test credentials
function verifyCredentials() {
  console.log('\n🔐 Verifying API Credentials...\n');
  
  const creds = {
    'NEXT_PUBLIC_API_BASE_URL': process.env.NEXT_PUBLIC_API_BASE_URL,
    'PORTAL_API_KEY': process.env.PORTAL_API_KEY,
    'PORTAL_API_SECRET': process.env.PORTAL_API_SECRET,
    'PORTAL_CUSTOMER_ID': process.env.PORTAL_CUSTOMER_ID,
    'PORTAL_PARTNER_CODE': process.env.PORTAL_PARTNER_CODE,
  };
  
  const missing = [];
  
  for (const [key, value] of Object.entries(creds)) {
    if (!value) {
      missing.push(key);
      console.log(`❌ ${key}: MISSING`);
    } else {
      const masked = key.includes('SECRET') ? value.substring(0, 10) + '...' : value;
      console.log(`✅ ${key}: ${masked}`);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing: ${missing.join(', ')}`);
  }
  
  console.log('\n✅ All credentials loaded!\n');
  return creds;
}

// Test HMAC
function testHmac(creds) {
  console.log('🔒 Testing HMAC Signature...\n');
  
  const timestamp = Date.now();
  const method = 'POST';
  const path = '/api/orders';
  const body = JSON.stringify({ test: 'data' });
  
  const signature = generateHmacSignature(timestamp, method, path, body, creds.PORTAL_API_SECRET);
  
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Signature: ${signature.substring(0, 20)}...`);
  console.log('\n✅ HMAC generated!\n');
  
  return { timestamp, signature };
}

// Test order submission
async function testOrderSubmission(creds) {
  console.log('📦 Testing Order Submission...\n');
  
  const externalOrderId = `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  const testOrder = {
    partnerCode: creds.PORTAL_PARTNER_CODE,
    externalOrderId,
    customerInfo: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '555-1234',
      company: 'Test Company',
    },
    shippingAddress: {
      name: 'Test Customer',
      company: 'Test Company',
      street1: '123 Test Street',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90210',
      country: 'US',
      phone: '555-1234',
    },
    items: [{
      styleNumber: 'PC54',
      productName: 'Port & Company PC54 Core Cotton Tee',
      supplierPartId: 'PC54',
      canonicalStyleId: 'test-id',
      color: '001',
      colorName: 'White',
      size: 'M',
      quantity: 24,
      unitPrice: 3.50,
      decorations: [{
        method: 'screen_print',
        location: 'front_chest',
        description: '2-color test logo',
        colors: 2,
        width: 12,
        height: 12,
        setupFee: 0.00,
        unitCost: 5.80,
      }],
    }],
    shipping: {
      method: 'ground',
      cost: 25.00,
    },
    pricing: {
      subtotal: 84.00,
      decorationTotal: 139.20,
      setupFees: 0.00,
      shipping: 25.00,
      tax: 24.82,
      total: 273.02,
    },
    notes: 'TEST ORDER - Please ignore',
  };
  
  const timestamp = Date.now();
  const method = 'POST';
  const path = '/api/orders';
  const body = JSON.stringify(testOrder);
  
  const signature = generateHmacSignature(timestamp, method, path, body, creds.PORTAL_API_SECRET);
  
  const url = `${creds.NEXT_PUBLIC_API_BASE_URL}${path}`;
  
  console.log(`URL: ${url}`);
  console.log(`External Order ID: ${externalOrderId}`);
  console.log(`Total: $${testOrder.pricing.total}`);
  console.log('\nSubmitting...\n');
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': creds.PORTAL_API_KEY,
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signature,
        'X-Customer-ID': creds.PORTAL_CUSTOMER_ID,
        'X-Partner-Code': creds.PORTAL_PARTNER_CODE,
      },
      body,
    });
    
    const responseText = await response.text();
    let result;
    
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { rawResponse: responseText };
    }
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Order submitted successfully!\n');
      return result;
    } else {
      console.log('\n❌ Order submission failed!\n');
      throw new Error(`API returned ${response.status}: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.error('\n❌ Request failed:');
    console.error(error.message);
    throw error;
  }
}

// Main
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PROMOS INK API INTEGRATION TEST');
  console.log('='.repeat(60));
  
  try {
    const creds = verifyCredentials();
    testHmac(creds);
    await testOrderSubmission(creds);
    
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60) + '\n');
    
    console.log('🎉 Integration working!\n');
    console.log('Next steps:');
    console.log('1. Check dashboard: https://api.promosinkwall-e.com/dashboard');
    console.log('2. Test from UI: http://localhost:3000/cart');
    console.log('3. Submit real orders\n');
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TESTS FAILED');
    console.log('='.repeat(60) + '\n');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();





