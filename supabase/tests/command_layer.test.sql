-- Command-layer privileges, happy path, and atomic audit/outbox.
BEGIN;

SELECT no_plan();

CREATE SCHEMA IF NOT EXISTS gsc_tests;

CREATE OR REPLACE FUNCTION gsc_tests.create_auth_user(p_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.test_fail_after_audit(p_expected_version bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  PERFORM commands.update_user_profile(
    p_expected_version, 'Atomic', 'Failure', NULL, true
  );
  RAISE EXCEPTION 'simulated_failure';
END;
$$;

GRANT EXECUTE ON FUNCTION commands.test_fail_after_audit(bigint)
  TO gsc_api_executor;

DO $$
DECLARE
  student_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';
  uni_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01';
BEGIN
  PERFORM gsc_tests.create_auth_user(student_id, 'cmd-student@example.invalid');
  INSERT INTO public.universities (
    id, name, country, publication_state
  )
  VALUES (
    uni_id,
    'Synthetic Command University',
    'KE',
    'withdrawn'
  );
END
$$;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'role', 'authenticated',
    'requestId', 'req_command_layer'
  )::text,
  true
);

SET ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.user_profiles (id, first_name, last_name, role)
    VALUES (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa99',
      'No',
      'Insert',
      'student'
    )$$,
  '42501',
  NULL,
  'authenticated cannot INSERT user_profiles'
);

SELECT throws_ok(
  $$UPDATE public.user_profiles
    SET first_name = 'Hacked'
    WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'$$,
  '42501',
  NULL,
  'authenticated cannot UPDATE user_profiles'
);

SELECT throws_ok(
  $$DELETE FROM public.user_profiles
    WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'$$,
  '42501',
  NULL,
  'authenticated cannot DELETE user_profiles'
);

SELECT throws_ok(
  $$INSERT INTO public.applications (student_id, university_id, status, deadline)
    VALUES (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
      'draft',
      '2027-01-01'
    )$$,
  '42501',
  NULL,
  'authenticated cannot INSERT applications'
);

SELECT throws_ok(
  $$UPDATE public.applications SET status = 'submitted'$$,
  '42501',
  NULL,
  'authenticated cannot UPDATE applications'
);

SELECT throws_ok(
  $$DELETE FROM public.applications$$,
  '42501',
  NULL,
  'authenticated cannot DELETE applications'
);

SELECT throws_ok(
  $$SELECT commands.update_user_profile(1, 'Nope', 'Nope', NULL, true)$$,
  '42501',
  NULL,
  'authenticated cannot EXECUTE commands.update_user_profile'
);

RESET ROLE;

SET ROLE service_role;

SELECT throws_ok(
  $$SELECT commands.update_user_profile(1, 'Nope', 'Nope', NULL, true)$$,
  '42501',
  NULL,
  'service_role cannot EXECUTE commands'
);

RESET ROLE;

SET ROLE gsc_api_executor;

SELECT ok(
  (
    SELECT (commands.update_user_profile(1, 'Ada', 'Lovelace', NULL, true)
      ->> 'version')::bigint = 2
  ),
  'executor update_user_profile succeeds'
);

SELECT throws_ok(
  $$SELECT commands.update_user_profile(1, 'Stale', 'Write', NULL, true)$$,
  'P0001',
  'VERSION_CONFLICT',
  'stale version is rejected'
);

SELECT lives_ok(
  $$SELECT commands.create_application(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
    'draft',
    '2027-09-01',
    'idem-1',
    'hash-1',
    'path-1'
  )$$,
  'executor create_application succeeds'
);

SELECT throws_ok(
  $$SELECT commands.create_application(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
    'submitted',
    '2027-09-01',
    'idem-1',
    'hash-different',
    'path-1'
  )$$,
  'P0001',
  'IDEMPOTENCY_CONFLICT',
  'same key with a different body is rejected'
);

RESET ROLE;

SELECT is(
  (SELECT first_name FROM public.user_profiles
    WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'),
  'Ada',
  'command wrote the user_profiles change'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.audit_events
    WHERE resource_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
      AND action = 'update_user_profile'
      AND safe_diff ->> 'beforeVersion' = '1'
      AND safe_diff ->> 'afterVersion' = '2'
  ),
  'audit_events row written with versions'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.outbox_events
    WHERE aggregate_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
      AND event_type = 'user_profile_updated'
      AND aggregate_version = 2
  ),
  'outbox_events row written with the new version'
);

SELECT is(
  (SELECT count(*)::integer FROM public.applications
    WHERE student_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'),
  1,
  'one application created'
);

SET ROLE gsc_api_executor;

SELECT is(
  (
    SELECT commands.create_application(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
      'draft',
      '2027-09-01',
      'idem-1',
      'hash-1',
      'path-1'
    ) ->> 'id'
  ),
  (
    SELECT commands.create_application(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
      'draft',
      '2027-09-01',
      'idem-1',
      'hash-1',
      'path-1'
    ) ->> 'id'
  ),
  'matching idempotency key replays the same id'
);

SELECT throws_ok(
  $$SELECT commands.test_fail_after_audit(2)$$,
  'P0001',
  'simulated_failure',
  'forced failure after writes rolls back'
);

RESET ROLE;

SELECT is(
  (SELECT first_name FROM public.user_profiles
    WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'),
  'Ada',
  'failed command left user_profiles unchanged'
);

SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
    WHERE resource_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
      AND action = 'update_user_profile'
      AND safe_diff ->> 'afterVersion' = '3'),
  0,
  'failed command left no extra audit row'
);

SELECT is(
  (SELECT count(*)::integer FROM public.outbox_events
    WHERE aggregate_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
      AND aggregate_version = 3),
  0,
  'failed command left no extra outbox row'
);

SELECT is(
  (SELECT count(*)::integer FROM public.applications
    WHERE student_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'),
  1,
  'idempotent replay did not insert a second application'
);

DROP FUNCTION commands.test_fail_after_audit(bigint);

SELECT finish();
ROLLBACK;
