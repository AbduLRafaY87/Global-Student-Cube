BEGIN;

SELECT no_plan();

SELECT lives_ok(
  $$ SELECT commands.format_gsc_id(1) $$,
  'GSC formatter accepts the first sequence'
);

SELECT is(commands.format_gsc_id(1), 'GSC-000001', 'first GSC id');
SELECT is(commands.format_gsc_id(999999), 'GSC-999999', 'last numeric GSC id');
SELECT is(commands.format_gsc_id(1000000), 'GSC-A000001', 'alphabetic rollover');

SELECT throws_ok(
  $$ SELECT commands.register_student_account(
    '00000000-0000-0000-0000-000000000001',
    'child@example.com',
    'Child Name',
    'Name',
    NULL,
    'female',
    '2016-01-01',
    'KE',
    'KE',
    'Nairobi',
    '{"street":"1 Main","city":"Nairobi","postal_code":null,"country":"KE","unlisted_city":false}'::jsonb,
    decode('aa', 'hex'),
    'hash',
    NULL,
    '[]'::jsonb,
    'no',
    'under_13',
    'gsc-data-use-2026-09-19',
    'evidence',
    false,
    false
  ) $$,
  'Independent student accounts require age 13 or over',
  'under-13 independent signup is rejected'
);

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'adult.auth@example.com',
  crypt('Valid Pass1!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"admin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

SELECT is(
  (SELECT role FROM public.user_profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  'student',
  'signup trigger ignores metadata role and creates a student'
);

SELECT lives_ok(
  $$ SELECT commands.register_student_account(
    '11111111-1111-1111-1111-111111111111',
    'adult.auth@example.com',
    'Ada O''Neil',
    'O''Neil',
    NULL,
    'female',
    '2000-01-15',
    'KE',
    'KE',
    'Nairobi',
    '{"street":"1 Kenyatta Avenue","city":"Nairobi","postal_code":"00100","country":"KE","unlisted_city":false}'::jsonb,
    decode('aabb', 'hex'),
    'phonehash',
    NULL,
    '[{"kind":"linkedin","url":"https://linkedin.com/in/ada"}]'::jsonb,
    'in_process',
    'adult',
    'gsc-data-use-2026-09-19',
    'evidence-hash-1',
    false,
    false
  ) $$,
  'adult student registration command succeeds'
);

SELECT is(
  (SELECT count(*)::int FROM public.consent_events WHERE actor_id = '11111111-1111-1111-1111-111111111111'),
  3,
  'three consent rows are written'
);

SELECT throws_ok(
  $$ UPDATE public.consent_events SET decision = false WHERE actor_id = '11111111-1111-1111-1111-111111111111' $$,
  'This record cannot be changed',
  'consent_events cannot be updated'
);

SELECT throws_ok(
  $$ DELETE FROM public.consent_events WHERE actor_id = '11111111-1111-1111-1111-111111111111' $$,
  'This record cannot be changed',
  'consent_events cannot be deleted'
);

SELECT is(
  commands.consume_reset_token('reset-hash-1', '11111111-1111-1111-1111-111111111111'),
  true,
  'first reset token consume succeeds'
);

SELECT is(
  commands.consume_reset_token('reset-hash-1', '11111111-1111-1111-1111-111111111111'),
  false,
  'reset token reuse fails'
);

SELECT ok(
  (SELECT gsc_id FROM public.accounts WHERE id = '11111111-1111-1111-1111-111111111111')
    ~ '^GSC-[0-9A-Z]+$',
  'registered account receives a GSC id'
);

SELECT is(
  (SELECT student_account_id FROM public.cases WHERE student_account_id = '11111111-1111-1111-1111-111111111111') IS NOT NULL,
  true,
  'student owns a case row'
);

SELECT * FROM finish();
ROLLBACK;
