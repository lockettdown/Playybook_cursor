import { NextResponse } from "next/server";
import { getStripeConfig, getStripeServer } from "@/lib/stripe-server";
import { getAuthenticatedBillingActor, upsertBillingFieldsForMember, type BillingPlan } from "@/lib/billing-server";

function resolvePriceId(plan: BillingPlan): string {
  const { monthlyPriceId, yearlyPriceId } = getStripeConfig();
  return plan === "monthly" ? monthlyPriceId : yearlyPriceId;
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedBillingActor(request.headers.get("authorization"));
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { plan?: BillingPlan; source?: "settings" | "signup" };
    if (body.plan !== "monthly" && body.plan !== "yearly") {
      return NextResponse.json({ error: "Invalid plan selection" }, { status: 400 });
    }
    const source = body.source === "signup" ? "signup" : "settings";

    const stripe = getStripeServer();
    const { appUrl, trialDays } = getStripeConfig();

    let customerId = actor.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: actor.email || undefined,
        metadata: {
          user_id: actor.userId,
          member_id: actor.memberId,
        },
      });
      customerId = customer.id;
      await upsertBillingFieldsForMember({
        memberId: actor.memberId,
        stripeCustomerId: customer.id,
        authToken: actor.authToken,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: resolvePriceId(body.plan),
          quantity: 1,
        },
      ],
      success_url:
        source === "signup"
          ? `${appUrl}/?billing=success`
          : `${appUrl}/settings?billing=success`,
      cancel_url:
        source === "signup"
          ? `${appUrl}/subscribe?billing=cancel`
          : `${appUrl}/settings?billing=cancel`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          user_id: actor.userId,
          member_id: actor.memberId,
          selected_plan: body.plan,
        },
      },
      metadata: {
        user_id: actor.userId,
        member_id: actor.memberId,
        selected_plan: body.plan,
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
