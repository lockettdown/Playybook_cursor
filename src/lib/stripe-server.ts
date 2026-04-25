import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getStripeServer(): Stripe {
  const apiKey = requireEnv("STRIPE_SECRET_KEY");
  return new Stripe(apiKey);
}

export function getStripeConfig() {
  const monthlyPriceId = requireEnv("STRIPE_PRICE_MONTHLY_ID");
  const yearlyPriceId = requireEnv("STRIPE_PRICE_YEARLY_ID");
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const trialDaysRaw = process.env.STRIPE_TRIAL_DAYS ?? "14";
  const parsedTrialDays = Number.parseInt(trialDaysRaw, 10);
  const trialDays = Number.isFinite(parsedTrialDays) && parsedTrialDays >= 0 ? parsedTrialDays : 14;

  return {
    monthlyPriceId,
    yearlyPriceId,
    appUrl,
    trialDays,
  };
}
