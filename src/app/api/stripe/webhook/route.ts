import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getPlanIntervalFromPrice, upsertBillingFieldsForMember } from "@/lib/billing-server";
import { getStripeServer } from "@/lib/stripe-server";

function unixSecondsToIso(value: number | null | undefined): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const firstItemPrice = subscription.items.data[0]?.price ?? null;
  const currentPeriodEnd =
    "current_period_end" in (subscription as unknown as Record<string, unknown>)
      ? ((subscription as unknown as Record<string, number>).current_period_end ?? null)
      : null;
  await upsertBillingFieldsForMember({
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: unixSecondsToIso(currentPeriodEnd),
    planInterval: getPlanIntervalFromPrice(firstItemPrice),
  });
}

async function handleInvoiceEvent(invoice: Stripe.Invoice) {
  const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;
  if (!stripeCustomerId) return;

  const invoiceRecord = invoice as unknown as Record<string, unknown>;
  const subscriptionId =
    typeof invoiceRecord.subscription === "string" ? invoiceRecord.subscription : null;
  const status = invoice.status === "paid" ? "active" : "past_due";

  await upsertBillingFieldsForMember({
    stripeCustomerId,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: status,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const memberId = session.metadata?.member_id;
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;

  if (!memberId) return;
  await upsertBillingFieldsForMember({
    memberId,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus: "trialing",
  });
}

export async function POST(request: Request) {
  const stripe = getStripeServer();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook configuration" }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        await handleInvoiceEvent(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
