"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_PREFIXES = ["/join/"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic(pathname)) {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    if (loading) return;
    if (user && pathname === "/login") {
      router.replace("/");
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-pb-dark">
        <p className="text-sm text-pb-muted">Loading…</p>
      </div>
    );
  }

  if (!user && !isPublic(pathname)) return null;

  return <>{children}</>;
}
