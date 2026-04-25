"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { startCheckout } from "@/lib/billing-client";

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session, loading } = useAuth();
  const [billingLoadingPlan, setBillingLoadingPlan] = useState<"monthly" | "yearly" | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  async function handleCheckout(plan: "monthly" | "yearly") {
    try {
      setBillingError(null);
      setBillingLoadingPlan(plan);
      const checkoutUrl = await startCheckout(session, plan, "signup");
      window.location.assign(checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start checkout.";
      setBillingError(message);
    } finally {
      setBillingLoadingPlan(null);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
        <p className="text-pb-muted text-sm">Loading your account…</p>
      </div>
    );
  }

  const billingStatus = searchParams.get("billing");

  return (
    <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-pb-card p-6 shadow-xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pb-blue/40 bg-pb-blue/10 px-3 py-1 text-xs font-semibold text-pb-blue">
          <CreditCard className="size-3.5" />
          14-day free trial
        </div>

        <h1 className="text-2xl font-bold text-white">Choose your subscription</h1>
        <p className="mt-2 text-sm text-pb-muted">
          Start with two weeks free, then continue on monthly or yearly billing.
        </p>

        {billingStatus === "cancel" && (
          <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Checkout was canceled. Pick a plan whenever you are ready.
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleCheckout("monthly")}
            disabled={billingLoadingPlan !== null}
            className="rounded-xl border border-white/10 bg-pb-surface px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-pb-blue/50 disabled:opacity-60"
          >
            {billingLoadingPlan === "monthly" ? "Starting checkout…" : "Monthly ($4.99/mo)"}
          </button>
          <button
            type="button"
            onClick={() => handleCheckout("yearly")}
            disabled={billingLoadingPlan !== null}
            className="rounded-xl border border-pb-orange/40 bg-pb-orange/10 px-4 py-3 text-sm font-semibold text-pb-orange transition-colors hover:bg-pb-orange/20 disabled:opacity-60"
          >
            {billingLoadingPlan === "yearly" ? "Starting checkout…" : "Yearly ($50/yr)"}
          </button>
        </div>

        {billingError && <p className="mt-3 text-xs text-red-400">{billingError}</p>}

        <p className="mt-4 text-xs text-pb-muted">
          If your account requires email verification, confirm your email first, then return here.
        </p>

        <div className="mt-4">
          <Link href="/" className="text-xs font-semibold text-pb-blue hover:underline">
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
