# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

```bash
pnpm dev          # Start dev server with Turbopack (http://localhost:3000)
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm start        # Start production server
```

## Project Overview

Music League is a social music discovery platform — users create/join leagues, submit songs for themed rounds, vote on submissions, and compete on leaderboards. Built with Next.js 15 (App Router), React 19, tRPC, shadcn/ui, and Drizzle ORM on Neon Postgres.

**Current status:** Phases 1–17 complete (100% of tasks, 175/175). See `docs/planning/active/PRD-music-league-mvp.md` for the full plan and task list.

## Environment Variables

Required in `.env` (see `src/env.d.ts` for full list):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL`, `DIRECT_URL` | Neon Postgres connection |
| `BETTER_AUTH_SECRET` | Better Auth session encryption (min 32 chars) |
| `BETTER_AUTH_URL` | Auth callback base URL |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `AUTH_SPOTIFY_ID`, `AUTH_SPOTIFY_SECRET` | Spotify OAuth (via genericOAuth plugin) + client credentials API |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` | Apple OAuth |
| `APPLE_MUSIC_PRIVATE_KEY` | Apple Music API (MusicKit JWT signing) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Magic link emails via Resend |
| `OPENAI_API_KEY` | AI theme/artwork generation |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage (artwork) |

## Architecture

### Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Auth:** Better Auth (`better-auth`) with Drizzle adapter, genericOAuth (Spotify), magicLink (Resend)
- **Database:** Neon Serverless Postgres via `@neondatabase/serverless` + `drizzle-orm/neon-http`
- **API:** tRPC with React Query (`src/server/api/`)
- **Validation:** Zod schemas (`src/lib/validators/`)
- **UI:** shadcn/ui (new-york style) + Tailwind CSS v4 (CSS-based config, no `tailwind.config.ts`)
- **AI:** Vercel AI SDK — `openai('gpt-4o-mini')` for themes, `openai.image('dall-e-3')` for artwork
- **Music Services:** Spotify Web API (client credentials), Apple Music API (`jose` JWT)
- **Storage:** Vercel Blob for artwork
- **Path alias:** `@/*` maps to `./src/*`

### Key Files

| File | Purpose |
|------|---------|
| `src/auth.ts` | Better Auth config (exports `auth` instance with `betterAuth()`) |
| `src/lib/auth-client.ts` | Client-side auth (exports `useSession`, `signIn`, `signOut`, `authClient`) |
| `src/middleware.ts` | Route protection via session cookie check |
| `src/app/api/auth/[...all]/route.ts` | Better Auth API route handler (`toNextJsHandler`) |
| `src/app/providers.tsx` | tRPC client, React Query provider, theme provider |
| `src/server/api/root.ts` | tRPC router definition (exports `AppRouter` type) |
| `src/server/api/trpc.ts` | tRPC context (`db` + `session` via `auth.api.getSession`), `protectedProcedure` |
| `src/server/db/index.ts` | Database connection (Neon + Drizzle) |
| `src/server/db/schema/` | Drizzle table definitions (16 tables across 7 files) |
| `src/lib/validators/` | Zod schemas for all models (11 files) |
| `src/lib/auth/token-refresh.ts` | Streaming service token refresh logic |
| `src/lib/services/spotify.ts` | Spotify client credentials + track metadata fetch |
| `src/lib/services/apple-music.ts` | Apple Music JWT + track metadata fetch |
| `src/lib/services/music.ts` | Unified TrackMetadata facade over both providers |
| `src/lib/services/url-parser.ts` | Parse Spotify/Apple Music URLs → provider + track ID |
| `src/lib/services/playlist.ts` | Unified playlist generation facade |
| `src/lib/services/spotify-playlist.ts` | Spotify playlist creation (user OAuth token) |
| `src/lib/services/apple-music-playlist.ts` | Apple Music playlist creation (Music User Token) |

### tRPC Routers

