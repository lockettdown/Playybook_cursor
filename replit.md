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

## Development

- **Dev server**: `npm run dev` (runs on port 3001, host 0.0.0.0; avoid 5000 on macOS — AirPlay uses it)
- **Build**: `npm run build`
- **Start production**: `npm run start`

## Deployment

Configured for Replit autoscale deployment with:
- Build: `npm run build`
- Run: `npm run start`
