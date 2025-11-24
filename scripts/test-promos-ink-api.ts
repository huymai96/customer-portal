/**
 * Test Script: Promos Ink API Integration
 * 
 * This script tests:
 * 1. HMAC signature generation
 * 2. API connection
 * 3. Order submission
 * 4. Order retrieval
 * 
 * Run: npx tsx scripts/test-promos-ink-api.ts
 */

import 'tsconfig-paths/register';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables FIRST before importing other modules
config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

// Now import modules that depend on environment variables
import { generateHmacSignature } from '../src/lib/api/hmac';
import { submitOrder, getOrderStatus, generateExternalOrderId } from '../src/lib/orders/service';

// Verify credentials are loaded
function verifyCredentials() {
  console.log('\n🔐 Verifying API Credentials...\n');
  
  const required = [
    'NEXT_PUBLIC_API_BASE_URL',
    'PORTAL_API_KEY',
    'PORTAL_API_SECRET',
    'PORTAL_CUSTOMER_ID',
    'PORTAL_PARTNER_CODE',
  ];
  
  const missing: string[] = [];
  
  required.forEach((key) => {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
      console.log(`❌ ${key}: MISSING`);
    } else {
      // Mask sensitive values
      const masked = key.includes('SECRET') 
        ? value.substring(0, 10) + '...' 
        : value;
      console.log(`✅ ${key}: ${masked}`);
    }
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('\n✅ All credentials loaded successfully!\n');
}

// Test HMAC signature generation
function testHmacSignature() {
  console.log('🔒 Testing HMAC Signature Generation...\n');
  
  const timestamp = Date.now();
  const method = 'POST';
  const path = '/api/orders';
  const body = JSON.stringify({ test: 'data' });
  const secret = process.env.PORTAL_API_SECRET!;
  
  const signature = generateHmacSignature(timestamp, method, path, body, secret);
  
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Method: ${method}`);
  console.log(`Path: ${path}`);
  console.log(`Body: ${body}`);
  console.log(`Signature: ${signature.substring(0, 20)}...`);
  console.log('\n✅ HMAC signature generated successfully!\n');
  
  return signature;
}

// Test order submission
async function testOrderSubmission() {
  console.log('📦 Testing Order Submission...\n');
  
  const externalOrderId = generateExternalOrderId('TEST');
  
  const testOrder = {
    partnerCode: process.env.PORTAL_PARTNER_CODE!,
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
      street2: 'Suite 100',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90210',
      country: 'US',
      phone: '555-1234',
    },
    items: [
      {
        styleNumber: 'PC54',
        productName: 'Port & Company PC54 Core Cotton Tee',
        supplierPartId: 'PC54',
        canonicalStyleId: 'test-canonical-id',
        color: '001',
        colorName: 'White',
        size: 'M',
        quantity: 24,
        unitPrice: 3.50,
        decorations: [
          {
            method: 'screen_print' as const,
            location: 'front_chest' as const,
            description: '2-color test logo',
            colors: 2,
            width: 12,
            height: 12,
            setupFee: 0.00,
            unitCost: 5.80,
          },
        ],
      },
    ],
    shipping: {
      method: 'ground',
      cost: 25.00,
      carrier: 'UPS',
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
    inHandsDate: '2024-12-15',
    poNumber: 'TEST-PO-12345',
  };
  
  console.log(`External Order ID: ${externalOrderId}`);
  console.log(`Order Total: $${testOrder.pricing.total}`);
  console.log(`Items: ${testOrder.items.length}`);
  console.log('\nSubmitting order...\n');
  
  try {
    const result = await submitOrder(testOrder);
    
    console.log('✅ Order submitted successfully!\n');
    console.log('Response:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Order submission failed:\n');
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(error);
    }
    throw error;
  }
}

// Test order retrieval
async function testOrderRetrieval(orderId: string) {
  console.log(`\n📋 Testing Order Retrieval (ID: ${orderId})...\n`);
  
  try {
    const result = await getOrderStatus(orderId);
    
    console.log('✅ Order retrieved successfully!\n');
    console.log('Response:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Order retrieval failed:\n');
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(error);
    }
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PROMOS INK API INTEGRATION TEST');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Verify credentials
    verifyCredentials();
    
    // Step 2: Test HMAC signature
    testHmacSignature();
    
    // Step 3: Test order submission
    console.log('⏳ Starting order submission test...\n');
    const orderResult = await testOrderSubmission();
    
    // Step 4: Test order retrieval (if we got an order ID)
    if (orderResult?.order?.id) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      await testOrderRetrieval(orderResult.order.id);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60) + '\n');
    
    console.log('🎉 Integration is working correctly!\n');
    console.log('Next steps:');
    console.log('1. Check the dashboard at https://api.promosinkwall-e.com/dashboard');
    console.log('2. Verify the test order appears');
    console.log('3. Test the checkout flow in your portal');
    console.log('4. Submit orders from the UI\n');
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TESTS FAILED');
    console.log('='.repeat(60) + '\n');
    
    console.error('Error details:', error);
    
    console.log('\n📞 Troubleshooting:');
    console.log('1. Verify credentials in .env.local');
    console.log('2. Check API endpoint URL');
    console.log('3. Verify HMAC signature generation');
    console.log('4. Check network connectivity');
    console.log('5. Review API documentation\n');
    
    process.exit(1);
  }
}

// Run tests
runTests();

