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

CREATE OR REPLACE FUNCTION gsc_tests.set_claims(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_id,
      'role', 'authenticated',
      'requestId', 'req_shortlist'
    )::text,
    true
  );
END;
$$;

DO $$
DECLARE
  student uuid := 'bbbb0001-0001-4000-8000-0000000000a1';
  case_id uuid := 'bbbb0001-0001-4000-8000-0000000000c1';
  field_id uuid := '20000000-0000-4000-8000-000000000001';
  uni uuid;
  prog uuid;
  i integer;
BEGIN
  PERFORM gsc_tests.create_auth_user(student, 'shortlist-a@example.invalid');
  INSERT INTO public.accounts (id, auth_user_id, email_normalized, status, gsc_id)
  VALUES (student, student, 'shortlist-a@example.invalid', 'approved', 'GSC-SHORTA');

  INSERT INTO public.cases (
    id, student_account_id, student_name, student_dob, state, module3_completed_at
  ) VALUES (
    case_id, student, 'Shortlist A', '2000-01-01', 'active', now()
  );

  INSERT INTO public.consent_events (
    subject_id, case_id, actor_id, purpose, policy_version, decision, evidence_hash, occurred_at
  ) VALUES (
    student, case_id, student, 'data_use', 'gsc-data-use-2026-09-19', true, 'hash-sl', now()
  );

  FOR i IN 1..4 LOOP
    uni := ('bbbb1000-0001-4000-8000-00000000000' || i)::uuid;
    prog := ('bbbb2000-0001-4000-8000-00000000000' || i)::uuid;
    INSERT INTO public.universities (
      id, name, country, city, type, website_url, publication_state
    ) VALUES (
      uni,
      'SYNTHETIC - not real Shortlist University ' || i,
      'GB',
      'London',
      'public',
      'https://example.invalid/shortlist-' || i,
      'published'
    );
    INSERT INTO public.programs (
      id, university_id, name, level, field_id, duration_value, duration_unit,
      study_modes, general_url, publication_state
    ) VALUES (
      prog,
      uni,
      'SYNTHETIC - not real Shortlist Program ' || i,
      'undergraduate',
      field_id,
      3,
      'years',
      ARRAY['on_campus']::text[],
      'https://example.invalid/shortlist-program-' || i,
      'published'
    );
  END LOOP;
END
$$;

SELECT gsc_tests.set_claims('bbbb0001-0001-4000-8000-0000000000a1');

SELECT lives_ok(
  $$SELECT gsc_tests.set_claims('bbbb0001-0001-4000-8000-0000000000a1');
    SELECT commands.save_program_pair(
    'bbbb0001-0001-4000-8000-0000000000c1',
    'bbbb1000-0001-4000-8000-000000000001',
    'bbbb2000-0001-4000-8000-000000000001'
  )$$,
  'first saved pair is accepted'
);

SELECT lives_ok(
  $$SELECT gsc_tests.set_claims('bbbb0001-0001-4000-8000-0000000000a1');
    SELECT commands.save_program_pair(
    'bbbb0001-0001-4000-8000-0000000000c1',
    'bbbb1000-0001-4000-8000-000000000002',
    'bbbb2000-0001-4000-8000-000000000002'
  )$$,
  'second saved pair is accepted'
);

SELECT lives_ok(
  $$SELECT gsc_tests.set_claims('bbbb0001-0001-4000-8000-0000000000a1');
    SELECT commands.save_program_pair(
    'bbbb0001-0001-4000-8000-0000000000c1',
    'bbbb1000-0001-4000-8000-000000000003',
    'bbbb2000-0001-4000-8000-000000000003'
  )$$,
  'third saved pair fills the cap'
);

SELECT is(
  (SELECT count(*)::int FROM public.saved_program_pairs
    WHERE case_id = 'bbbb0001-0001-4000-8000-0000000000c1'),
  3,
  'exactly three saved pairs after the cap is reached'
);

SELECT lives_ok(
  $$SELECT gsc_tests.set_claims('bbbb0001-0001-4000-8000-0000000000a1');
    SELECT commands.save_program_pair(
    'bbbb0001-0001-4000-8000-0000000000c1',
    'bbbb1000-0001-4000-8000-000000000001',
    'bbbb2000-0001-4000-8000-000000000001'
  )$$,
  'saving the same pair again returns the existing row'
);

SELECT throws_ok(
  $$SELECT gsc_tests.set_claims('bbbb0001-0001-4000-8000-0000000000a1');
    SELECT commands.save_program_pair(
    'bbbb0001-0001-4000-8000-0000000000c1',
    'bbbb1000-0001-4000-8000-000000000004',
    'bbbb2000-0001-4000-8000-000000000004'
  )$$,
  'VALIDATION_FAILED',
  'a fourth distinct pair is rejected'
);

SELECT throws_ok(
  $$SELECT gsc_tests.set_claims('bbbb0001-0001-4000-8000-0000000000a1');
    SELECT commands.set_review_flag(
    'bbbb0001-0001-4000-8000-0000000000c1',
    'bbbb0001-0001-4000-8000-0000000000ff',
    true
  )$$,
  'VALIDATION_FAILED',
  'a review flag on an unsaved row is rejected'
);

SELECT lives_ok(
  $$SELECT gsc_tests.set_claims('bbbb0001-0001-4000-8000-0000000000a1');
    SELECT commands.set_review_flag(
    'bbbb0001-0001-4000-8000-0000000000c1',
    (SELECT id FROM public.saved_program_pairs
      WHERE case_id = 'bbbb0001-0001-4000-8000-0000000000c1'
        AND program_id = 'bbbb2000-0001-4000-8000-000000000001'),
    true
  )$$,
  'a review flag can be set on a saved row'
);

SELECT is(
  (SELECT review_flagged FROM public.saved_program_pairs
    WHERE case_id = 'bbbb0001-0001-4000-8000-0000000000c1'
      AND program_id = 'bbbb2000-0001-4000-8000-000000000001'),
  true,
  'the saved row carries the counselor-review flag'
);

SELECT lives_ok(
  $$SELECT gsc_tests.set_claims('bbbb0001-0001-4000-8000-0000000000a1');
    SELECT commands.remove_saved_program(
    'bbbb0001-0001-4000-8000-0000000000c1',
    (SELECT id FROM public.saved_program_pairs
      WHERE case_id = 'bbbb0001-0001-4000-8000-0000000000c1'
        AND program_id = 'bbbb2000-0001-4000-8000-000000000001')
  )$$,
  'removing a saved pair is allowed'
);

SELECT is(
  (SELECT count(*)::int FROM public.saved_program_pairs
    WHERE case_id = 'bbbb0001-0001-4000-8000-0000000000c1'
      AND program_id = 'bbbb2000-0001-4000-8000-000000000001'),
  0,
  'removing a saved pair also removes its review flag'
);

SELECT throws_ok(
  $$INSERT INTO public.saved_program_pairs (
    case_id, university_id, program_id, slot
  ) VALUES (
    'bbbb0001-0001-4000-8000-0000000000c1',
    'bbbb1000-0001-4000-8000-000000000004',
    'bbbb2000-0001-4000-8000-000000000004',
    4
  )$$,
  '23514',
  'slot 4 is rejected by the race-proof slot constraint'
);

SELECT * FROM finish();
ROLLBACK;
