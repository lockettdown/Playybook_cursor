"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const supabase = getSupabaseBrowser();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${origin}/auth/reset-password` }
      );
      if (resetError) {
        setError(resetError.message);
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment variables, then redeploy."
      );
    }

    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-pb-orange">PLAYYBOOK</h1>
          <p className="mt-2 text-sm text-pb-muted">Reset your password</p>
        </div>

        {sent ? (
          <div className="space-y-4 rounded-lg border border-pb-border bg-pb-card p-4 text-center text-sm text-pb-muted">
            <p>
              If an account exists for{" "}
              <span className="font-medium text-white">{email}</span>, we sent
              a link to reset your password. Check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="inline-block font-semibold text-pb-orange hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-pb-muted">
                Email
              </label>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-pb-orange text-white hover:bg-pb-orange/90"
            >
              {busy ? "Sending link…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-pb-muted">
          <Link href="/login" className="font-semibold text-pb-orange">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
