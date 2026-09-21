-- Additive: per-question timer range, speed-score cap, question progress,
-- reveal display fields, and Fastest Finger ranking RPC.
-- Does not drop tables or reset data.

alter table public.questions
  drop constraint if exists questions_time_limit_positive;

alter table public.questions
  drop constraint if exists questions_time_limit_range;

alter table public.questions
  add constraint questions_time_limit_range
  check (time_limit_seconds >= 5 and time_limit_seconds <= 120);

create index if not exists answers_fastest_correct_idx
  on public.answers (game_id, question_id, response_time_ms, submitted_at)
  where is_correct = true;

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
