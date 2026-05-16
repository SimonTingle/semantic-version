import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return cached;
}

export const PRICE_ID = process.env.STRIPE_PRICE_ID!;
