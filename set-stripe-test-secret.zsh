#!/bin/zsh
set -eu

if ! command -v fly >/dev/null 2>&1; then
  print -u2 'Fly CLI non trovato. Installa/autentica Fly CLI e riprova.'
  exit 1
fi

read -rs 'STRIPE_TEST_KEY?Chiave Stripe TEST sk_test_ (input nascosto): '
print
if [[ "$STRIPE_TEST_KEY" != sk_test_* ]]; then
  unset STRIPE_TEST_KEY
  print -u2 'Rifiutato: serve una chiave di test che inizi con sk_test_.'
  exit 1
fi

print -r -- "STRIPE_SECRET_KEY=$STRIPE_TEST_KEY" | fly secrets import --app lotus-fragrance-checkout
unset STRIPE_TEST_KEY
print 'Secret di test inviato a Fly. I pagamenti restano disattivati.'
