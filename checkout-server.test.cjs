'use strict';

const assert = require('node:assert/strict');
const { createServer, priceCart, createSession } = require('./checkout-server.cjs');

const three = [{ offerId: 'singolo', fragranceIds: ['asad'] }, { offerId: 'singolo', fragranceIds: ['9pm'] }, { offerId: 'singolo', fragranceIds: ['oud-glory'] }];

async function main() {
  assert.equal(priceCart(three).totalCents, 3290);
  assert.equal(priceCart([{ offerId: 'singolo', fragranceIds: ['asad'] }]).totalCents, 1490);
  assert.equal(priceCart([{ offerId: 'mystery', gender: 'women' }]).totalCents, 4990);
  assert.throws(() => priceCart([{ offerId: 'singolo', fragranceIds: ['not-a-product'] }]));
  assert.throws(() => priceCart([{ offerId: 'standard', fragranceIds: ['asad'] }]), /non disponibile/);
  assert.throws(() => priceCart([{ offerId: 'mystery', gender: 'invalid' }]));

  let request;
  const session = await createSession({
    items: three,
    stripeKey: 'sk_test_unit_test',
    requestId: 'request-idempotency-123',
    stripeFetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_example' }) };
    }
  });
  assert.equal(session.url, 'https://checkout.stripe.com/c/pay/cs_test_example');
  assert.equal(request.url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.equal(request.options.headers['idempotency-key'], 'request-idempotency-123');
  const fields = new URLSearchParams(request.options.body);
  assert.equal(fields.get('line_items[0][price_data][unit_amount]'), '3290');
  assert.equal(fields.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '0');
  assert.equal(fields.get('shipping_address_collection[allowed_countries][0]'), 'IT');
  assert.equal(fields.has('payment_method_types[0]'), false);

  const server = createServer({ env: { CHECKOUT_ENABLED: 'false' } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${address}/healthz`);
    assert.equal(health.status, 200);
    const disabled = await fetch(`${address}/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://lotusfragrance.shop' },
      body: JSON.stringify({ items: three })
    });
    assert.equal(disabled.status, 503);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  console.log('Checkout backend tests passed');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