| Router | Path | Purpose |
|--------|------|---------|
| `league` | `src/server/api/routers/league.ts` | CRUD, members, roles |
| `invite` | `src/server/api/routers/invite.ts` | Generate invites, join by code/link |
| `season` | `src/server/api/routers/season.ts` | CRUD, status transitions, leaderboard |
| `round` | `src/server/api/routers/round.ts` | CRUD, status transitions, deadlines |
| `ai` | `src/server/api/routers/ai.ts` | Theme suggestions, artwork generation |
| `analytics` | `src/server/api/routers/analytics.ts` | League-scoped search, stats |
| `music` | `src/server/api/routers/music.ts` | Track lookup by URL or provider+ID |
| `playlist` | `src/server/api/routers/playlist.ts` | Spotify/Apple Music playlist generation |
| `submission` | `src/server/api/routers/submission.ts` | CRUD, deadline enforcement, permissions |
| `voting` | `src/server/api/routers/voting.ts` | Cast votes, results, leaderboard updates |
| `statistics` | `src/server/api/routers/statistics.ts` | League/season/user stats, controversial, compare, CSV export |
| `chat` | `src/server/api/routers/chat.ts` | In-app chat (getOrCreateGroup, sendMessage, getMessages) |
| `comment` | `src/server/api/routers/comment.ts` | Submission comments (CRUD, hide for moderators) |
| `reaction` | `src/server/api/routers/reaction.ts` | Emoji reactions on submissions (toggle, aggregated counts) |

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing page (auth-aware) |
| `/auth/signin` | Sign-in with OAuth + magic link |
| `/profile` | User profile edit (name, avatar, streaming pref) |
| `/leagues` | My leagues list |
| `/leagues/create` | Create new league |
| `/leagues/[id]` | League dashboard |
| `/leagues/[id]/settings` | League settings |
| `/leagues/[id]/seasons` | Season archive |
| `/leagues/[id]/rounds` | Round archive |
| `/leagues/[id]/rounds/[roundId]` | Round detail (status mgmt, artwork) |
| `/leagues/[id]/search` | League-scoped submission search |
| `/leagues/[id]/analytics` | League analytics dashboard |
| `/leagues/[id]/leaderboards` | Season/all-time leaderboard with personal stats, CSV export |
| `/leagues/[id]/members/[userId]/stats` | Detailed user statistics with submission history |
| `/leagues/[id]/compare` | Compare two league members head-to-head |
| `/leagues/[id]/chat` | In-app league chat |
| `/leagues/[id]/seasons/[seasonId]/stats` | Season statistics with round breakdown |
| `/leagues/join` | Join league by code |
| `/invite/[token]` | Join league by invite link |
| `/search`, `/analytics` | Legacy redirects to `/leagues` |

### Components

- `src/components/ui/` — shadcn/ui primitives (button, card, dialog, etc.)
- `src/components/league/` — League feature components (20 files: forms, dashboards, AI tools, track preview)
- `src/components/auth/` — Auth UI components (OAuthButtons, SignInForm, AuthCard)
- `src/components/profile/` — ProfileForm, ProfileStats
- `src/components/Header.tsx` — App header
- `src/components/Navigation.tsx` — Mobile nav (hidden on landing page)

## Implementing New Phases

### Use TeamCreate for Phase Implementation

When implementing a new phase from the PRD, **always use `TeamCreate`** to coordinate the work with a team of specialized agents. This ensures parallel work, clear task ownership, and progress tracking.

**Workflow:**

1. **Read the PRD** — Review `docs/planning/active/PRD-music-league-mvp.md` for the target phase's tasks, dependencies, and agent ownership.

2. **Create a team** — Use `TeamCreate` with a descriptive name matching the phase:
   ```
   TeamCreate: team_name="phase-7-streaming", description="Implement Phase 7: Streaming Service Integration (tasks #62-69)"
   ```

3. **Create tasks** — Use `TaskCreate` to add each PRD task (or logical groupings) to the team's task list. Include dependencies via `addBlockedBy`.

4. **Spawn teammates** — Use the `Task` tool with `team_name` parameter to spawn agents for parallel work:
   - Use `subagent_type: "general-purpose"` for implementation tasks (has file edit access)
   - Use `subagent_type: "Plan"` or `subagent_type: "Explore"` for research/planning tasks (read-only)
   - Name teammates by role (e.g., `"spotify-integration"`, `"ui-builder"`, `"api-developer"`)

5. **Assign tasks** — Use `TaskUpdate` with `owner` to assign tasks to teammates. Teammates pick up work via `TaskList`.

