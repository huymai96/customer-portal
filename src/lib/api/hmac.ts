/**
 * HMAC-SHA256 signature generation for API authentication
 * 
 * The signature is generated from:
 * timestamp + method + path + body
 * 
 * Example:
 * timestamp: 1732377600000
 * method: "POST"
 * path: "/api/orders"
 * body: '{"partnerCode":"PORTAL",...}'
 * secret: "sk_live_your_secret"
 */

import crypto from 'crypto';

export function generateHmacSignature(
  timestamp: number,
  method: string,
  path: string,
  body: string,
  secret: string
): string {
  // Signature = HMAC-SHA256(timestamp + method + path + body, secret)
  const payload = `${timestamp}${method.toUpperCase()}${path}${body}`;
  
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify an HMAC signature (for testing)
 */
export function verifyHmacSignature(
  timestamp: number,
  method: string,
  path: string,
  body: string,
  secret: string,
  signature: string
): boolean {
  const expectedSignature = generateHmacSignature(
    timestamp,
    method,
    path,
    body,
    secret
  );
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

