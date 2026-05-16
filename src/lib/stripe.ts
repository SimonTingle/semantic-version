import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return cached;
}

export type Plan = 'monthly' | 'yearly';

export function priceFor(plan: Plan): string {
  if (plan === 'yearly') return process.env.STRIPE_YEARLY_PRICE_ID!;
  return process.env.STRIPE_PRICE_ID!;
}
