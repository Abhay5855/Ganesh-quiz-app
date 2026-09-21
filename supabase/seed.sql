-- Optional sample quiz for local smoke-testing after applying schema.sql
-- Run in SQL Editor after creating an admin user and inserting into admins.

insert into public.quizzes (id, title, description, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'Ganesh Festival Warm-up',
  'Sample questions for a dry run',
  'published'
)
on conflict (id) do nothing;

insert into public.questions (
  quiz_id, type, question_text, config_json, time_limit_seconds, points, position
) values
(
  '11111111-1111-1111-1111-111111111111',
  'single_choice',
  'What is Lord Ganesha''s favourite sweet?',
  '{"options":[{"id":"a","text":"Modak"},{"id":"b","text":"Jalebi"},{"id":"c","text":"Barfi"}],"correctAnswer":"a"}'::jsonb,
  20,
  1000,
  0
),
(
  '11111111-1111-1111-1111-111111111111',
  'multi_select',
  'Which animals are associated with Ganesha lore? (select all)',
  '{"options":[{"id":"a","text":"Mouse"},{"id":"b","text":"Elephant"},{"id":"c","text":"Snake"}],"correctAnswers":["a","b"]}'::jsonb,
  25,
  1000,
  1
),
(
  '11111111-1111-1111-1111-111111111111',
  'order',
  'Put these festival moments in a traditional sequence',
  '{"items":[{"id":"a","text":"Ganesh Sthapana"},{"id":"b","text":"Aarti"},{"id":"c","text":"Visarjan"}],"correctOrder":["a","b","c"]}'::jsonb,
  30,
  1000,
  2
);