6. **Coordinate** — Use `SendMessage` for DMs between agents. Teammates report completion via `TaskUpdate` status changes.

7. **Verify** — After all tasks complete, run `pnpm build && pnpm lint` to verify no regressions.

8. **Clean up** — Shut down teammates via `SendMessage` type `"shutdown_request"`, then `TeamDelete`.

9. **Update progress docs** — After each phase completes, update all three locations:
   - **PRD** (`docs/planning/active/PRD-music-league-mvp.md`): Check off completed tasks (`[x]`), mark phase heading with ✅, update Progress Summary table, update overall task count, add Revision History entry.
   - **CLAUDE.md** (this file): Update "Current status" line (phase count + percentage), add any new routers/files/env vars to the Architecture tables.
   - **MEMORY.md** (`~/.claude/projects/.../memory/MEMORY.md`): Add a new "Phase N" subsection under Completed Phases with key implementation details.

### Agent Team Mapping (from PRD)

When implementing phases, align teammates with the PRD's agent structure:

| PRD Agent | Phases | Recommended Teammates |
|-----------|--------|----------------------|
| 🎵 Music Services | 7, 8, 9, 10 | `spotify-api`, `apple-music-api`, `submission-ui`, `preview-player` |
| 🗳️ Voting & Scoring | 11, 12, 13 | `voting-api`, `voting-ui`, `leaderboard`, `statistics` |
| 💬 Social | 14, 15 | `chat-backend`, `chat-ui`, `comments-reactions` |
| 🎯 Game Engine | 16 | `admin-api`, `admin-ui` |
| 🎨 UI/UX | 17 | `responsive-audit`, `polish`, `performance`, `deployment` |

### Implementation Guidelines

- **Read before writing.** Always read existing files before modifying. Understand the patterns already established.
- **Follow existing patterns.** New tRPC routers follow the same structure as `league.ts`. New validators follow `src/lib/validators/` conventions. New components go in `src/components/league/`.
- **Use `protectedProcedure`** for any endpoint requiring auth. It provides `ctx.session` and `ctx.db`.
- **Zod validators are the source of truth** for data shapes. DB schema and validators must stay aligned.
- **DB `leagues.settings`** is a jsonb column — cast to `LeagueSettings` (from validators) when reading.
- **Tailwind v4** uses CSS-based config in `globals.css`, not a `tailwind.config.ts` file.
- **Drizzle + Neon:** Use `neon()` + `drizzle()` from `drizzle-orm/neon-http`, NOT `@neondatabase/serverless/neon`.

## Auth Patterns (Better Auth)

### Server-side session
```typescript
import { auth } from "@/auth";
import { headers } from "next/headers";
const result = await auth.api.getSession({ headers: await headers() });
// result?.user?.id, result?.user?.name, etc.
```

### Client-side session
```typescript
import { useSession } from "@/lib/auth-client";
const { data, isPending } = useSession();
// data?.user?.id, data?.user?.name, etc.
```

### Client-side sign-in
```typescript
import { authClient } from "@/lib/auth-client";
authClient.signIn.social({ provider: "google", callbackURL: "/" });
authClient.signIn.oauth2({ providerId: "spotify", callbackURL: "/" });
authClient.signIn.magicLink({ email, callbackURL: "/" });
```

### OAuth callback URLs
- Google/Apple: `{BETTER_AUTH_URL}/api/auth/callback/{provider}`
- Spotify (genericOAuth): `{BETTER_AUTH_URL}/api/auth/oauth2/callback/spotify`

## Known Gotchas

- Better Auth base URL warning during build is expected when `BETTER_AUTH_URL` env var is missing
- League list endpoint returns `userRole` not `role` — UI components handle both
- When using Edit `replace_all`, be careful not to replace variable declarations (e.g., `const role = role` self-reference bug)
- The Read tool's tab display differs from actual file indentation — use Write to rewrite files when Edit fails on whitespace
- Postgres unique indexes treat NULLs as distinct — can't use standard `ON CONFLICT` upsert for nullable columns; use select-then-insert/update pattern
- Account table columns are now camelCase: `providerId`, `accountId`, `accessToken`, `refreshToken`, `accessTokenExpiresAt` (timestamps, not integer epoch)
