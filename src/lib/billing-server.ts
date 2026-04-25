import type Stripe from "stripe";
import { getSupabaseServerWithAnon, getSupabaseServerWithServiceRole } from "@/lib/supabase-server";

export type BillingPlan = "monthly" | "yearly";

export interface AuthenticatedBillingActor {
  userId: string;
  email: string;
  memberId: string;
  stripeCustomerId: string | null;
}

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim() || null;
}

export async function getAuthenticatedBillingActor(
  authHeader: string | null
): Promise<AuthenticatedBillingActor | null> {
  const token = getBearerToken(authHeader);
  if (!token) {
    return null;
  }

  const anonClient = getSupabaseServerWithAnon();
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !userData.user) {
    return null;
  }

  const serviceClient = getSupabaseServerWithServiceRole();
  const { data: memberData, error: memberError } = await serviceClient
    .from("app_members")
    .select("id, stripe_customer_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (memberError || !memberData) {
    return null;
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? "",
    memberId: memberData.id as string,
    stripeCustomerId: (memberData.stripe_customer_id as string | null) ?? null,
  };
}

export function getPlanIntervalFromPrice(price: Stripe.Price | null): "month" | "year" | null {
  const interval = price?.recurring?.interval;
  if (interval === "month") return "month";
  if (interval === "year") return "year";
  return null;
}

export async function upsertBillingFieldsForMember(input: {
  memberId?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  planInterval?: "month" | "year" | null;
}) {
  const serviceClient = getSupabaseServerWithServiceRole();
  const payload = {
    stripe_customer_id: input.stripeCustomerId ?? null,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    subscription_status: input.subscriptionStatus ?? null,
    current_period_end: input.currentPeriodEnd ?? null,
    plan_interval: input.planInterval ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.memberId) {
    const { error } = await serviceClient.from("app_members").update(payload).eq("id", input.memberId);
    if (error) throw error;
    return;
  }

  if (input.stripeCustomerId) {
    const { error } = await serviceClient
      .from("app_members")
      .update(payload)
      .eq("stripe_customer_id", input.stripeCustomerId);
    if (error) throw error;
  }
}
