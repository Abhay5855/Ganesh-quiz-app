-- =============================================================================
-- Ganesh Festival Live Quiz — Supabase schema
-- =============================================================================
-- HOW TO APPLY (manual — do not auto-apply from CI/agent without review):
--
-- 1. Create a Supabase project (or use an existing one).
-- 2. Open: Supabase Dashboard → SQL Editor → New query.
-- 3. Paste this entire file and Run.
-- 4. Enable Realtime for `games` (and optionally `players` for host roster):
--      Dashboard → Database → Replication → add `games` (and `players` if desired).
--      Or rely on the `alter publication` statements at the bottom of this file.
-- 5. Auth → create Admin user (email/password).
-- 6. Insert admin row:
--      insert into public.admins (user_id)
--      values ('<auth.users.id of admin>');
-- 7. Confirm Storage bucket `quiz-images` exists (created below).
-- 8. App env (browser): VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY only.
--    Server-only if needed later: SUPABASE_SERVICE_ROLE_KEY (never VITE_*).
--
-- Naming note vs AGENTS.md:
--   This schema uses `games` (not `game_sessions`) and phase `answer_reveal`
--   (not `reveal`) as specified for this migration. Keep app code aligned.
--
-- pin_image coordinates:
--   Normalized 0–1 only relative to image content. No 0–100 conversion.
--   Example: { "x": 0.40, "y": 0.50, "width": 0.20, "height": 0.15 }
--
-- Max players per game: 150 (enforced in join_game under row lock).
-- Participant auth: player_token (returned once); only SHA-256 hash stored.
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type public.quiz_status as enum ('draft', 'published', 'archived');

create type public.question_type as enum (
  'single_choice',
  'multi_select',
  'image_choice',
  'pin_image',
  'order'
);

-- High-level game lifecycle (distinct from live phase)
create type public.game_status as enum ('active', 'finished');

-- Host-controlled live phase
create type public.game_phase as enum (
  'lobby',
  'question',
  'answer_reveal',
  'leaderboard',
  'finished'
);

-- -----------------------------------------------------------------------------
-- Admins (authorization source of truth — not env email allowlists)
-- -----------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Users allowed to administer quizzes and host live games. Checked via is_admin().';

-- -----------------------------------------------------------------------------
-- Quizzes
-- -----------------------------------------------------------------------------

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.quiz_status not null default 'draft',
  created_at timestamptz not null default now(),

  constraint quizzes_title_not_blank check (char_length(trim(title)) > 0)
);

create index quizzes_status_idx on public.quizzes (status);
create index quizzes_created_at_idx on public.quizzes (created_at desc);

-- -----------------------------------------------------------------------------
-- Questions
-- Options / correct answers live in config_json (no separate options table).
--
-- config_json examples:
--
-- single_choice:
-- {
--   "options": [
--     {"id":"a","text":"Modak"},
--     {"id":"b","text":"Ladoo"}
--   ],
--   "correctAnswer":"a"
-- }
--
-- multi_select:
-- {
--   "options": [...],
--   "correctAnswers":["a","c"]
-- }
--
-- image_choice:
-- {
--   "options":[
--     {"id":"a","imageUrl":"..."},
--     {"id":"b","imageUrl":"..."}
--   ],
--   "correctAnswer":"b"
-- }
--
-- pin_image (normalized 0–1 only):
-- {
--   "imageUrl":"...",
--   "correctArea":{"x":0.40,"y":0.50,"width":0.20,"height":0.15}
-- }
--
-- order:
-- {
--   "items":[
--     {"id":"a","text":"Ganesh Sthapana"},
--     {"id":"b","text":"Aarti"},
--     {"id":"c","text":"Visarjan"}
--   ],
--   "correctOrder":["a","b","c"]
-- }
-- -----------------------------------------------------------------------------

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null
    references public.quizzes (id) on delete cascade,
  type public.question_type not null,
  question_text text not null,
  media_url text,
  config_json jsonb not null default '{}'::jsonb,
  time_limit_seconds integer not null default 30,
  points integer not null default 1000,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint questions_text_not_blank check (char_length(trim(question_text)) > 0),
  constraint questions_time_limit_range check (
    time_limit_seconds >= 5 and time_limit_seconds <= 120
  ),
  constraint questions_points_nonnegative check (points >= 0),
  constraint questions_position_nonnegative check (position >= 0)
);

