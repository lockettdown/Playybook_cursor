"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);
  const next = safeNext(searchParams.get("next"));

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let active = true;

    const continueToApp = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && active) router.replace(next);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && active) router.replace(next);
    });

    void continueToApp();
    const timeout = window.setTimeout(() => {
      if (active) setError(true);
    }, 8_000);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [next, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
        <div className="max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-semibold text-white">Link invalid or expired</h1>
          <p className="text-sm text-pb-muted">
            Request a new confirmation email, then try again.
          </p>
          <Link href="/login" className="font-semibold text-pb-orange hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pb-dark">
      <p className="text-sm text-pb-muted">Confirming your sign-in…</p>
    </div>
  );
}
