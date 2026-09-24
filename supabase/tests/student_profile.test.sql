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

DO $$
DECLARE
  student_a uuid := 'c0ffeeee-0001-4000-8000-0000000000a1';
  student_b uuid := 'c0ffeeee-0001-4000-8000-0000000000b1';
  case_a uuid := 'c0ffeeee-0001-4000-8000-0000000000c1';
  case_b uuid := 'c0ffeeee-0001-4000-8000-0000000000c2';
BEGIN
  PERFORM gsc_tests.create_auth_user(student_a, 'profile-a@example.invalid');
  PERFORM gsc_tests.create_auth_user(student_b, 'profile-b@example.invalid');

  INSERT INTO public.accounts (id, auth_user_id, email_normalized, status, gsc_id)
  VALUES
    (student_a, student_a, 'profile-a@example.invalid', 'approved', 'GSC-PROFILEA'),
    (student_b, student_b, 'profile-b@example.invalid', 'approved', 'GSC-PROFILEB');

  INSERT INTO public.cases (
    id, student_account_id, student_name, student_dob, state
  ) VALUES
    (case_a, student_a, 'Profile A', '2000-01-01', 'active'),
    (case_b, student_b, 'Profile B', '2000-01-01', 'active');

  INSERT INTO public.consent_events (
    subject_id, case_id, actor_id, purpose, policy_version, decision, evidence_hash, occurred_at
  ) VALUES
    (student_a, case_a, student_a, 'data_use', 'gsc-data-use-2026-09-19', true, 'hash-a', now()),
    (student_b, case_b, student_b, 'data_use', 'gsc-data-use-2026-09-19', true, 'hash-b', now());
END
$$;

SELECT is(
  commands.compare_test_requirement(
    'TOEFL_IBT_LEGACY_120', 'legacy.1', 100,
    'TOEFL_IBT_BAND_2026', '2026.1', 5, NULL
  ),
  'manual review',
  'unlike TOEFL scales return manual review'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0ffeeee-0001-4000-8000-0000000000a1',
    'role', 'authenticated',
    'requestId', 'req_profile_a'
  )::text,
  true
);

SELECT throws_ok(
  $$SELECT commands.complete_module2('c0ffeeee-0001-4000-8000-0000000000c1')$$,
  'VALIDATION_FAILED',
  'incomplete Module 2 cannot set module2_completed_at'
);

SELECT lives_ok(
  $$SELECT commands.save_academic_history(
    'c0ffeeee-0001-4000-8000-0000000000c1',
    '{"level":"high_school","educationYears":12,"records":[{"institution":"Synthetic High","level":"school","country":"KE","city":"Nairobi","board":"national","completionYear":2024,"completionStatus":"completed","resultStatus":"available","scoreValue":"85","scoreScale":"percentage"}]}'::jsonb
  )$$,
  'student A can save academic history'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0ffeeee-0001-4000-8000-0000000000b1',
    'role', 'authenticated',
    'requestId', 'req_profile_b'
  )::text,
  true
);

SELECT throws_ok(
  $$SELECT commands.save_academic_history(
    'c0ffeeee-0001-4000-8000-0000000000c1',
    '{"level":"ug","educationYears":1,"records":[]}'::jsonb
  )$$,
  'FORBIDDEN',
  'student B cannot write student A academic history'
);

SET ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0ffeeee-0001-4000-8000-0000000000b1',
    'role', 'authenticated'
  )::text,
  true
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.education_records
    WHERE case_id = 'c0ffeeee-0001-4000-8000-0000000000c1'
  ),
  0,
  'student B cannot read student A education records through RLS'
);

SELECT throws_ok(
  $$INSERT INTO public.education_records (
    case_id, institution, level, board
  ) VALUES (
    'c0ffeeee-0001-4000-8000-0000000000c2',
    'Direct write',
    'school',
    'national'
  )$$,
  '42501',
  NULL,
  'authenticated cannot insert education_records'
);

RESET ROLE;

SELECT is(
  to_regclass('public.student_profiles') IS NOT NULL
    AND to_regclass('public.test_scores_log') IS NOT NULL
    AND to_regclass('public.activities') IS NOT NULL
    AND to_regclass('public.documents') IS NOT NULL,
  true,
  'leftover profile, test, activity and document tables remain so rows are not dropped'
);

SELECT * FROM finish();
ROLLBACK;
