# PRD: Music League MVP

**Created:** January 27, 2026
**Last Updated:** February 10, 2026
**Status:** In Progress (Phases 1–15 Complete)

## Overview

Music League is a social music discovery platform where users create or join leagues, submit songs based on themed rounds, vote on submissions, and compete on leaderboards. The MVP enables Spotify/Apple Music connectivity, league management with configurable voting rules (including downvoting), seasons with statistics, AI-powered theme generation, chat groups, and automatic playlist creation—all deployed on Vercel with a Postgres database.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Authentication:** NextAuth.js v5 (Auth.js beta) — Email magic link + OAuth
- **UI:** shadcn/ui + Tailwind CSS v4
- **Database:** PostgreSQL (Neon Serverless)
- **ORM:** Drizzle ORM (`drizzle-orm/neon-http`)
- **API:** tRPC with React Query
- **Validation:** Zod schemas
- **AI:** Vercel AI SDK (OpenAI gpt-4o-mini for themes, DALL-E 3 for artwork)
- **Storage:** Vercel Blob (artwork), Vercel/Cloudflare (avatars)
- **Hosting:** Vercel
- **Streaming:** Spotify Web API, Apple Music API (MusicKit JS)
- **Messaging:** WhatsApp Business API (optional) + In-app chat
- **Repository:** Git (GitHub)

## Success Criteria

- [x] Criterion 1: Users can sign up/in via magic link or OAuth and create/edit profiles
- [x] Criterion 2: Users can create private leagues with seasons, invite others via link/code, and manage members
- [x] Criterion 3: League owners can create rounds with AI-generated themes/artwork and configurable voting rules (including downvoting)
- [ ] Criterion 4: Users can submit one song per round via Spotify/Apple Music link with metadata auto-populated
- [ ] Criterion 5: Users can listen to submissions (preview/open in provider) and vote/downvote according to league rules
- [ ] Criterion 6: Results are calculated correctly, displayed on reveal, and update season/league leaderboards
- [ ] Criterion 7: Comprehensive statistics are available at league, season, and user levels
- [ ] Criterion 8: Users can communicate via in-app chat or WhatsApp group integration
- [ ] Criterion 9: Round playlists are automatically created in users' preferred streaming service
- [ ] Criterion 10: Admins can moderate members and content
- [ ] Criterion 11: Application is deployed and functional on Vercel
- [ ] Criterion 12: Application is responsive and optimized for both mobile and desktop viewports

## Scope

### In Scope
- Email magic link and OAuth authentication (Google, Spotify, Apple)
- Basic user profiles (display name, avatar, streaming preference)
- League CRUD with invite links and join codes
- **Seasons:** Leagues can have multiple seasons with independent leaderboards
- Role-based access (Owner, Admin, Member)
- League settings: anonymous submissions, voting rules, self-vote toggle, **downvoting toggle**, leaderboard reset
- Round lifecycle management (Draft → Submitting → Voting → Revealed → Archived)
- **AI-powered theme suggestions using Vercel AI SDK**
- **AI-generated theme artwork using Vercel AI SDK**
- Song submission via streaming service link with metadata fetch
- Optional submission notes
- Listening feed with anonymous mode support
- Open in provider / preview playback
- Configurable voting (rank top N, points 3-2-1, single pick)
- **Configurable downvoting (same options as upvoting)**
- Vote enforcement (one vote per round, no self-vote by default)
- Score calculation (upvotes minus downvotes) and leaderboard updates
- **Statistics:** League-wide, season-level, and per-user analytics
- **Playlist generation:** Auto-create round playlists in Spotify/Apple Music
- **Chat groups:** In-app messaging and WhatsApp group creation
- Comment threads per submission
- Emoji reactions on submissions
- Admin utilities: kick/ban, delete/cancel round, moderate comments
- **Responsive design (mobile-first) with desktop optimization**
- Vercel deployment with Postgres

### Out of Scope
- In-app full track playback (beyond previews)
- Song search submission (link-only for MVP)
- @mentions in comments
- Push/email notifications (beyond WhatsApp)
- Social features (following users, global activity feed)
- Multiple submissions per round
- Premium tiers or payments
- Native mobile apps
- Video content support

## Database Schema Overview (Drizzle)

### Core Tables (16 tables implemented)
- `users` - id, email, name, avatar_url, streaming_preference, spotify_access_token, apple_music_token, created_at
- `accounts` - NextAuth managed (OAuth connections)
- `sessions` - NextAuth managed
- `verification_tokens` - NextAuth managed (magic links)
- `leagues` - id, name, description, visibility, owner_id, settings (jsonb), created_at
- `seasons` - id, league_id, name, number, status (active/completed/upcoming), start_date, end_date, created_at
- `league_members` - id, league_id, user_id, role, joined_at, banned_at
- `invites` - id, league_id, code, link_token, expires_at, max_uses, use_count, created_by
- `rounds` - id, league_id, season_id, theme, description, ai_artwork_url, status, submission_start, submission_end, voting_end, playlist_spotify_id, playlist_apple_id, created_by
- `submissions` - id, round_id, user_id, track_name, artist, album, artwork_url, duration, provider, provider_track_id, note, created_at
- `votes` - id, round_id, user_id, submission_id, points, vote_type (upvote/downvote), created_at
- `comments` - id, submission_id, user_id, content, hidden, created_at
- `reactions` - id, submission_id, user_id, emoji, created_at
- `leaderboard_entries` - id, league_id, season_id, user_id, total_points, upvotes_received, downvotes_received, wins, rounds_participated, created_at, updated_at
- `chat_groups` - id, league_id, name, type (in_app/whatsapp), whatsapp_group_id, created_at
- `chat_messages` - id, chat_group_id, user_id, content, created_at

