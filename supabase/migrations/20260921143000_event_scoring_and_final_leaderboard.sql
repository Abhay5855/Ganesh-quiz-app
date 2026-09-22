-- Event corrections: one point per correct answer, 12-character names, and
-- final-only leaderboard ranking by score then total answer time.

alter table public.questions
  alter column points set default 1;

-- Normalize legacy question rows without changing answer history or player identity.
update public.questions set points = 1 where points <> 1;

alter table public.questions
  drop constraint if exists questions_points_nonnegative;

alter table public.questions
  add constraint questions_points_nonnegative check (points >= 1);

create or replace function public.compute_points(
  p_base_points integer,
  p_is_correct boolean,
  p_response_time_ms integer,
  p_time_limit_seconds integer
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_is_correct then 1 else 0 end;
$$;

revoke all on function public.compute_points(integer, boolean, integer, integer) from public;

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
  if char_length(trim(p_display_name)) > 12 then
    raise exception 'Display name must be 12 characters or fewer';
  end if;

  select * into v_game from public.games g
  where g.game_code = p_game_code and g.status = 'active'
  for update;
  if not found then raise exception 'Game not found'; end if;
  if v_game.phase <> 'lobby' then raise exception 'Game is not accepting new players'; end if;

  select count(*)::integer into v_count from public.players p where p.game_id = v_game.id;
  if v_count >= 150 then raise exception 'Game is full'; end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.players (game_id, display_name, player_token_hash)
  values (v_game.id, trim(p_display_name), public.hash_player_token(v_token))
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
  v_score integer;
begin
  perform public.require_player(p_game_id, p_player_id, p_player_token);
  select * into v_player from public.players where id = p_player_id and game_id = p_game_id;
  select * into v_game from public.games where id = p_game_id;
  select coalesce(array_agg(a.question_id), '{}') into v_answered
  from public.answers a where a.player_id = p_player_id and a.game_id = p_game_id;
  select count(*)::integer into v_score from public.answers a
  where a.player_id = p_player_id and a.game_id = p_game_id and a.is_correct;

  return jsonb_build_object(
    'player_id', v_player.id,
    'game_id', v_game.id,
    'display_name', v_player.display_name,
    'score', case when v_game.phase in ('answer_reveal', 'leaderboard', 'finished') then v_score else null end,
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

-- Keep response time bounded to the question duration. The existing column is
-- sufficient for total completion time, including unanswered questions via
-- the question's configured duration in get_leaderboard below.
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
  select * into v_player from public.players where id = p_player_id and game_id = p_game_id for update;
  if not found then raise exception 'Player not found'; end if;
  select * into v_game from public.games where id = p_game_id for share;
  if not found then raise exception 'Game not found'; end if;
  if v_game.status <> 'active' or v_game.phase <> 'question' then raise exception 'Game is not accepting answers'; end if;
  if v_game.current_question_id is distinct from p_question_id then raise exception 'Question is not active'; end if;
  if v_game.question_started_at is null then raise exception 'Question timer not started'; end if;
  select * into v_q from public.questions where id = p_question_id;
  if not found then raise exception 'Question not found'; end if;
  if exists (select 1 from public.answers a where a.player_id = p_player_id and a.question_id = p_question_id) then
    raise exception 'Already answered';
  end if;

  v_timer_ms := v_q.time_limit_seconds * 1000;
  v_response_ms := greatest(0, floor(extract(epoch from (now() - v_game.question_started_at)) * 1000)::integer);
  if v_response_ms > (v_timer_ms + 2000) then raise exception 'Time expired'; end if;
  v_response_ms := least(v_response_ms, v_timer_ms);

  p_answer_json := p_answer_json - 'is_correct' - 'points_awarded' - 'points_earned' - 'score' - 'total_score';
  perform public.validate_answer_payload(v_q.type, v_q.config_json, p_answer_json);
  v_is_correct := public.evaluate_answer(v_q.type, v_q.config_json, p_answer_json);
  v_points := public.compute_points(v_q.points, v_is_correct, v_response_ms, v_q.time_limit_seconds);

  insert into public.answers (game_id, player_id, question_id, answer_json, is_correct, response_time_ms, points_awarded)
  values (p_game_id, p_player_id, p_question_id, p_answer_json, v_is_correct, v_response_ms, v_points);
  update public.players set score = score + v_points where id = p_player_id;
  return jsonb_build_object('accepted', true, 'already_answered', true);
end;
$$;

revoke all on function public.submit_answer(uuid, uuid, text, uuid, jsonb) from public;
grant execute on function public.submit_answer(uuid, uuid, text, uuid, jsonb) to anon, authenticated;

create or replace function public.get_leaderboard(
  p_game_id uuid,
  p_player_id uuid default null,
  p_player_token text default null,
  p_limit integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_admin boolean;
  v_entries jsonb;
  v_me jsonb;
  v_me_rank integer;
  v_me_name text;
  v_me_score integer;
  v_me_time bigint;
begin
  v_admin := public.is_admin();
  if not v_admin then
    if p_player_id is null or p_player_token is null then raise exception 'Unauthorized player'; end if;
    perform public.require_player(p_game_id, p_player_id, p_player_token);
  end if;
  select * into v_game from public.games where id = p_game_id;
  if not found then raise exception 'Game not found'; end if;
  if not v_admin and v_game.phase not in ('leaderboard', 'finished') then raise exception 'Leaderboard not available'; end if;

  with ranked as (
    select p.id, p.display_name,
      (count(a.id) filter (where a.is_correct))::integer as score,
      coalesce(sum(least(coalesce(a.response_time_ms, q.time_limit_seconds * 1000), q.time_limit_seconds * 1000)), 0)::bigint as total_time_ms,
      row_number() over (order by count(a.id) filter (where a.is_correct) desc,
        coalesce(sum(least(coalesce(a.response_time_ms, q.time_limit_seconds * 1000), q.time_limit_seconds * 1000)), 0) asc,
        p.joined_at asc, p.id) as rnk
    from public.players p
    join public.questions q on q.quiz_id = v_game.quiz_id
    left join public.answers a on a.player_id = p.id and a.question_id = q.id and a.game_id = p_game_id
    where p.game_id = p_game_id
    group by p.id, p.display_name, p.joined_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', rnk, 'display_name', display_name, 'score', score,
    'total_time_ms', total_time_ms, 'is_me', (p_player_id is not null and id = p_player_id)
  ) order by rnk), '[]'::jsonb) into v_entries
  from ranked where rnk <= 5;

  if p_player_id is not null then
    with ranked as (
      select p.id, p.display_name,
        (count(a.id) filter (where a.is_correct))::integer as score,
        coalesce(sum(least(coalesce(a.response_time_ms, q.time_limit_seconds * 1000), q.time_limit_seconds * 1000)), 0)::bigint as total_time_ms,
        row_number() over (order by count(a.id) filter (where a.is_correct) desc,
          coalesce(sum(least(coalesce(a.response_time_ms, q.time_limit_seconds * 1000), q.time_limit_seconds * 1000)), 0) asc,
          p.joined_at asc, p.id) as rnk
      from public.players p
      join public.questions q on q.quiz_id = v_game.quiz_id
      left join public.answers a on a.player_id = p.id and a.question_id = q.id and a.game_id = p_game_id
      where p.game_id = p_game_id
      group by p.id, p.display_name, p.joined_at
    )
    select rnk, display_name, score, total_time_ms into v_me_rank, v_me_name, v_me_score, v_me_time
    from ranked where id = p_player_id;
    if found then
      v_me := jsonb_build_object('rank', v_me_rank, 'display_name', v_me_name, 'score', v_me_score, 'total_time_ms', v_me_time);
    end if;
  end if;
  return jsonb_build_object('entries', coalesce(v_entries, '[]'::jsonb), 'me', v_me);
end;
$$;

revoke all on function public.get_leaderboard(uuid, uuid, text, integer) from public;
grant execute on function public.get_leaderboard(uuid, uuid, text, integer) to anon, authenticated;
