# Playybook

A Next.js sports team management application with features for team collaboration, game planning, practice management, a whiteboard, and messaging.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI / shadcn
- **Auth & Database**: Supabase (authentication + PostgreSQL)
- **State Management**: Zustand + TanStack React Query
- **Canvas/Drawing**: Konva / react-konva
- **Animations**: Framer Motion

## Project Structure

```
src/
  app/          - Next.js App Router pages
  components/   - Reusable UI components (layout, providers, ui)
  lib/          - Supabase clients, queries, utilities
  types/        - TypeScript type definitions
public/         - Static assets
supabase-messages-schema.sql - DB schema for messages
```

## Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

Copy `.env.example` to `.env.local` for local development.

## Development

- **Dev server**: `npm run dev` (runs on port 3001, host 0.0.0.0; avoid 5000 on macOS — AirPlay uses it)
- **Build**: `npm run build`
- **Start production**: `npm run start`

## Deployment

### Replit

- Build: `npm run build`
- Run: `npm run start`

### Netlify

1. Connect the Git repo; Netlify detects Next.js and runs `npm run build`.
2. **Site configuration → Environment variables**: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as Supabase **Project Settings → API**).
3. **Trigger deploy → Clear cache and deploy** after adding or changing those variables so the client bundle picks them up.
4. **Supabase → Authentication → URL configuration**: set **Site URL** to your Netlify URL (e.g. `https://your-site.netlify.app`) and add the same URL under **Redirect URLs** so sign-in works in production.

Optional: **Domain management** for a custom domain; rename the site under **Site configuration → General** if you want a cleaner default subdomain.