create index questions_quiz_id_idx on public.questions (quiz_id);
create index questions_quiz_position_idx on public.questions (quiz_id, position);
create index questions_type_idx on public.questions (type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger questions_set_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Games (one live row drives Realtime for all participants)
-- -----------------------------------------------------------------------------

create table public.games (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null
    references public.quizzes (id) on delete restrict,
  game_code text not null,
  status public.game_status not null default 'active',
  current_question_id uuid
    references public.questions (id) on delete set null,
  phase public.game_phase not null default 'lobby',
  question_started_at timestamptz,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  host_user_id uuid
    references auth.users (id) on delete set null,

  constraint games_code_format check (game_code ~ '^[0-9]{6}$'),
  constraint games_finished_consistency check (
    (status = 'finished' and finished_at is not null and phase = 'finished')
    or (status = 'active' and finished_at is null)
  )
);

create unique index games_game_code_unique on public.games (game_code);
create index games_quiz_id_idx on public.games (quiz_id);
create index games_status_phase_idx on public.games (status, phase);
create index games_host_user_id_idx on public.games (host_user_id);
create index games_created_at_idx on public.games (created_at desc);

-- -----------------------------------------------------------------------------
-- Players (identity = id UUID; display_name is cosmetic; duplicates allowed)
-- Ownership = player_token (raw returned once from join_game; only hash stored)
-- -----------------------------------------------------------------------------

create table public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null
    references public.games (id) on delete cascade,
  display_name text not null,
  player_token_hash text not null,
  score integer not null default 0,
  joined_at timestamptz not null default now(),

  constraint players_display_name_not_blank check (char_length(trim(display_name)) > 0),
  constraint players_score_nonnegative check (score >= 0),
  constraint players_token_hash_not_blank check (char_length(player_token_hash) > 0)
);

-- No UNIQUE(game_id, display_name) — duplicates allowed by design.
create index players_game_id_idx on public.players (game_id);
create index players_game_score_idx on public.players (game_id, score desc);
create index players_joined_at_idx on public.players (game_id, joined_at);

-- -----------------------------------------------------------------------------
-- Answers (scoring fields written only by SECURITY DEFINER RPCs)
-- -----------------------------------------------------------------------------

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null
    references public.games (id) on delete cascade,
  player_id uuid not null
    references public.players (id) on delete cascade,
  question_id uuid not null
    references public.questions (id) on delete cascade,
  answer_json jsonb not null,
  is_correct boolean not null,
  response_time_ms integer not null,
  points_awarded integer not null default 0,
  submitted_at timestamptz not null default now(),

  constraint answers_response_time_nonnegative check (response_time_ms >= 0),
  constraint answers_points_nonnegative check (points_awarded >= 0),
  constraint answers_one_per_player_question unique (player_id, question_id)
);

create index answers_game_id_idx on public.answers (game_id);
create index answers_question_id_idx on public.answers (question_id);
create index answers_game_question_idx on public.answers (game_id, question_id);
create index answers_player_id_idx on public.answers (player_id);
create index answers_fastest_correct_idx
  on public.answers (game_id, question_id, response_time_ms, submitted_at)
  where is_correct = true;

