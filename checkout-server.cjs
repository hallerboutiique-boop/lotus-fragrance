'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const commerce = require('./commerce-core.js');

const MAX_BODY = 32 * 1024;
const MAX_CART_LINES = 20;
const SINGLE_CENTS = 1490;
const MYSTERY_CENTS = 4990;
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://lotusfragrance.shop';
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8')).products;

function json(res, status, body, origin = SITE_ORIGIN) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': origin,
    'vary': 'Origin',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY) {
        reject(Object.assign(new Error('Richiesta troppo grande'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(Object.assign(new Error('Richiesta non valida'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function priceCart(items) {
  if (!Array.isArray(items) || !items.length || items.length > MAX_CART_LINES) {
    throw Object.assign(new Error('Carrello non valido'), { status: 400 });
  }
  let regularCount = 0;
  let mysteryCount = 0;
  const selected = [];
  for (const line of items) {
    if (line?.offerId === 'mystery') {
      const valid = commerce.validateLine(line, catalog);
      if (!valid.ok) throw Object.assign(new Error(valid.error), { status: 400 });
      const ids = commerce.resolveMystery(line.gender, catalog, max => crypto.randomInt(max));
      selected.push({ offerId: 'mystery', gender: line.gender, products: ids.map(id => catalog.find(p => p.id === id)) });
      mysteryCount += 1;
      continue;
    }
    if (line?.offerId === 'standard') {
      if (!Array.isArray(line.fragranceIds) || line.fragranceIds.length !== 1) throw Object.assign(new Error('Confezione normale non valida'), { status: 400 });
      const product = catalog.find(p => p.id === line.fragranceIds[0]);
      if (!product || product.availability !== 'available' || !Number.isFinite(product.price) || product.price <= 0) throw Object.assign(new Error('Confezione normale non disponibile'), { status: 400 });
      const priceCents = Math.round(product.price * 100);
      if (!Number.isSafeInteger(priceCents)) throw Object.assign(new Error('Prezzo non valido'), { status: 400 });
      regularCount += 0;
      selected.push({ offerId: 'standard', products: [product], priceCents });
      continue;
    }
    const valid = commerce.validateBundle(line?.offerId, line?.fragranceIds, catalog);
    if (!valid.ok) throw Object.assign(new Error(valid.error), { status: 400 });
    regularCount += valid.selected.length;
    selected.push({ offerId: line.offerId, products: valid.selected });
  }
  const trisCount = Math.floor(regularCount / 3);
  const standardCents = selected.filter(group => group.offerId === 'standard').reduce((sum, group) => sum + group.priceCents, 0);
  const totalCents = regularCount * SINGLE_CENTS - trisCount * (3 * SINGLE_CENTS - 3290) + mysteryCount * MYSTERY_CENTS + standardCents;
  if (!Number.isSafeInteger(totalCents) || totalCents < 1) throw Object.assign(new Error('Totale non valido'), { status: 400 });
  const summary = selected.map(group => {
    const names = group.products.map(p => p.name).join(', ');
    return group.offerId === 'mystery' ? `Mystery ${group.gender}: ${names}` : names;
  }).join(' · ');
  return { totalCents, summary: summary.slice(0, 4500), regularCount, trisCount, mysteryCount };
}

async function createSession({ items, stripeKey, requestId, stripeFetch = fetch }) {
  if (!stripeKey || !/^sk_(test|live)_/.test(stripeKey)) throw Object.assign(new Error('Stripe non configurato'), { status: 503 });
  const quote = priceCart(items);
  const fields = new URLSearchParams();
  fields.set('mode', 'payment');
  fields.set('locale', 'auto');
  fields.set('success_url', `${SITE_ORIGIN}/order-confirmation.html?session_id={CHECKOUT_SESSION_ID}`);
  fields.set('cancel_url', `${SITE_ORIGIN}/index.html?lang=it#carrello`);
  fields.set('shipping_address_collection[allowed_countries][0]', 'IT');
  fields.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
  fields.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', '0');
  fields.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'eur');
  fields.set('shipping_options[0][shipping_rate_data][display_name]', 'Spedizione inclusa');
  fields.set('line_items[0][quantity]', '1');
  fields.set('line_items[0][price_data][currency]', 'eur');
  fields.set('line_items[0][price_data][unit_amount]', String(quote.totalCents));
  fields.set('line_items[0][price_data][product_data][name]', 'Selezione Lotus Fragrance · profumi da 10 ml');
  fields.set('line_items[0][price_data][product_data][description]', quote.summary);
  fields.set('metadata[regular_count]', String(quote.regularCount));
  fields.set('metadata[tris_count]', String(quote.trisCount));
  fields.set('metadata[mystery_count]', String(quote.mysteryCount));
  const response = await stripeFetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${stripeKey}`,
      'content-type': 'application/x-www-form-urlencoded',
      'idempotency-key': requestId
    },
    body: fields
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.url !== 'string' || !result.url.startsWith('https://checkout.stripe.com/')) {
    console.error('Stripe checkout request rejected', {
      status: response.status,
      errorType: result?.error?.type || 'unknown',
      errorCode: result?.error?.code || 'unknown',
      errorParam: result?.error?.param || 'unknown',
      stripeRequestId: response.headers.get('request-id') || 'unknown'
    });
    throw Object.assign(new Error('Stripe non ha creato la sessione di pagamento'), { status: 502 });
  }
  return { url: result.url };
}

function createServer({ env = process.env, stripeFetch = fetch } = {}) {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (req.method === 'OPTIONS') {
      if (origin !== SITE_ORIGIN) return json(res, 403, { error: 'Origine non consentita' });
      res.writeHead(204, {
        'access-control-allow-origin': SITE_ORIGIN,
        'access-control-allow-methods': 'POST, GET, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Idempotency-Key',
        'access-control-max-age': '600',
        'vary': 'Origin'
      });
      return res.end();
    }
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/healthz') return json(res, 200, { ok: true });
    if (origin && origin !== SITE_ORIGIN) return json(res, 403, { error: 'Origine non consentita' });
    if (req.method !== 'POST' || url.pathname !== '/checkout') return json(res, 404, { error: 'Non trovato' });
    if (env.CHECKOUT_ENABLED !== 'true') return json(res, 503, { error: 'Pagamento temporaneamente non disponibile' });
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return json(res, 415, { error: 'Formato non supportato' });
    try {
      const requestId = String(req.headers['idempotency-key'] || '');
      if (!/^[a-zA-Z0-9_-]{12,80}$/.test(requestId)) throw Object.assign(new Error('Richiesta non valida'), { status: 400 });
      const body = await parseBody(req);
      const result = await createSession({ items: body.items, stripeKey: env.STRIPE_SECRET_KEY, requestId, stripeFetch });
      return json(res, 200, result);
    } catch (error) {
      return json(res, error.status || 500, { error: error.status ? error.message : 'Errore temporaneo del pagamento' });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  createServer().listen(port, '0.0.0.0', () => console.log(`Lotus checkout API listening on ${port}`));
}

module.exports = { createServer, priceCart, createSession };
