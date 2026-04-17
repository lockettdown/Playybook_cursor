"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session, SupabaseClient } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { AppMember } from "@/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  member: AppMember | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  member: null,
  loading: true,
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
  refreshMember: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function mapMemberRow(row: Record<string, unknown>): AppMember {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
    email: row.email as string,
    displayName: (row.display_name as string) ?? "",
    role: row.role as AppMember["role"],
    inviteToken: (row.invite_token as string) ?? null,
    inviteStatus: row.invite_status as AppMember["inviteStatus"],
    playerId: (row.player_id as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  /** Created in useEffect so static prerender / production build never calls @supabase/ssr without env. */
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<AppMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setSupabase(getSupabaseBrowser());
    } catch {
      setSupabase(null);
      setLoading(false);
    }
  }, []);

  const fetchMember = useCallback(
    async (uid: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("app_members")
        .select("*")
        .eq("user_id", uid)
        .single();
      if (data) setMember(mapMemberRow(data));
      else setMember(null);
    },
    [supabase]
  );

  const refreshMember = useCallback(async () => {
    if (user) await fetchMember(user.id);
  }, [user, fetchMember]);

  useEffect(() => {
    if (!supabase) return;

    let prevUserId: string | null = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      const newUserId = sess?.user?.id ?? null;
      if (prevUserId && newUserId !== prevUserId) {
        queryClient.clear();
      }
      prevUserId = newUserId;

      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchMember(sess.user.id);
      } else {
        setMember(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      prevUserId = s?.user?.id ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchMember(s.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchMember, queryClient]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) {
        return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment variables (Vercel: Project → Settings → Environment Variables), then redeploy.";
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? error.message : null;
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) {
        return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment variables (Vercel: Project → Settings → Environment Variables), then redeploy.";
      }
      const { error } = await supabase.auth.signUp({ email, password });
      return error ? error.message : null;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    queryClient.clear();
    setUser(null);
    setSession(null);
    setMember(null);
  }, [supabase, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        member,
        loading,
        signIn,
        signUp,
        signOut,
        refreshMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