-- -----------------------------------------------------------------------------
-- Auth helpers + player token helpers
-- -----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.hash_player_token(p_token text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select encode(
    extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'),
    'hex'
  );
$$;

revoke all on function public.hash_player_token(text) from public;

create or replace function public.verify_player(
  p_game_id uuid,
  p_player_id uuid,
  p_player_token text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  if p_game_id is null or p_player_id is null
     or p_player_token is null or char_length(p_player_token) < 16 then
    return false;
  end if;

  select p.player_token_hash into v_hash
  from public.players p
  where p.id = p_player_id and p.game_id = p_game_id;

  if not found then
    return false;
  end if;

  return v_hash = public.hash_player_token(p_player_token);
end;
$$;

revoke all on function public.verify_player(uuid, uuid, text) from public;

create or replace function public.require_player(
  p_game_id uuid,
  p_player_id uuid,
  p_player_token text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.verify_player(p_game_id, p_player_id, p_player_token) then
    raise exception 'Unauthorized player';
  end if;
end;
$$;

revoke all on function public.require_player(uuid, uuid, text) from public;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.answers enable row level security;

-- admins
create policy "admins_select_self_or_admin"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "admins_insert_admin_only"
  on public.admins for insert
  to authenticated
  with check (public.is_admin());

create policy "admins_delete_admin_only"
  on public.admins for delete
  to authenticated
  using (public.is_admin());

-- quizzes: admin full access; participants cannot read full quiz bank
create policy "quizzes_admin_all"
  on public.quizzes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- questions: admin full access; participants never SELECT this table directly
create policy "questions_admin_all"
  on public.questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- games:
--   Admin/host: full CRUD
--   Public: SELECT only (Realtime phase / current_question_id / question_started_at)
create policy "games_admin_all"
  on public.games for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "games_public_select"
  on public.games for select
  to anon, authenticated
  using (true);

-- players:
--   Admin/Host only (roster Realtime via authenticated client)
--   No anon SELECT — leaderboard via get_leaderboard RPC only
create policy "players_admin_all"
  on public.players for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- answers: Admin only; participants use submit_answer / get_question_reveal RPCs
create policy "answers_admin_all"
  on public.answers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Intentionally no anon INSERT/UPDATE/SELECT on players or answers.

-- -----------------------------------------------------------------------------
-- Scoring / validation helpers (internal — not granted to anon)
-- -----------------------------------------------------------------------------

create or replace function public.validate_answer_payload(
  p_type public.question_type,
  p_config jsonb,
  p_answer jsonb
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_option_id text;
  v_option_ids text[];
  v_valid_ids text[];
  v_item_ids text[];
  v_order_ids text[];
  v_x numeric;
  v_y numeric;
  v_ax numeric;
  v_ay numeric;
  v_aw numeric;
  v_ah numeric;
  v_area jsonb;
begin
  if p_answer is null or jsonb_typeof(p_answer) <> 'object' then
    raise exception 'Invalid answer payload';
  end if;

  case p_type
    when 'single_choice', 'image_choice' then
      v_option_id := p_answer->>'optionId';
      if v_option_id is null or char_length(v_option_id) = 0 then
        raise exception 'Invalid answer payload';
      end if;

      select coalesce(array_agg(o->>'id'), '{}')
        into v_valid_ids
      from jsonb_array_elements(coalesce(p_config->'options', '[]'::jsonb)) o;

      if not (v_option_id = any (v_valid_ids)) then
        raise exception 'Invalid answer payload';
      end if;

    when 'multi_select' then
      if jsonb_typeof(p_answer->'optionIds') is distinct from 'array' then
        raise exception 'Invalid answer payload';
      end if;

      select coalesce(array_agg(x), '{}')
        into v_option_ids
      from jsonb_array_elements_text(p_answer->'optionIds') as t(x);

      if coalesce(cardinality(v_option_ids), 0) = 0 then
        raise exception 'Invalid answer payload';
      end if;

      if cardinality(v_option_ids) <> (
        select count(distinct x) from unnest(v_option_ids) as u(x)
      ) then
        raise exception 'Invalid answer payload';
      end if;

      select coalesce(array_agg(o->>'id'), '{}')
        into v_valid_ids
      from jsonb_array_elements(coalesce(p_config->'options', '[]'::jsonb)) o;

      if exists (
        select 1 from unnest(v_option_ids) as u(x)
        where not (x = any (v_valid_ids))
      ) then
        raise exception 'Invalid answer payload';
      end if;

    when 'order' then
      if jsonb_typeof(p_answer->'order') is distinct from 'array' then
        raise exception 'Invalid answer payload';
      end if;

      select coalesce(array_agg(x order by ord), '{}')
        into v_order_ids
      from jsonb_array_elements_text(p_answer->'order') with ordinality as t(x, ord);

      select coalesce(array_agg(i->>'id' order by ord), '{}')
        into v_item_ids
      from jsonb_array_elements(coalesce(p_config->'items', '[]'::jsonb))
        with ordinality as t(i, ord);

      if cardinality(v_order_ids) <> cardinality(v_item_ids)
         or cardinality(v_order_ids) = 0 then
        raise exception 'Invalid answer payload';
      end if;

      if cardinality(v_order_ids) <> (
        select count(distinct x) from unnest(v_order_ids) as u(x)
      ) then
        raise exception 'Invalid answer payload';
      end if;

      if exists (
        select 1 from unnest(v_order_ids) as u(x)
        where not (x = any (v_item_ids))
      ) then
        raise exception 'Invalid answer payload';
      end if;

      if exists (
        select 1 from unnest(v_item_ids) as u(x)
        where not (x = any (v_order_ids))
      ) then
        raise exception 'Invalid answer payload';
      end if;

    when 'pin_image' then
      begin
        v_x := (p_answer->>'x')::numeric;
        v_y := (p_answer->>'y')::numeric;
      exception when others then
        raise exception 'Invalid answer payload';
      end;

      if v_x is null or v_y is null
         or v_x < 0 or v_x > 1 or v_y < 0 or v_y > 1 then
        raise exception 'Invalid answer payload';
      end if;

      v_area := p_config->'correctArea';
      begin
        v_ax := (v_area->>'x')::numeric;
        v_ay := (v_area->>'y')::numeric;
        v_aw := (v_area->>'width')::numeric;
        v_ah := (v_area->>'height')::numeric;
      exception when others then
        raise exception 'Invalid answer payload';
      end;

      if v_ax is null or v_ay is null or v_aw is null or v_ah is null
         or v_ax < 0 or v_ax > 1 or v_ay < 0 or v_ay > 1
         or v_aw <= 0 or v_aw > 1 or v_ah <= 0 or v_ah > 1
         or (v_ax + v_aw) > 1 or (v_ay + v_ah) > 1 then
        raise exception 'Invalid answer payload';
      end if;

    else
      raise exception 'Invalid answer payload';
  end case;
end;
$$;

revoke all on function public.validate_answer_payload(
  public.question_type, jsonb, jsonb
) from public;

create or replace function public.evaluate_answer(
  p_type public.question_type,
  p_config jsonb,
  p_answer jsonb
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_correct boolean := false;
  v_area jsonb;
  v_x numeric;
  v_y numeric;
  v_ax numeric;
  v_ay numeric;
  v_aw numeric;
  v_ah numeric;
  v_submitted text[];
  v_expected text[];
begin
  case p_type
    when 'single_choice', 'image_choice' then
      v_correct := (p_answer->>'optionId') = (p_config->>'correctAnswer');

    when 'multi_select' then
      select coalesce(array_agg(x order by x), '{}')
        into v_submitted
      from jsonb_array_elements_text(coalesce(p_answer->'optionIds', '[]'::jsonb)) as t(x);

      select coalesce(array_agg(x order by x), '{}')
        into v_expected
      from jsonb_array_elements_text(coalesce(p_config->'correctAnswers', '[]'::jsonb)) as t(x);

      v_correct := v_submitted = v_expected;

    when 'pin_image' then
      v_area := p_config->'correctArea';
      v_x := (p_answer->>'x')::numeric;
      v_y := (p_answer->>'y')::numeric;
      v_ax := (v_area->>'x')::numeric;
      v_ay := (v_area->>'y')::numeric;
      v_aw := (v_area->>'width')::numeric;
      v_ah := (v_area->>'height')::numeric;

      v_correct :=
        v_x >= v_ax and v_x <= (v_ax + v_aw)
        and v_y >= v_ay and v_y <= (v_ay + v_ah);

    when 'order' then
      select coalesce(array_agg(x), '{}')
        into v_submitted
      from (
        select x
        from jsonb_array_elements_text(coalesce(p_answer->'order', '[]'::jsonb))
          with ordinality as t(x, ord)
        order by ord
      ) s;

      select coalesce(array_agg(x), '{}')
        into v_expected
      from (
        select x
        from jsonb_array_elements_text(coalesce(p_config->'correctOrder', '[]'::jsonb))
          with ordinality as t(x, ord)
        order by ord
      ) s;

      v_correct := v_submitted = v_expected;

    else
      v_correct := false;
  end case;

  return coalesce(v_correct, false);
end;
$$;

revoke all on function public.evaluate_answer(
  public.question_type, jsonb, jsonb
) from public;

-- Linear speed bonus: instant correct → 100% of question points;
-- at the time limit → 50%. Wrong answers always 0. Never exceeds p_base_points.
create or replace function public.compute_points(
  p_base_points integer,
  p_is_correct boolean,
  p_response_time_ms integer,
  p_time_limit_seconds integer
)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_timer_ms numeric;
  v_ratio numeric;
begin
  if not p_is_correct then
    return 0;
  end if;

  v_timer_ms := greatest(p_time_limit_seconds, 1) * 1000.0;
  v_ratio := greatest(
    0.5,
    1.0 - (least(greatest(p_response_time_ms, 0), v_timer_ms)::numeric / v_timer_ms) * 0.5
  );
  return least(
    p_base_points,
    floor(p_base_points * v_ratio)::integer
  );
end;
$$;

revoke all on function public.compute_points(integer, boolean, integer, integer) from public;

-- -----------------------------------------------------------------------------
-- RPC: join_game
-- -----------------------------------------------------------------------------

create or replace function public.join_game(
  p_game_code text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_player public.players%rowtype;
  v_token text;
  v_count integer;
begin
  if p_game_code is null or p_game_code !~ '^[0-9]{6}$' then
    raise exception 'Invalid game code';
  end if;

  if p_display_name is null or char_length(trim(p_display_name)) < 1 then
    raise exception 'Display name required';
  end if;

  if char_length(trim(p_display_name)) > 40 then
    raise exception 'Display name too long';
  end if;

  select * into v_game
  from public.games g
  where g.game_code = p_game_code
    and g.status = 'active'
  for update;

  if not found then
    raise exception 'Game not found';
  end if;

  if v_game.phase <> 'lobby' then
    raise exception 'Game is not accepting new players';
  end if;

  select count(*)::integer into v_count
  from public.players p
  where p.game_id = v_game.id;

  if v_count >= 150 then
    raise exception 'Game is full';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.players (game_id, display_name, player_token_hash)
  values (
    v_game.id,
    trim(p_display_name),
    public.hash_player_token(v_token)
  )
  returning * into v_player;

  return jsonb_build_object(
    'player_id', v_player.id,
    'player_token', v_token,
    'game_id', v_game.id,
    'display_name', v_player.display_name
  );
end;
$$;

revoke all on function public.join_game(text, text) from public;
grant execute on function public.join_game(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_player_state (reconnect)
-- -----------------------------------------------------------------------------

create or replace function public.get_player_state(
  p_game_id uuid,
  p_player_id uuid,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players%rowtype;
  v_game public.games%rowtype;
  v_answered uuid[];
begin
  perform public.require_player(p_game_id, p_player_id, p_player_token);

  select * into v_player
  from public.players
  where id = p_player_id and game_id = p_game_id;

  select * into v_game from public.games where id = p_game_id;

  select coalesce(array_agg(a.question_id), '{}')
    into v_answered
  from public.answers a
  where a.player_id = p_player_id and a.game_id = p_game_id;

  return jsonb_build_object(
    'player_id', v_player.id,
    'game_id', v_game.id,
    'display_name', v_player.display_name,
    'score',
    case
      when v_game.phase in ('answer_reveal', 'leaderboard', 'finished')
        then v_player.score
      else null
    end,
    'phase', v_game.phase,
    'status', v_game.status,
    'current_question_id', v_game.current_question_id,
    'question_started_at', v_game.question_started_at,
    'answered_question_ids', to_jsonb(v_answered)
  );
end;
$$;

revoke all on function public.get_player_state(uuid, uuid, text) from public;
grant execute on function public.get_player_state(uuid, uuid, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_active_question (NO correct-answer fields)
-- -----------------------------------------------------------------------------

create or replace function public.get_active_question(
  p_game_id uuid,
  p_player_id uuid,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_q public.questions%rowtype;
  v_config jsonb;
  v_options jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_already boolean;
  v_question_number integer;
  v_question_count integer;
begin
  perform public.require_player(p_game_id, p_player_id, p_player_token);

  select * into v_game from public.games where id = p_game_id;
  if not found then
    raise exception 'Game not found';
  end if;

  if v_game.phase <> 'question' or v_game.current_question_id is null then
    raise exception 'No active question';
  end if;

  select * into v_q from public.questions where id = v_game.current_question_id;
  if not found then
    raise exception 'Question not found';
  end if;

  select q.n, q.total
  into v_question_number, v_question_count
  from (
    select
      id,
      row_number() over (order by position, created_at, id) as n,
      count(*) over () as total
    from public.questions
    where quiz_id = v_q.quiz_id
  ) q
  where q.id = v_q.id;

  select exists (
    select 1 from public.answers a
    where a.player_id = p_player_id and a.question_id = v_q.id
  ) into v_already;

  v_config := coalesce(v_q.config_json, '{}'::jsonb);

  if v_q.type in ('single_choice', 'multi_select') then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', o->>'id', 'text', o->>'text')
      order by (o->>'id')
    ), '[]'::jsonb)
    into v_options
    from jsonb_array_elements(coalesce(v_config->'options', '[]'::jsonb)) o;

  elsif v_q.type = 'image_choice' then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', o->>'id', 'imageUrl', o->>'imageUrl')
      order by (o->>'id')
    ), '[]'::jsonb)
    into v_options
    from jsonb_array_elements(coalesce(v_config->'options', '[]'::jsonb)) o;

  elsif v_q.type = 'order' then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', i->>'id', 'text', i->>'text')
      order by md5(p_game_id::text || v_q.id::text || (i->>'id'))
    ), '[]'::jsonb)
    into v_items
    from jsonb_array_elements(coalesce(v_config->'items', '[]'::jsonb)) i;
  end if;

  return jsonb_build_object(
    'id', v_q.id,
    'type', v_q.type,
    'question_text', v_q.question_text,
    'media_url', v_q.media_url,
    'time_limit_seconds', v_q.time_limit_seconds,
    'points', v_q.points,
    'question_started_at', v_game.question_started_at,
    'question_number', v_question_number,
    'question_count', v_question_count,
    'already_answered', v_already,
    'options', v_options,
    'items', v_items,
    'image_url', case
      when v_q.type = 'pin_image' then coalesce(v_q.media_url, v_config->>'imageUrl')
      else null
    end
  );
end;
$$;

revoke all on function public.get_active_question(uuid, uuid, text) from public;
grant execute on function public.get_active_question(uuid, uuid, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: submit_answer — no points/is_correct in response
-- -----------------------------------------------------------------------------

create or replace function public.submit_answer(
  p_game_id uuid,
  p_player_id uuid,
  p_player_token text,
  p_question_id uuid,
  p_answer_json jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_player public.players%rowtype;
  v_q public.questions%rowtype;
  v_is_correct boolean;
  v_response_ms integer;
  v_points integer;
  v_timer_ms integer;
begin
  perform public.require_player(p_game_id, p_player_id, p_player_token);

  select * into v_player
  from public.players
  where id = p_player_id and game_id = p_game_id
  for update;

  if not found then
    raise exception 'Player not found';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id
  for share;

  if not found then
    raise exception 'Game not found';
  end if;

  if v_game.status <> 'active' or v_game.phase <> 'question' then
    raise exception 'Game is not accepting answers';
  end if;

  if v_game.current_question_id is distinct from p_question_id then
    raise exception 'Question is not active';
  end if;

  if v_game.question_started_at is null then
    raise exception 'Question timer not started';
  end if;

  select * into v_q from public.questions where id = p_question_id;
  if not found then
    raise exception 'Question not found';
  end if;

  if exists (
    select 1 from public.answers a
    where a.player_id = p_player_id and a.question_id = p_question_id
  ) then
    raise exception 'Already answered';
  end if;

  v_response_ms := greatest(
    0,
    floor(extract(epoch from (now() - v_game.question_started_at)) * 1000)::integer
  );

  v_timer_ms := v_q.time_limit_seconds * 1000;
  if v_response_ms > (v_timer_ms + 2000) then
    raise exception 'Time expired';
  end if;

  p_answer_json := p_answer_json
    - 'is_correct'
    - 'points_awarded'
    - 'points_earned'
    - 'score'
    - 'total_score';

  perform public.validate_answer_payload(v_q.type, v_q.config_json, p_answer_json);

  v_is_correct := public.evaluate_answer(v_q.type, v_q.config_json, p_answer_json);
  v_points := public.compute_points(
    v_q.points,
    v_is_correct,
    least(v_response_ms, v_timer_ms),
    v_q.time_limit_seconds
  );

  insert into public.answers (
    game_id,
    player_id,
    question_id,
    answer_json,
    is_correct,
    response_time_ms,
    points_awarded
  )
  values (
    p_game_id,
    p_player_id,
    p_question_id,
    p_answer_json,
    v_is_correct,
    v_response_ms,
    v_points
  );

  update public.players
  set score = score + v_points
  where id = p_player_id;

  return jsonb_build_object(
    'accepted', true,
    'already_answered', true
  );
end;
$$;

revoke all on function public.submit_answer(uuid, uuid, text, uuid, jsonb) from public;
grant execute on function public.submit_answer(uuid, uuid, text, uuid, jsonb)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_question_reveal
-- -----------------------------------------------------------------------------

create or replace function public.get_question_reveal(
  p_game_id uuid,
  p_player_id uuid,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_q public.questions%rowtype;
  v_answer public.answers%rowtype;
  v_correct jsonb;
  v_config jsonb;
  v_options jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
begin
  perform public.require_player(p_game_id, p_player_id, p_player_token);

  select * into v_game from public.games where id = p_game_id;
  if not found then
    raise exception 'Game not found';
  end if;

  if v_game.phase not in ('answer_reveal', 'leaderboard', 'finished') then
    raise exception 'Reveal not available';
  end if;

  if v_game.current_question_id is null then
    raise exception 'No current question';
  end if;

  select * into v_q from public.questions where id = v_game.current_question_id;

  select * into v_answer
  from public.answers
  where player_id = p_player_id and question_id = v_q.id;

  v_config := coalesce(v_q.config_json, '{}'::jsonb);

  if v_q.type in ('single_choice', 'multi_select') then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', o->>'id', 'text', o->>'text')
      order by (o->>'id')
    ), '[]'::jsonb)
    into v_options
    from jsonb_array_elements(coalesce(v_config->'options', '[]'::jsonb)) o;

  elsif v_q.type = 'image_choice' then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', o->>'id', 'imageUrl', o->>'imageUrl')
      order by (o->>'id')
    ), '[]'::jsonb)
    into v_options
    from jsonb_array_elements(coalesce(v_config->'options', '[]'::jsonb)) o;

  elsif v_q.type = 'order' then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', i->>'id', 'text', i->>'text')
      order by (i->>'id')
    ), '[]'::jsonb)
    into v_items
    from jsonb_array_elements(coalesce(v_config->'items', '[]'::jsonb)) i;
  end if;

  case v_q.type
    when 'single_choice', 'image_choice' then
      v_correct := jsonb_build_object('correctAnswer', v_q.config_json->>'correctAnswer');
    when 'multi_select' then
      v_correct := jsonb_build_object('correctAnswers', v_q.config_json->'correctAnswers');
    when 'pin_image' then
      v_correct := jsonb_build_object('correctArea', v_q.config_json->'correctArea');
    when 'order' then
      v_correct := jsonb_build_object('correctOrder', v_q.config_json->'correctOrder');
    else
      v_correct := '{}'::jsonb;
  end case;

  return jsonb_build_object(
    'question_id', v_q.id,
    'type', v_q.type,
    'question_text', v_q.question_text,
    'media_url', v_q.media_url,
    'options', v_options,
    'items', v_items,
    'image_url', case
      when v_q.type = 'pin_image' then coalesce(v_q.media_url, v_config->>'imageUrl')
      else null
    end,
    'correct_answer', v_correct,
    'player_result', case
      when v_answer.id is null then null
      else jsonb_build_object(
        'answer_json', v_answer.answer_json,
        'is_correct', v_answer.is_correct,
        'points_awarded', v_answer.points_awarded,
        'response_time_ms', v_answer.response_time_ms
      )
    end
  );
end;
$$;

revoke all on function public.get_question_reveal(uuid, uuid, text) from public;
grant execute on function public.get_question_reveal(uuid, uuid, text)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_fastest_answers — correct answers only; reveal-or-later; no IDs/tokens
-- -----------------------------------------------------------------------------

create or replace function public.get_fastest_answers(
  p_game_id uuid,
  p_player_id uuid default null,
  p_player_token text default null,
  p_limit integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_admin boolean;
  v_limit integer;
  v_rows jsonb;
begin
  v_admin := public.is_admin();

  if not v_admin then
    if p_player_id is null or p_player_token is null then
      raise exception 'Unauthorized player';
    end if;
    perform public.require_player(p_game_id, p_player_id, p_player_token);
  end if;

  select * into v_game from public.games where id = p_game_id;
  if not found then
    raise exception 'Game not found';
  end if;

  if v_game.phase not in ('answer_reveal', 'leaderboard', 'finished') then
    raise exception 'Fastest answers not available';
  end if;

  if v_game.current_question_id is null then
    raise exception 'No current question';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 3), 1), 5);

  select coalesce(jsonb_agg(row_data order by rnk), '[]'::jsonb)
  into v_rows
  from (
    select
      jsonb_build_object(
        'rank', rnk,
        'display_name', display_name,
        'response_time_ms', response_time_ms
      ) as row_data,
      rnk
    from (
      select
        p.display_name,
        a.response_time_ms,
        row_number() over (
          order by a.response_time_ms asc, a.submitted_at asc
        ) as rnk
      from public.answers a
      inner join public.players p on p.id = a.player_id
      where a.game_id = p_game_id
        and a.question_id = v_game.current_question_id
        and a.is_correct = true
    ) ranked
    where rnk <= v_limit
  ) t;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

