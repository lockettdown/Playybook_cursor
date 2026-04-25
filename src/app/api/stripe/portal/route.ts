import { NextResponse } from "next/server";
import { getAuthenticatedBillingActor } from "@/lib/billing-server";
import { getStripeConfig, getStripeServer } from "@/lib/stripe-server";

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedBillingActor(request.headers.get("authorization"));
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!actor.stripeCustomerId) {
      return NextResponse.json({ error: "No billing profile found for this account." }, { status: 400 });
    }

    const stripe = getStripeServer();
    const { appUrl } = getStripeConfig();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: actor.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ portalUrl: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