### Zod Schemas
All database models have corresponding Zod schemas in `src/lib/validators/` for:
- Insert validation (createUserSchema, createLeagueSchema, etc.)
- Update validation (updateUserSchema, updateLeagueSchema, etc.)
- API request/response validation
- Form validation (client-side)

---

## Agent Team Structure

This project is organized around **7 specialized agent teams**, each owning a clear domain of the codebase. Agents work in parallel where dependencies allow, with handoff points clearly defined. A human orchestrator reviews at checkpoints and resolves cross-team conflicts.

### Agent Team Overview

| Agent | Domain | Core Responsibility | Key Outputs |
|-------|--------|-------------------|-------------|
| 🏗️ **Foundation Agent** | Infrastructure & Auth | Project setup, DB schema, auth, middleware | Drizzle schema, NextAuth config, Zod schemas, base layout |
| 🎯 **Game Engine Agent** | Leagues, Seasons, Rounds | All game lifecycle logic and APIs | League/Season/Round CRUD, status transitions, cron jobs |
| 🎵 **Music Services Agent** | Streaming & Playlists | Spotify/Apple Music integration | Track metadata service, playlist generation, preview player |
| 🤖 **AI Agent** | AI-powered features | Theme generation, artwork | Vercel AI SDK integration, image gen, storage |
| 🗳️ **Voting & Scoring Agent** | Votes, Results, Stats | Voting system, leaderboards, analytics | Vote APIs, score calculation, statistics engine |
| 💬 **Social Agent** | Chat, Comments, Reactions | All social/communication features | In-app chat, WhatsApp integration, comment threads |
| 🎨 **UI/UX Agent** | Frontend polish & responsive | Pages, responsive design, UX polish | All page layouts, mobile optimization, loading states, accessibility |

### Agent Interaction Model

```
                    ┌─────────────────────┐
                    │   You (Orchestrator) │
                    │  Reviews checkpoints │
                    │  Resolves conflicts  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼───────┐  ┌────▼─────┐  ┌───────▼──────┐
     │ 🏗️ Foundation  │  │ 🤖 AI    │  │ 🎵 Music     │
     │ ✅ COMPLETE    │  │ ✅ DONE  │  │   Services   │
     │                │  │          │  │  Ph7 ✅      │
     └───────┬────────┘  └────┬─────┘  └───────┬──────┘
             │                │                │
     ┌───────▼────────┐      │                │
     │ 🎯 Game Engine │◄─────┘                │
     │ ✅ COMPLETE    │◄──────────────────────┘
     └───────┬────────┘
             │
    ┌────────┼─────────┐
    │        │         │
┌───▼──┐ ┌──▼───┐ ┌───▼──┐
│🗳️Vote│ │💬Soc.│ │🎨UI  │
│Engine│ │      │ │/UX   │
└──────┘ └──────┘ └──────┘
```

---

## Tasks by Agent Team

### 🏗️ Foundation Agent — Infrastructure, Auth & Data Layer ✅ COMPLETE

**Mission:** Set up the project, define the data layer, implement authentication, and create the responsive app shell. Every other agent depends on your outputs.

**Outputs consumed by other agents:**
- Drizzle schema + migrations → all agents
- Zod schemas → all agents
- NextAuth session + middleware → all agents
- Base layout + nav shell → 🎨 UI/UX Agent
- Streaming token storage → 🎵 Music Services Agent

#### Phase 1: Project Setup & Infrastructure ✅

- [x] #1: Initialize Next.js project with TypeScript, ESLint, Prettier [Depends on: none]
- [x] #2: Configure Tailwind CSS and shadcn/ui component library [Depends on: #1]
- [x] #3: Set up Git repository with .gitignore, README, and branch protection [Depends on: #1]
- [x] #4: Create Vercel project and connect to Git repository [Depends on: #3]
- [x] #5: Provision PostgreSQL database (Neon Serverless) [Depends on: #4]
- [x] #6: Set up Drizzle ORM with initial schema and migrations [Depends on: #5]
- [x] #7: Create Zod schemas for all database models (users, leagues, rounds, etc.) [Depends on: #6]
- [x] #8: Configure environment variables (.env.local, Vercel env vars) [Depends on: #5]
- [x] #9: Install and configure Vercel AI SDK [Depends on: #1]
- [x] #10: Create base layout component with responsive navigation shell (mobile hamburger menu, desktop sidebar/top nav) [Depends on: #2]

#### Phase 2: Authentication & User Profiles ✅

