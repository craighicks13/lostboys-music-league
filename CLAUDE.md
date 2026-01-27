# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server with Turbopack (http://localhost:3000)
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm start        # Start production server
```

## Environment Variables

Required in `.env`:
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret

Get credentials from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).

## Architecture

### Data Flow

1. **tRPC + React Query**: The app uses tRPC for type-safe API calls, configured in `src/app/providers.tsx`
2. **Spotify API**: Server-side tRPC router (`src/server/api/routers/spotify.ts`) fetches playlist data using client credentials flow
3. **CSV Fallback**: If Spotify API fails, falls back to parsing `public/Total Lost Boys Music League.csv` via `src/lib/csvParser.ts`
4. **Data Processing**: `usePlaylistData` hook (`src/lib/hooks.ts`) processes raw API data into `Artist[]` and `Song[]` types

### Key Files

- `src/app/providers.tsx` - tRPC client setup, React Query provider, theme provider
- `src/server/api/root.ts` - tRPC router definition (exports `AppRouter` type)
- `src/server/api/routers/spotify.ts` - Spotify API integration, hardcoded playlist ID `6oicpmZcmaD6rqjhfqge7l`
- `src/lib/types.ts` - Core `Song` and `Artist` types
- `src/lib/hooks.ts` - `usePlaylistData` hook for data processing with fallback logic

### Pages

- `/` - Redirects to `/search`
- `/search` - Artist/song search with expandable artist table
- `/analytics` - Top artists and songs statistics

### UI Components

Uses shadcn/ui (new-york style) with Radix UI primitives. Components in `src/components/ui/` follow standard shadcn patterns.

Path alias: `@/*` maps to `./src/*`
