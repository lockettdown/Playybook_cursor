import type { Session } from "@supabase/supabase-js";

type Plan = "monthly" | "yearly";
type CheckoutSource = "settings" | "signup";

function getAuthHeaders(session: Session | null): HeadersInit {
  if (!session?.access_token) {
    throw new Error("You must be signed in to manage billing.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function startCheckout(
  session: Session | null,
  plan: Plan,
  source: CheckoutSource = "settings"
): Promise<string> {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: getAuthHeaders(session),
    body: JSON.stringify({ plan, source }),
  });

  const payload = (await response.json()) as { checkoutUrl?: string; error?: string };
  if (!response.ok || !payload.checkoutUrl) {
    throw new Error(payload.error ?? "Unable to start Stripe checkout.");
  }
  return payload.checkoutUrl;
}

export async function createBillingPortalLink(session: Session | null): Promise<string> {
  const response = await fetch("/api/stripe/portal", {
    method: "POST",
    headers: getAuthHeaders(session),
  });

  const payload = (await response.json()) as { portalUrl?: string; error?: string };
  if (!response.ok || !payload.portalUrl) {
    throw new Error(payload.error ?? "Unable to open billing portal.");
  }
  return payload.portalUrl;
}