- [x] #11: Install and configure NextAuth.js with Drizzle adapter [Depends on: #6]
- [x] #12: Create Zod schemas for auth flows (signIn, signUp, profile) [Depends on: #7, #11]
- [x] #13: Implement email magic link provider (Resend) [Depends on: #11]
- [x] #14: Add Google OAuth provider [Depends on: #11]
- [x] #15: Add Spotify OAuth provider with scopes for user profile + playlist creation [Depends on: #11]
- [x] #16: Add Apple OAuth provider with MusicKit scopes [Depends on: #11]
- [x] #17: Create sign-in page UI with provider options (responsive for mobile/desktop) [Depends on: #13, #14]
- [x] #18: Create user profile page with edit form (name, avatar upload, streaming preference) [Depends on: #11, #10]
- [x] #19: Implement avatar upload to Vercel Blob storage [Depends on: #18]
- [x] #20: Store and refresh streaming service tokens for playlist creation [Depends on: #15, #16]
- [x] #21: Add protected route middleware for authenticated pages [Depends on: #11]

**🏗️ Foundation Agent Checkpoint** ✅ Complete — Auth working with all providers, tokens refreshing, Drizzle + Zod smooth.

---

### 🎯 Game Engine Agent — Leagues, Seasons & Rounds ✅ COMPLETE (Phases 3-5)

**Mission:** Build the core game domain — league creation and management, season lifecycle, round management with status transitions, and all admin controls. You own the "rules of the game."

**Depends on:** 🏗️ Foundation Agent (schema, auth, Zod, layout)
**Outputs consumed by:**
- Round data → 🎵 Music Services, 🗳️ Voting, 💬 Social, 🎨 UI/UX
- League settings (voting rules, anon mode, downvoting) → 🗳️ Voting Agent
- League membership → 💬 Social Agent, 🎨 UI/UX Agent

#### Phase 3: League Management ✅

- [x] #22: Create leagues Drizzle table and Zod schemas [Depends on: #6, #7]
- [x] #23: Create league_members table with role enum (Owner, Admin, Member) [Depends on: #22]
- [x] #24: Create invites table for link/code invitations [Depends on: #22]
- [x] #25: Build "Create League" form UI (name, description, visibility toggle) with Zod validation [Depends on: #10, #22]
- [x] #26: Implement league creation API route with owner assignment [Depends on: #25, #23]
- [x] #27: Build league settings form UI (anonymous submissions, voting rules, self-vote, downvoting toggle) [Depends on: #25]
- [x] #28: Implement league settings update API route with Zod validation [Depends on: #27]
- [x] #29: Create invite generation logic (unique code + shareable link) [Depends on: #24]
- [x] #30: Build invite management UI for owners/admins [Depends on: #29]
- [x] #31: Implement join league flow via link (public page, join confirmation) [Depends on: #29, #21]
- [x] #32: Implement join league flow via code input [Depends on: #31]
- [x] #33: Build league dashboard page showing members, active season, active round, leaderboard summary [Depends on: #26, #23]
- [x] #34: Build league members list UI with role badges [Depends on: #33]
- [x] #35: Implement role management API (promote/demote Admin) for owners [Depends on: #34]
- [x] #36: Create "My Leagues" list page for authenticated users [Depends on: #33]

#### Phase 4: Seasons Management ✅

- [x] #37: Create seasons Drizzle table and Zod schemas [Depends on: #22]
- [x] #38: Build "Create Season" form UI (name, start/end dates) [Depends on: #33, #37]
- [x] #39: Implement season creation API with validation [Depends on: #38]
- [x] #40: Build season switcher UI in league dashboard [Depends on: #39]
- [x] #41: Implement season status management (upcoming → active → completed) [Depends on: #39]
- [x] #42: Create season archive/history view [Depends on: #41]
- [x] #43: Implement automatic season activation based on dates [Depends on: #41]
- [x] #44: Build season leaderboard separate from all-time league leaderboard [Depends on: #41]

#### Phase 5: Round Management ✅

- [x] #45: Create rounds Drizzle table with season_id and Zod schemas [Depends on: #37]
- [x] #46: Build "Create Round" form UI (theme, description, start/end dates) with Zod validation [Depends on: #33, #45]
- [x] #47: Implement round creation API route with Draft status [Depends on: #46]
- [x] #48: Build round status management UI (Draft → Submitting activation) [Depends on: #47]
- [x] #49: Implement round status transition API with validation [Depends on: #48]
- [x] #50: Create cron job or edge function for automatic status transitions at deadlines [Depends on: #49]
- [x] #51: Build round detail page showing status, deadlines, submission count [Depends on: #47]
- [x] #52: Implement round editing (theme, dates) while in Draft status [Depends on: #51]
- [x] #53: Implement round cancellation for admins (only Draft/Submitting) [Depends on: #49]
- [x] #54: Build round history/archive view for league and season [Depends on: #51, #42]

#### Phase 16: Admin Utilities (owned by Game Engine Agent) ✅

