"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Phase = "loading" | "form" | "invalid" | "config";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let supabaseClient: SupabaseClient;
    try {
      supabaseClient = getSupabaseBrowser();
      setSupabase(supabaseClient);
    } catch {
      setPhase("config");
      return;
    }

    const hasRecoveryParams =
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        window.location.hash.includes("type=recovery") ||
        window.location.search.includes("code="));

    let invalidTimer: number | undefined;

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          if (invalidTimer) window.clearTimeout(invalidTimer);
          setPhase("form");
        }
      }
    );

    if (hasRecoveryParams) {
      const deadline = Date.now() + 12_000;
      const poll = () => {
        void supabaseClient.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            setPhase("form");
            return;
          }
          if (Date.now() < deadline) {
            window.setTimeout(poll, 150);
          } else {
            setPhase("invalid");
          }
        });
      };
      poll();
    } else {
      invalidTimer = window.setTimeout(() => setPhase("invalid"), 2500);
    }

    return () => {
      subscription.unsubscribe();
      if (invalidTimer) window.clearTimeout(invalidTimer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/");
    router.refresh();
  };

  if (phase === "config") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
        <p className="max-w-sm text-center text-sm text-red-400">
          Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment variables,
          then redeploy.
        </p>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
        <p className="text-sm text-pb-muted">Verifying reset link…</p>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-semibold text-white">
            Link invalid or expired
          </h1>
          <p className="text-sm text-pb-muted">
            Request a new reset link from the forgot password page.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block font-semibold text-pb-orange"
          >
            Forgot password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-pb-orange">PLAYYBOOK</h1>
          <p className="mt-2 text-sm text-pb-muted">Choose a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-pb-muted">
              New password
            </label>
            <Input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-pb-muted">
              Confirm password
            </label>
            <Input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-pb-orange text-white hover:bg-pb-orange/90"
          >
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>

        <p className="text-center text-sm text-pb-muted">
          <Link href="/login" className="font-semibold text-pb-orange">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
