# AGENTS.md — Ganesh Festival Live Quiz

Permanent engineering rules for Cursor/AI agents working on this repository.

## Project

Ganesh Festival Live Quiz

One-time company event application for approximately 120–130 concurrent participants.

Tech stack:

* React Router v8 Framework Mode
* React 19
* TypeScript
* Tailwind CSS v4
* Supabase Postgres
* Supabase Realtime
* Supabase Storage
* Supabase Auth for Admin/Host only
* dnd-kit for reorder/drag interactions
* Vercel deployment

Do not convert this repository to plain Vite or JavaScript.

## Architecture

There are exactly three application surfaces:

1. Admin
2. Host
3. Participant

Admin and Host share Supabase email/password authentication.

Participants do NOT use Supabase authentication.

Participants join using:

* game PIN
* display name
* `join_game` RPC

Player identity must use the server-issued player UUID, never display name.

Duplicate display names are allowed.

Store `{ player_id, player_token, game_id }` in `sessionStorage` (or `localStorage`) for reconnect recovery. Display name is cosmetic only. Never put `player_token` in URLs, logs, or UI.

## Supported question types

Use these exact values everywhere:

* `single_choice`
* `multi_select`
* `image_choice`
* `pin_image`
* `order`

Do not introduce alternate names such as:

* single
* multi
* drag_order

## Game State

The authoritative live game state lives in `games`.

Valid phases:

* lobby
* question
* answer_reveal
* leaderboard
* finished

`current_question_id` is the authoritative current question.

Host controls all transitions.

Participants cannot:

* start questions
* reveal answers
* change phases
* advance questions
* modify game state

## Realtime

Participants subscribe only to the relevant `games` row.

Realtime is used for:

* status/phase changes
* current_question_id changes
* question_started_at changes

Do NOT:

* broadcast countdown ticks
* subscribe participants to answers
* broadcast every answer
* create multiple realtime subscriptions for the same session

Hooks must clean up subscriptions on unmount.

Avoid duplicate subscriptions caused by React Strict Mode.

Host answer count should use polling through an RPC every approximately 2–3 seconds while a question is active.

Be conscious of Supabase Free Realtime limits (≈200 concurrent connections, ≈100 messages/sec). Prefer one channel per client and avoid chatty event sources.

## Timers

`question_started_at` from the database is authoritative.

Client countdown is derived from:

```
remaining = duration - (Date.now() - questionStartedAt)
```

Do not implement countdown by decrementing a server-controlled number every second.

On tab/background resume, recompute from timestamp immediately.

The `submit_answer` RPC must also reject late submissions server-side.

## Scoring and security

Client-side scoring is NEVER authoritative.

Participant clients must never submit:

* is_correct
* points_earned
* total_score

Participants submit only:

* session/game ID
* player ID
* question ID
* answer payload
* player token if player-token support exists

`submit_answer` Postgres RPC is responsible for:

* validating player/session
* validating active question
* validating active game phase
* rejecting duplicates
* validating answer payload
* determining correctness
* calculating response time
* calculating points
* inserting the answer
* atomically updating total_score

Never trust values coming from participant browsers.

If a client-side `scoring-display` (or similar) module exists, it may contain UI helpers and shared types only — never the source of truth for awarded points.

## Answer keys

Correct answer data must never be returned to participants during the `question` phase.

Admin/Host may access the full question including `answer_config`.

Participants obtain questions only through sanitized RPCs such as:

* `get_active_question`

Participants obtain correct-answer information only after reveal through:

* `get_question_reveal`

Do not fetch the complete `questions` table directly from participant UI.

Do not add `is_correct` to `question_options`.

## Supabase

Client code may use only:

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_PUBLISHABLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is server-only.

Never:

* prefix service role key with `VITE_`
* expose it to browser code
* commit secrets

Admin authorization is based on the `admins` table and RLS.

Do not use environment-variable email allowlists for authorization.

All participant table writes should happen through carefully scoped SECURITY DEFINER RPCs.

Direct anonymous INSERT/UPDATE on players and answers should remain blocked by RLS.

## Images

Use Supabase Storage bucket:

`quiz-images`

Participant image reads may be public.

Uploads/modifications are Admin-only.

Do not save base64 image data in Postgres.

Validate upload:

* MIME type
* reasonable maximum file size

## pin_image

Coordinates must always be normalized 0–1 values.

Correct answer shape:

```json
{
  "correctArea": {
    "x": 0.40,
    "y": 0.55,
    "width": 0.18,
    "height": 0.15
  }
}
```

Participant answer:

```json
{
  "x": 0.46,
  "y": 0.63
}
```

Do not use browser-screen pixel coordinates for persisted answers.

Coordinates must be relative to actual image bounds (the displayed image content), not the viewport or padded container.

## order questions

Use dnd-kit.

Persist stable item UUIDs/IDs.

Correctness compares item IDs, not visible labels.

Do not reshuffle items after the participant has started interacting.

## React/code style

* Prefer focused components.
* Keep question-type-specific UI isolated.
* Avoid giant components.
* Reuse existing components when sensible.
* Avoid premature abstractions.
* Avoid Redux unless explicitly requested.
* Do not add a custom Express/Node backend.
* Do not add Spring Boot.
* Keep Supabase access in dedicated services/hooks where practical.
* Prefer explicit readable code over clever abstractions.
* Keep TypeScript types accurate.
* Do not use `any` to silence problems unless there is a documented reason.
* Do not rewrite unrelated working code.

Before modifying files:

1. inspect nearby implementation
2. understand existing conventions
3. make the smallest coherent change

After implementing a feature:

1. run TypeScript/typecheck if configured
2. run lint if configured
3. run production build
4. fix errors caused by the change
5. summarize files changed and remaining issues

## UX

Participant:

* mobile-first
* large touch targets
* clear timer
* simple answer interaction
* clear locked-in state
* tolerate reconnects

Host:

* desktop/projector friendly
* large game PIN
* obvious game controls
* prevent accidental duplicate actions
* disable buttons while transitions are pending

Admin:

* desktop-friendly
* functional over fancy
* prioritize fast question creation/editing

## Scope

MVP includes:

* Admin authentication
* Quiz CRUD
* Question CRUD
* Question reorder
* Image upload
* Game creation
* PIN join
* Waiting room
* Host-controlled live gameplay
* five supported question types
* server-authoritative scoring
* timer
* reveal
* leaderboard
* final ranking
* participant reconnect

Out of scope:

* organizations
* user profiles
* payments
* emails
* analytics dashboard
* complex RBAC
* generic form builder
* social sharing
* reusable SaaS platform features
* participant accounts
* Supabase anonymous auth

## Deadline rule

This application is for an event tomorrow.

Reliability is more important than adding features.

When there is a tradeoff:

1. preserve joining
2. preserve live synchronization
3. preserve answer submission
4. preserve scoring
5. preserve leaderboard
6. only then add visual polish

Do not expand scope without an explicit request.

## Agent workflow

* Follow the approved architecture plan; do not invent parallel designs.
* Do not edit the plan file unless the user asks.
* Mark existing todos in progress/completed as work proceeds; do not recreate them.
* Prefer incremental delivery that keeps join → sync → submit → score → leaderboard working end-to-end before polishing question types or visuals.