- [x] #156: Build admin panel UI within league settings [Depends on: #34]
- [x] #157: Implement kick member API (removes from league) [Depends on: #156]
- [x] #158: Implement ban member API (kick + prevent rejoin) [Depends on: #157]
- [x] #159: Add ban indicator on league join flow (block banned users) [Depends on: #158, #31]
- [x] #160: Implement round deletion for Draft rounds [Depends on: #53, #156]
- [x] #161: Add confirmation dialogs for destructive admin actions [Depends on: #156]
- [x] #162: Build moderation log view for owners [Depends on: #157, #155]
- [x] #163: Add ability to disable/enable downvoting mid-season [Depends on: #156, #28]

**🎯 Game Engine Agent Checkpoint** ✅ Complete (Phases 3-5) — League + season + round lifecycle working. Auto-transitions reliable. Admin utilities (Phase 16) still pending.

---

### 🎵 Music Services Agent — Streaming Integration & Playlists

**Mission:** Build all Spotify and Apple Music integrations — track metadata fetching, URL parsing, preview playback, and automatic playlist generation. Produce clean, unified service abstractions that submissions and the listening experience consume.

**Depends on:** 🏗️ Foundation Agent (schema, env vars, token storage)
**Outputs consumed by:**
- Track metadata service → 🎯 Game Engine (submissions), 🎨 UI/UX (preview player)
- Playlist service → 🎯 Game Engine (round reveal trigger)
- Preview player component → 🎨 UI/UX Agent

#### Phase 7: Streaming Service Integration ✅

- [x] #62: Register Spotify Developer application and configure credentials [Depends on: #8]
- [x] #63: Implement Spotify track metadata fetch from URL/ID [Depends on: #62]
- [x] #64: Register Apple Music Developer account and configure MusicKit credentials [Depends on: #8]
- [x] #65: Implement Apple Music track metadata fetch from URL/ID [Depends on: #64]
- [x] #66: Create unified track metadata service abstracting both providers [Depends on: #63, #65]
- [x] #67: Implement URL parsing to detect provider and extract track ID [Depends on: #66]
- [x] #68: Build track preview component with fallback states (responsive for mobile/desktop) [Depends on: #66]
- [x] #69: Implement "Open in Provider" deep links [Depends on: #66]

#### Phase 8: Playlist Generation ✅

- [x] #70: Implement Spotify playlist creation API integration [Depends on: #62, #20]
- [x] #71: Implement Spotify add tracks to playlist functionality [Depends on: #70]
- [x] #72: Implement Apple Music playlist creation via MusicKit [Depends on: #64, #20]
- [x] #73: Implement Apple Music add tracks to playlist functionality [Depends on: #72]
- [x] #74: Create unified playlist service abstracting both providers [Depends on: #71, #73]
- [x] #75: Auto-generate round playlist when round moves to Revealed status [Depends on: #74, #50]
- [x] #76: Store playlist IDs on round record [Depends on: #75]
- [x] #77: Build "Add to My Library" button for users to save round playlist [Depends on: #76]
- [x] #78: Handle playlist generation for users without connected streaming accounts [Depends on: #77]

#### Phase 9: Submissions ✅ (shared with 🎯 Game Engine for API logic)

- [x] #79: Create submissions Drizzle table with provider metadata fields and Zod schemas [Depends on: #45, #7]
- [x] #80: Build submission form UI with URL paste input [Depends on: #51, #67]
- [x] #81: Implement real-time track preview on URL paste (fetch metadata, show card) [Depends on: #80, #66]
- [x] #82: Add optional "why I picked this" note field to submission form [Depends on: #80]
- [x] #83: Implement submission creation API with one-per-user-per-round validation [Depends on: #81, #79]
- [x] #84: Implement submission deadline enforcement (reject after submission_end) [Depends on: #83, #50]
- [x] #85: Build user's submission status indicator on round page (submitted/not submitted) [Depends on: #83]
- [x] #86: Implement submission editing before deadline [Depends on: #83]
- [x] #87: Implement submission deletion before deadline [Depends on: #86]

#### Phase 10: Listening Experience ✅

- [x] #88: Build round feed page listing all submissions as cards (mobile-optimized card layout) [Depends on: #79, #51]
- [x] #89: Implement anonymous mode in feed (hide submitter names/avatars until Revealed) [Depends on: #88, #27]
- [x] #90: Add shuffle option for submission order in feed [Depends on: #88]
- [x] #91: Integrate track preview player into submission cards [Depends on: #88, #68]
- [x] #92: Add "Open in Spotify/Apple Music" buttons to submission cards [Depends on: #91, #69]
- [x] #93: Display submission notes (if present) in expandable section [Depends on: #88]
- [x] #94: Build now-playing indicator when previewing a track [Depends on: #91]

