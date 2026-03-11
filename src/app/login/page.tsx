"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === "login") {
      const err = await signIn(email, password);
      if (err) {
        setError(err);
        setBusy(false);
        return;
      }
      router.push("/");
    } else {
      const err = await signUp(email, password);
      if (err) {
        setError(err);
        setBusy(false);
        return;
      }

      const supabase = getSupabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existingMembers } = await supabase
          .from("app_members")
          .select("id")
          .eq("role", "owner")
          .limit(1);

        const isFirstUser = !existingMembers || existingMembers.length === 0;

        const { data: pendingByEmail } = await supabase
          .from("app_members")
          .select("*")
          .eq("email", email)
          .eq("invite_status", "pending")
          .limit(1);

        if (pendingByEmail && pendingByEmail.length > 0) {
          await supabase
            .from("app_members")
            .update({
              user_id: user.id,
              invite_status: "accepted",
              invite_token: null,
              display_name:
                displayName.trim() || pendingByEmail[0].display_name || email,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pendingByEmail[0].id);
        } else {
          await supabase.from("app_members").insert({
            user_id: user.id,
            email,
            display_name: displayName.trim() || email,
            role: isFirstUser ? "owner" : "player",
            invite_status: "accepted",
          });
        }
      }

      router.push("/");
    }

    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-pb-dark px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-pb-orange">PLAYYBOOK</h1>
          <p className="mt-2 text-sm text-pb-muted">
            {mode === "login"
              ? "Sign in to your account"
              : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-pb-muted">
                Display name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Coach Smith"
                className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-pb-muted">
              Email
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              placeholder="••••••••"
              className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-pb-orange text-white hover:bg-pb-orange/90"
          >
            {busy
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-pb-muted">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-semibold text-pb-orange"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="font-semibold text-pb-orange"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
