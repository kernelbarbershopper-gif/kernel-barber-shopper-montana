// Stripe client wrapper
// Uses the secret key from environment variables. The secret key should be set in .env as STRIPE_SECRET_KEY
// NOTE: This file is imported by /api/create-checkout.ts. It only works in Node
// contexts (Vercel serverless). If imported in the client bundle it will fail
// at build time because process.env.STRIPE_SECRET_KEY is not available.

import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';

if (!stripeSecret) {
  // eslint-disable-next-line no-console
  console.warn('STRIPE_SECRET_KEY not set – Stripe client will not work');
}

export const stripe = new Stripe(stripeSecret, {
  apiVersion: '2025-02-24.acacia',
});