revoke all on function public.get_fastest_answers(uuid, uuid, text, integer) from public;
grant execute on function public.get_fastest_answers(uuid, uuid, text, integer)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_answer_count (host polling)
-- -----------------------------------------------------------------------------

create or replace function public.get_answer_count(
  p_game_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_submitted integer;
  v_players integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_game from public.games where id = p_game_id;
  if not found then
    raise exception 'Game not found';
  end if;

  select count(*)::integer into v_players
  from public.players where game_id = p_game_id;

  select count(*)::integer into v_submitted
  from public.answers
  where game_id = p_game_id
    and question_id = v_game.current_question_id;

  return jsonb_build_object(
    'submitted', coalesce(v_submitted, 0),
    'players', coalesce(v_players, 0),
    'question_id', v_game.current_question_id
  );
end;
$$;

revoke all on function public.get_answer_count(uuid) from public;
grant execute on function public.get_answer_count(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_leaderboard
-- -----------------------------------------------------------------------------

create or replace function public.get_leaderboard(
  p_game_id uuid,
  p_player_id uuid default null,
  p_player_token text default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_admin boolean;
  v_limit integer;
  v_entries jsonb;
  v_me jsonb;
  v_me_rank integer;
  v_me_name text;
  v_me_score integer;
begin
  v_admin := public.is_admin();

  if not v_admin then
    if p_player_id is null or p_player_token is null then
      raise exception 'Unauthorized player';
    end if;
    perform public.require_player(p_game_id, p_player_id, p_player_token);
  end if;

  select * into v_game from public.games where id = p_game_id;
  if not found then
    raise exception 'Game not found';
  end if;

  if not v_admin and v_game.phase not in ('leaderboard', 'finished') then
    raise exception 'Leaderboard not available';
  end if;

  v_limit := least(
    greatest(coalesce(p_limit, 10), 1),
    50
  );

  select coalesce(jsonb_agg(row_data order by rnk), '[]'::jsonb)
  into v_entries
  from (
    select
      jsonb_build_object(
        'rank', rnk,
        'display_name', display_name,
        'score', score,
        'is_me', case
          when p_player_id is not null and id = p_player_id then true
          else false
        end
      ) as row_data,
      rnk
    from (
      select
        id,
        display_name,
        score,
        rank() over (order by score desc, joined_at asc) as rnk
      from public.players
      where game_id = p_game_id
    ) ranked
    where rnk <= v_limit
    order by rnk
  ) t;

  if p_player_id is not null then
    select rnk, display_name, score
    into v_me_rank, v_me_name, v_me_score
    from (
      select
        id,
        display_name,
        score,
        rank() over (order by score desc, joined_at asc) as rnk
      from public.players
      where game_id = p_game_id
    ) ranked
    where id = p_player_id;

    if found then
      v_me := jsonb_build_object(
        'rank', v_me_rank,
        'display_name', v_me_name,
        'score', v_me_score
      );
    end if;
  end if;

  return jsonb_build_object(
    'entries', coalesce(v_entries, '[]'::jsonb),
    'me', v_me
  );
end;
$$;

revoke all on function public.get_leaderboard(uuid, uuid, text, integer) from public;
grant execute on function public.get_leaderboard(uuid, uuid, text, integer)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: quiz-images
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quiz-images',
  'quiz-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "quiz_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'quiz-images');

create policy "quiz_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'quiz-images' and public.is_admin());

create policy "quiz_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'quiz-images' and public.is_admin())
  with check (bucket_id = 'quiz-images' and public.is_admin());

create policy "quiz_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'quiz-images' and public.is_admin());

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.players;

-- =============================================================================
-- Frontend access summary
-- =============================================================================
-- ANON: SELECT games only; RPCs with player_token; no players/answers table access
-- ADMIN: full CRUD + host roster Realtime on players + get_answer_count
-- Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
-- =============================================================================