**🎵 Music Services Agent Checkpoint** (After Task #94): Metadata fetch reliable for both services? Preview player working on mobile? Playlist generation working?

---

### 🤖 AI Agent — Theme Generation & Artwork ✅ COMPLETE

**Mission:** Integrate Vercel AI SDK to power theme suggestions and artwork generation for rounds. Self-contained — you just need the round creation flow to plug into.

**Depends on:** 🏗️ Foundation Agent (Vercel AI SDK setup, env vars)
**Outputs consumed by:** 🎯 Game Engine Agent (theme + artwork in round creation flow)

#### Phase 6: AI Theme Generation ✅

- [x] #55: Create AI theme suggestion API using Vercel AI SDK [Depends on: #9, #47]
- [x] #56: Build theme suggestion UI with "Generate Ideas" button [Depends on: #55, #46]
- [x] #57: Implement theme refinement chat (iterate on suggestions) [Depends on: #56]
- [x] #58: Create AI artwork generation API for round themes [Depends on: #9]
- [x] #59: Build artwork preview and selection UI [Depends on: #58]
- [x] #60: Implement artwork storage (Vercel Blob) and association with round [Depends on: #59]
- [x] #61: Add "Regenerate Artwork" option for admins [Depends on: #60]

**🤖 AI Agent Checkpoint** ✅ Complete — Theme suggestions working via GPT-4o-mini. Artwork generation via DALL-E 3. Stored in Vercel Blob.

---

### 🗳️ Voting & Scoring Agent — Votes, Results, Leaderboards & Statistics

**Mission:** Build the entire scoring pipeline — voting UI (all 3 modes × up/down), vote submission APIs, results calculation, leaderboard management, and comprehensive statistics. You own the numbers.

**Depends on:** 🎯 Game Engine Agent (round data, league settings), 🎵 Music Services Agent (submission feed)
**Outputs consumed by:** 🎨 UI/UX Agent (results pages, leaderboard pages, stats dashboards)

#### Phase 11: Voting System (with Downvoting) ✅

- [x] #95: Create votes Drizzle table with points and vote_type fields, plus Zod schemas [Depends on: #79]
- [x] #96: Build voting UI based on league settings (rank N, 3-2-1 points, single pick) [Depends on: #88, #95, #27]
- [x] #97: Implement rank-based voting UI (drag to reorder top N) — touch-friendly for mobile [Depends on: #96]
- [x] #98: Implement points-based voting UI (assign 3-2-1 or custom points) [Depends on: #96]
- [x] #99: Implement single-pick voting UI (select one winner) [Depends on: #96]
- [x] #100: Build downvoting UI matching upvote configuration (if enabled in settings) [Depends on: #96]
- [x] #101: Implement rank-based downvoting (bottom N) [Depends on: #100]
- [x] #102: Implement points-based downvoting (assign negative points) [Depends on: #100]
- [x] #103: Implement single-pick downvoting (select one loser) [Depends on: #100]
- [x] #104: Implement vote submission API with one-vote-per-round validation [Depends on: #96]
- [x] #105: Implement self-vote/downvote prevention based on league settings [Depends on: #104]
- [x] #106: Implement voting deadline enforcement (reject after voting_end) [Depends on: #104, #50]
- [x] #107: Build "You voted" confirmation state and edit-vote flow [Depends on: #104]
- [x] #108: Create results calculation function (upvotes minus downvotes per submission) [Depends on: #95]
- [x] #109: Implement tie-breaking logic for results [Depends on: #108]

#### Phase 12: Results & Leaderboards ✅

- [x] #110: Create leaderboard_entries Drizzle table with season support [Depends on: #23, #37]
- [x] #111: Build results reveal page showing ranked submissions with net scores [Depends on: #108, #88]
- [x] #112: Show upvote/downvote breakdown on results (if downvoting enabled) [Depends on: #111]
- [x] #113: Reveal submitter identities on results page (if anonymous mode was on) [Depends on: #111, #89]
- [x] #114: Highlight round winner with visual distinction [Depends on: #111]
- [x] #115: Implement season leaderboard update function on round reveal [Depends on: #108, #110]
- [x] #116: Implement all-time league leaderboard update function [Depends on: #115]
- [x] #117: Build season leaderboard page showing current season standings [Depends on: #115]
- [x] #118: Build all-time league leaderboard page [Depends on: #116]
- [x] #119: Add win count, upvotes, downvotes, and points breakdown to leaderboard [Depends on: #117]
- [x] #120: Implement season leaderboard reset on season completion [Depends on: #117, #41]
- [x] #121: Add personal stats view (your submissions, votes received, rank history) [Depends on: #117]

#### Phase 13: Statistics & Analytics ✅

- [x] #122: Create user_statistics Drizzle table and Zod schemas [Depends on: #6, #7]
- [x] #123: Build statistics aggregation functions (league, season, user level) [Depends on: #122, #95]
- [x] #124: Implement league-wide statistics calculation [Depends on: #123]
- [x] #125: Build league statistics dashboard (total rounds, submissions, participation rate, etc.) [Depends on: #124]
- [x] #126: Implement season statistics calculation [Depends on: #123]
- [x] #127: Build season statistics page (rounds played, unique participants, avg votes, etc.) [Depends on: #126]
- [x] #128: Implement per-user statistics calculation [Depends on: #123]
- [x] #129: Build user statistics page (win rate, avg placement, voting patterns, etc.) [Depends on: #128]
- [x] #130: Add "most controversial" submission stat (high upvotes AND downvotes) [Depends on: #128]
- [x] #131: Track and display favorite genres per user (based on submissions) [Depends on: #128]
- [x] #132: Build comparative stats view (compare two users in same league) [Depends on: #129]
- [x] #133: Implement statistics export (CSV download) [Depends on: #125, #127, #129]
- [x] #134: Create statistics update triggers on round reveal [Depends on: #123, #115]

**🗳️ Voting & Scoring Agent Checkpoint** (After Task #134): All voting modes correct? Score calculation accurate with up/down? Leaderboards updating? Stats meaningful?

---

### 💬 Social Agent — Chat, Comments & Reactions

**Mission:** Build all social and communication features — in-app chat, WhatsApp integration, comment threads, emoji reactions, and event notifications to chat. You own the conversation layer.

**Depends on:** 🎯 Game Engine Agent (league/round data, membership), 🎵 Music Services Agent (submission feed for comments/reactions)
**Outputs consumed by:** 🎨 UI/UX Agent (chat UI polish, comment thread responsive design)

#### Phase 14: Chat & Communication ✅

- [x] #135: Create chat_groups and chat_messages Drizzle tables [Depends on: #22]
- [x] #136: Build in-app chat UI component (message list, input, timestamps) — mobile-optimized [Depends on: #135, #10]
- [x] #137: Implement real-time messaging with polling or WebSockets (Vercel can use polling) [Depends on: #136]
- [x] #138: Create chat message API routes with Zod validation [Depends on: #137]
- [x] #139: Auto-create league chat group on league creation [Depends on: #135, #26]
- [x] #140: Build chat access from league dashboard [Depends on: #139, #33]
- [x] #141: Research WhatsApp Business API requirements and setup [Depends on: #8]
- [x] #142: Implement WhatsApp group creation via API (if available) [Depends on: #141]
- [x] #143: Build WhatsApp group link generation as fallback [Depends on: #141]
- [x] #144: Add "Create WhatsApp Group" option in league settings [Depends on: #142, #143]
- [x] #145: Store WhatsApp group reference on league [Depends on: #144]
- [x] #146: Build notification hooks for key events (new round, voting open, results) to chat [Depends on: #140]

#### Phase 15: Comments & Reactions ✅

- [x] #147: Create comments Drizzle table and Zod schemas [Depends on: #79]
- [x] #148: Create reactions Drizzle table (user_id, submission_id, emoji) [Depends on: #79]
- [x] #149: Build comment thread UI under each submission [Depends on: #147, #88]
- [x] #150: Implement comment creation API with Zod validation [Depends on: #149]
- [x] #151: Implement comment deletion (own comments or admin moderation) [Depends on: #150]
- [x] #152: Build reaction picker UI (emoji selection) [Depends on: #148, #88]
- [x] #153: Implement reaction toggle API (add/remove) [Depends on: #152]
- [x] #154: Display reaction counts on submission cards [Depends on: #153]
- [x] #155: Implement comment hiding for moderators [Depends on: #151]

**💬 Social Agent Checkpoint** (After Task #155): Chat working reliably? WhatsApp integration functional (or graceful fallback)? Comments/reactions smooth?

---

### 🎨 UI/UX Agent — Responsive Design, Polish & Deployment

**Mission:** Ensure every page is responsive and optimized for mobile and desktop. Own loading states, error boundaries, empty states, accessibility, SEO, performance, and final deployment. You are the last line of defense for user experience quality.

**Depends on:** All other agents (all pages and components must exist before final polish)
**Note:** This agent also contributes shared UI components (skeleton screens, toast system, error boundaries) that other agents consume during development.

#### Phase 17: Polish & Deployment

**Responsive Design Pass (all pages):**
- [ ] #164: Audit and fix responsive design across all pages — ensure touch targets ≥44px, proper spacing on mobile, no horizontal scroll, readable typography at all breakpoints [Depends on: #121, #155]
- [ ] #164a: Mobile-specific fixes: bottom navigation bar, swipe gestures for voting, collapsible sections for dense content [Depends on: #164]
- [ ] #164b: Desktop-specific fixes: multi-column layouts for dashboards, hover states, keyboard navigation [Depends on: #164]
- [ ] #164c: Tablet breakpoint optimization (768px–1024px) [Depends on: #164]

**UX Polish:**
- [ ] #165: Add loading states and skeleton screens throughout (consistent skeleton components) [Depends on: #164]
- [ ] #166: Add error boundaries and user-friendly error messages [Depends on: #164]
- [ ] #167: Implement toast notifications for key actions [Depends on: #164]
- [ ] #168: Add empty states for leagues, rounds, submissions, chats (illustrated, with CTAs) [Depends on: #164]

**Performance & SEO:**
- [ ] #169: SEO optimization (meta tags, Open Graph for shared links — critical for league invite sharing) [Depends on: #164]
- [ ] #170: Performance audit and optimization (images via next/image, bundle splitting, lazy loading below-fold content) [Depends on: #169]

**Quality & Security:**
- [ ] #171: Security audit (auth flows, API route protection, Zod validation coverage, anonymous mode leak check) [Depends on: #170]
- [ ] #172: End-to-end testing of critical flows (auth, submit, vote, reveal, playlist) on mobile AND desktop viewports [Depends on: #171]
- [ ] #172a: Cross-browser testing (Chrome, Safari, Firefox — especially Safari on iOS for mobile) [Depends on: #172]

**Deployment:**
- [ ] #173: Production deployment to Vercel with custom domain [Depends on: #172]
- [ ] #174: Configure production environment variables and database [Depends on: #173]
- [ ] #175: Smoke test production deployment on real mobile device + desktop [Depends on: #174]

**🎨 UI/UX Agent Checkpoint** (After Task #175): App stable? Mobile experience polished? No security concerns? Playlists working in both services?

---

## Additional Completed Work (Not in Original Task List)

### Phase 7b: League-Scoped Analytics & Landing Page ✅ (Completed 2026-02-10)

This refactor was performed after Phase 6 to improve the app architecture:

- [x] Landing page: `/` is now a marketing page (hero, features, how-it-works, CTA) with auth-aware buttons
- [x] Navigation: hidden on landing page, only shows Leagues + Profile links; Header title links to `/`
- [x] UI enforces season selection in CreateRoundForm (seasonId already required in DB schema)
- [x] tRPC router: `analytics` (searchSubmissions, topArtists, topSongs, leagueOverview, myStats)
- [x] New pages: `/leagues/[id]/search`, `/leagues/[id]/analytics` (league-scoped)
- [x] New components: LeagueSearch, LeagueAnalytics, ProfileStats
- [x] Old `/search` and `/analytics` redirect to `/leagues`
- [x] Removed legacy files: spotify router, csvParser, formatters, types, hooks, SearchToggle, ArtistSearch/Table, SongSearch, TopArtists/TopSongs, CSV data file

---

## Progress Summary

| Phase | Agent | Status | Tasks |
|-------|-------|--------|-------|
| Phase 1: Project Setup | 🏗️ Foundation | ✅ Complete | #1–#10 |
| Phase 2: Auth & Profiles | 🏗️ Foundation | ✅ Complete | #11–#21 |
| Phase 3: League Management | 🎯 Game Engine | ✅ Complete | #22–#36 |
| Phase 4: Seasons | 🎯 Game Engine | ✅ Complete | #37–#44 |
| Phase 5: Round Management | 🎯 Game Engine | ✅ Complete | #45–#54 |
| Phase 6: AI Themes & Artwork | 🤖 AI | ✅ Complete | #55–#61 |
| Phase 7b: Analytics Refactor | — | ✅ Complete | (untracked) |
| Phase 7: Streaming Integration | 🎵 Music Services | ✅ Complete | #62–#69 |
| Phase 8: Playlist Generation | 🎵 Music Services | ✅ Complete | #70–#78 |
| Phase 9: Submissions | 🎵 Music Services | ✅ Complete (2026-02-10) | #79–#87 |
| Phase 10: Listening Experience | 🎵 Music Services | ✅ Complete (2026-02-10) | #88–#94 |
| Phase 11: Voting System | 🗳️ Voting & Scoring | ✅ Complete (2026-02-10) | #95–#109 |
| Phase 12: Results & Leaderboards | 🗳️ Voting & Scoring | ✅ Complete (2026-02-10) | #110–#121 |
| Phase 13: Statistics & Analytics | 🗳️ Voting & Scoring | ✅ Complete (2026-02-10) | #122–#134 |
| Phase 14: Chat & Communication | 💬 Social | ✅ Complete (2026-02-10) | #135–#146 |
| Phase 15: Comments & Reactions | 💬 Social | ✅ Complete (2026-02-10) | #147–#155 |
| Phase 16: Admin Utilities | 🎯 Game Engine | ✅ Complete (2026-02-10) | #156–#163 |
| Phase 17: Polish & Deployment | 🎨 UI/UX | ⬜ Not Started | #164–#175 |

**Overall: 163 of 175 tasks complete (93%)**

---

## Agent Execution Timeline

```
Week 1-2:   🏗️ Foundation Agent ✅ DONE
Week 2-3:   🎯 Game Engine  |  🎵 Music Services  |  🤖 AI Agent  ✅ AI DONE
Week 3-4:   🎯 Game Engine (rounds) ✅ DONE  |  🎵 Music Services (playlists + submissions)
Week 4-5:   🗳️ Voting & Scoring  |  💬 Social Agent  (parallel, after game engine)
Week 5-6:   🗳️ Voting (stats)  |  💬 Social (comments)  |  🎯 Game Engine (admin)
Week 6-7:   🎨 UI/UX Agent (polish pass, responsive audit, deployment)
```

## Review Checkpoints

### Checkpoint 1: Foundation Complete (After 🏗️ Foundation Agent) ✅

**Review questions:**
- Is authentication working reliably with all providers?
- Are streaming service tokens being stored and refreshed correctly?
- Are Drizzle migrations and Zod schemas working smoothly?
- Is the base layout responsive on mobile/desktop?

**Notes:** All complete. NextAuth v5 with Google, Spotify, Apple OAuth + Resend magic link. 16 Drizzle tables with Zod validators. Mobile nav with hamburger menu. Token refresh implemented.

### Checkpoint 2: Core Game Flow (After 🎯 Game Engine + 🎵 Music Services + 🤖 AI Agent)

**Review questions:**
- Can users create leagues with seasons smoothly?
- Is the season/round lifecycle intuitive?
- Are automatic status transitions reliable?
- Is metadata fetch reliable for both Spotify and Apple Music?
- Does the listening experience feel good on mobile?
- Are AI theme suggestions helpful and relevant?

**Notes:** Game Engine + AI complete. League/Season/Round lifecycle fully working. AI themes via GPT-4o-mini, artwork via DALL-E 3. Music Services Phase 7 (streaming integration) complete — Spotify/Apple Music track metadata, URL parsing, tRPC router, TrackPreview + OpenInProvider UI. Phases 8-10 (playlists, submissions, listening) still pending.

### Checkpoint 3: Scoring & Social (After 🗳️ Voting & 💬 Social Agent)

**Review questions:**
- Are all voting modes (including downvoting) working correctly?
- Is score calculation accurate with upvotes and downvotes?
- Are season and all-time leaderboards updating correctly?
- Are statistics accurate and meaningful?
- Is in-app chat working reliably?
- Is WhatsApp integration functional (or graceful fallback)?

**Notes:** {Pending}

### Checkpoint 4: Pre-Launch (After 🎨 UI/UX Agent)

**Review questions:**
- Is the application stable under realistic usage?
- Is the mobile experience polished (touch targets, navigation, readability)?
- Is the desktop experience taking advantage of larger screens?
- Are there any security concerns?
- Are playlists being created correctly in both services?
- Does the app pass cross-browser testing on Safari iOS?

**Notes:** {Pending}

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Spotify API rate limits | Medium | Implement caching for track metadata; batch playlist additions |
| Apple Music API complexity | Medium | Start with Spotify-only if needed; add Apple Music in fast-follow |
| Spotify/Apple playlist creation auth | High | Require re-auth with elevated scopes; clear error messaging |
| Deadline timezone confusion | Medium | Store all times in UTC; display in user's local timezone with clear labels |
| Anonymous mode leaks | High | Audit all API responses; never include user_id in submission endpoints during anonymous phase |
| Vote manipulation | High | Strict server-side validation via Zod; no client trust |
| Downvote abuse/toxicity | Medium | Make downvoting opt-in per league; allow admins to disable |
| AI generation costs | Medium | Implement rate limiting per league; cache suggestions |
| AI artwork quality | Low | Provide regenerate option; allow manual upload as fallback |
| WhatsApp API limitations | Medium | Provide shareable link as fallback if programmatic creation fails |
| Real-time chat scaling | Medium | Start with polling; migrate to WebSockets if needed |
| Scope creep | High | Strictly enforce Out of Scope list; defer nice-to-haves post-MVP |
| Agent coordination overhead | Medium | Clear ownership boundaries; human orchestrator resolves conflicts at checkpoints |
| Mobile Safari quirks | Medium | 🎨 UI/UX Agent does dedicated Safari iOS testing pass |
| Cross-agent API contract drift | Medium | Shared Zod schemas (owned by 🏗️ Foundation) serve as single source of truth |

## Revision History

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-27 | Initial plan created | — |
| 2026-01-27 | Added: Downvoting, Seasons, Statistics, Chat/WhatsApp, Playlists, AI themes/artwork. Changed ORM to Drizzle, added Zod schemas, integrated Vercel AI SDK | Feature expansion request |
| 2026-02-09 | Restructured plan around 7 agent teams. Added responsive/mobile optimization. Expanded Phase 17 sub-tasks. Consolidated to 4 review checkpoints | Agent team restructure + responsive design focus |
| 2026-02-09 | Phases 1-5 completed: Foundation, Auth, League Management, Seasons, Round Management all built and passing build/lint | Implementation progress |
| 2026-02-10 | Phase 6 completed: AI theme generation + artwork via Vercel AI SDK | Implementation progress |
| 2026-02-10 | Phase 7b refactor: League-scoped analytics, landing page, removed legacy code. Combined root PRD with docs/planning version into single document | Architecture refactor + doc consolidation |
| 2026-02-10 | Phase 7 completed: Streaming service integration — Spotify/Apple Music services, URL parser, unified facade, tRPC music router, TrackPreview/OpenInProvider UI, submission validator rewrite | Implementation progress |
| 2026-02-10 | Phase 8 completed: Playlist generation — Spotify/Apple Music playlist services, unified playlist facade, tRPC playlist router, auto-generation on round reveal, PlaylistLinks UI in RoundDetail | Implementation progress |
| 2026-02-10 | v1.9 | Phase 9 complete — Submission CRUD, URL paste with track preview, deadline enforcement, edit/delete |
| 2026-02-10 | v1.10 | Phase 10 complete — Submission feed, anonymous mode, shuffle, now-playing indicator, AudioPlayerContext |
| 2026-02-10 | v1.11 | Phase 11 complete — Voting system with 3 modes (single pick, points, rank) + downvoting, VotingPanel/ResultsView UI, results calculation, auto-leaderboard update |
| 2026-02-10 | v1.12 | Phase 12 complete — All-time leaderboard upserts, dedicated /leaderboards page with season/all-time tabs, PersonalStats component, Final Standings badge, getPersonalStats query |
| 2026-02-10 | v1.16 | Phase 16 complete — Admin utilities: moderation_log DB table, ban/unban mutations, moderation logging on kick/role_change, ModerationLog timeline, AdminPanel tabs on settings page |
