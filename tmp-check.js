import crypto from 'node:crypto';

const base = process.env.NEXT_PUBLIC_API_BASE_URL;
const key = process.env.PORTAL_API_KEY;
const secret = process.env.PORTAL_API_SECRET;
const mode = process.argv[2] ?? 'search';
const value = process.argv[3] ?? 'PC43';

if (!base || !key || !secret) {
  console.error('missing env');
  process.exit(1);
}

const baseUrl = base.startsWith('http') ? base : 'https://' + base;
const url = new URL('/api/v1/products', baseUrl);
url.searchParams.set(mode, value);
url.searchParams.set('limit', '5');

const timestamp = Date.now().toString();
const signature = crypto.createHmac('sha256', secret).update(timestamp + 'GET' + url.pathname).digest('hex');

const res = await fetch(url, {
  headers: {
    'x-api-key': key,
    'x-timestamp': timestamp,
    'x-signature': signature,
    'accept': 'application/json',
  },
});

console.log('mode', mode, 'value', value, 'status', res.status);
const text = await res.text();
console.log(text.slice(0, 400));
