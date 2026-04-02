import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-only Supabase client. Call from useEffect or event handlers — not during
 * React render or SSR, or Next.js static prerender will run before env is available.
 */
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them in Netlify: Site settings → Environment variables."
    );
  }
  return createBrowserClient(url, key);
}
