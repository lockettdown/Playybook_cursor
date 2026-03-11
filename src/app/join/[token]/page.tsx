"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { resolveInviteToken, acceptInvite } from "@/lib/messages-queries";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AppMember } from "@/types";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pending, setPending] = useState<AppMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    resolveInviteToken(token).then((member) => {
      if (member) {
        setPending(member);
        setEmail(member.email);
        setDisplayName(member.displayName);
      } else {
        setInvalid(true);
      }
      setLoading(false);
    });
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    setError(null);
    setBusy(true);

    const supabase = getSupabaseBrowser();

    // Try sign up first
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      { email, password }
    );

    if (signUpError) {
      // Maybe already has account, try sign in
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signUpError.message);
        setBusy(false);
        return;
      }

      if (signInData.user) {
        await acceptInvite(
          pending.id,
          signInData.user.id,
          displayName.trim() || undefined
        );
        router.push("/messages");
        return;
      }
    }

    if (signUpData?.user) {
      await acceptInvite(
        pending.id,
        signUpData.user.id,
        displayName.trim() || undefined
      );
      router.push("/messages");
      return;
    }

    setError("Something went wrong. Please try again.");
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pb-dark">
        <p className="text-pb-muted">Checking invite…</p>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-pb-dark px-4">
        <h2 className="text-xl font-bold text-white mb-2">
          Invalid or expired invite
        </h2>
        <p className="text-sm text-pb-muted mb-6 text-center">
          This invite link is no longer valid. Ask your coach for a new one.
        </p>
        <Button
          onClick={() => router.push("/login")}
          className="bg-pb-orange text-white hover:bg-pb-orange/90"
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-pb-orange">PLAYYBOOK</h1>
          <p className="mt-2 text-sm text-pb-muted">
            You&apos;ve been invited as a{" "}
            <span className="font-semibold capitalize text-white">
              {pending?.role}
            </span>
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-pb-muted">
              Display name
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-pb-muted">
              Email
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-pb-muted">
              Password
            </label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-pb-orange text-white hover:bg-pb-orange/90"
          >
            {busy ? "Joining…" : "Join Playybook"}
          </Button>
        </form>

        <p className="text-center text-sm text-pb-muted">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="font-semibold text-pb-orange"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
