# Stripe subscriptions setup

This app is wired for Stripe hosted subscriptions with:

- Monthly: `$4.99` (`499` cents)
- Yearly: `$50` (`5000` cents)
- Trial: controlled by `STRIPE_TRIAL_DAYS` (defaults to `7`)

## 1) Database update

Run this SQL in Supabase SQL editor:

- [`setup-billing.sql`](/Users/seandavid/Desktop/Desktop/Cursor/projects/playybook/setup-billing.sql)

## 2) Environment variables

Copy values into `.env.local` (or your deployment env):

- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY_ID`
- `STRIPE_PRICE_YEARLY_ID`
- `STRIPE_TRIAL_DAYS`
- `SUPABASE_SERVICE_ROLE_KEY`

See examples in:

- [`.env.example`](/Users/seandavid/Desktop/Desktop/Cursor/projects/playybook/.env.example)

## 3) Stripe dashboard configuration

1. Create one Product (for Playybook Pro or equivalent).
2. Create two recurring Prices on that product:
   - `$4.99` every month
   - `$50` every year
3. Copy those two price IDs into:
   - `STRIPE_PRICE_MONTHLY_ID`
   - `STRIPE_PRICE_YEARLY_ID`
4. Create webhook endpoint:
   - URL: `https://YOUR_DOMAIN/api/stripe/webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
5. Copy endpoint signing secret to `STRIPE_WEBHOOK_SECRET`.

## 4) Local webhook forwarding (optional)

Use Stripe CLI for local testing:

```bash
stripe login
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Then copy printed webhook secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## 5) End-to-end test checklist

- Subscribe with monthly plan from `Settings -> Billing`.
- Subscribe with yearly plan from `Settings -> Billing`.
- Confirm trial status appears on the member row (`subscription_status` / `plan_interval`).
- Open Customer Portal from `Settings -> Billing`.
- Cancel subscription in portal and verify webhook updates `subscription_status`.
- Simulate payment failure (test mode) and verify status updates.
