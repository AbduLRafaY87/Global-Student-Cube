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
  student_a uuid := 'aa000001-0001-4000-8000-0000000000a1';
  student_b uuid := 'aa000001-0001-4000-8000-0000000000b1';
  parent_p uuid := 'aa000001-0001-4000-8000-0000000000d1';
  parent_q uuid := 'aa000001-0001-4000-8000-0000000000e1';
  case_a uuid := 'aa000001-0001-4000-8000-0000000000c1';
  case_b uuid := 'aa000001-0001-4000-8000-0000000000c2';
  link_a uuid := 'aa000001-0001-4000-8000-0000000000f1';
  link_b uuid := 'aa000001-0001-4000-8000-0000000000f2';
BEGIN
  PERFORM gsc_tests.create_auth_user(student_a, 'finance-a@example.invalid');
  PERFORM gsc_tests.create_auth_user(student_b, 'finance-b@example.invalid');
  PERFORM gsc_tests.create_auth_user(parent_p, 'finance-p@example.invalid');
  PERFORM gsc_tests.create_auth_user(parent_q, 'finance-q@example.invalid');

  INSERT INTO public.accounts (id, auth_user_id, email_normalized, status, gsc_id)
  VALUES
    (student_a, student_a, 'finance-a@example.invalid', 'approved', 'GSC-FINA'),
    (student_b, student_b, 'finance-b@example.invalid', 'approved', 'GSC-FINB'),
    (parent_p, parent_p, 'finance-p@example.invalid', 'approved', 'GSC-FINP'),
    (parent_q, parent_q, 'finance-q@example.invalid', 'approved', 'GSC-FINQ');

  INSERT INTO public.cases (
    id, student_account_id, student_name, student_dob, state
  ) VALUES
    (case_a, student_a, 'Finance A', '2000-01-01', 'active'),
    (case_b, student_b, 'Finance B', '2008-01-01', 'active');

  INSERT INTO public.consent_events (
    subject_id, case_id, actor_id, purpose, policy_version, decision, evidence_hash, occurred_at
  ) VALUES
    (student_a, case_a, student_a, 'data_use', 'gsc-data-use-2026-09-19', true, 'hash-fa', now()),
    (student_b, case_b, student_b, 'data_use', 'gsc-data-use-2026-09-19', true, 'hash-fb', now());

  INSERT INTO public.parent_invitations (
    case_id, inviter_id, target_email_hash, token_hash, scopes, expires_at, accepted_at
  ) VALUES
    (
      case_a, student_a, encode(digest('finance-p@example.invalid', 'sha256'), 'hex'),
      encode(digest('token-a', 'sha256'), 'hex'),
      ARRAY['finance.read', 'finance.write'], now() + interval '7 days', now()
    ),
    (
      case_b, student_b, encode(digest('finance-p@example.invalid', 'sha256'), 'hex'),
      encode(digest('token-b', 'sha256'), 'hex'),
      ARRAY['profile.read'], now() + interval '7 days', now()
    );

  INSERT INTO public.parent_links (
    id, case_id, parent_id, kind, status, authorized_by
  ) VALUES
    (link_a, case_a, parent_p, 'adult_authorized', 'active', student_a),
    (link_b, case_b, parent_p, 'verified_guardian', 'active', student_b);

  INSERT INTO public.academic_profiles (case_id, level, education_years)
  VALUES (case_a, 'high_school', 12);

  INSERT INTO public.financial_profiles (
    case_id, income_declined, savings_declined, housing
  ) VALUES (
    case_b, true, true, '{"disclosure":"declined"}'::jsonb
  );
END
$$;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aa000001-0001-4000-8000-0000000000a1',
    'role', 'authenticated',
    'requestId', 'req_fin_a'
  )::text,
  true
);

SELECT lives_ok(
  $$SELECT commands.save_financial_profile(
    'aa000001-0001-4000-8000-0000000000c1',
    '{"occupation":"Teacher","incomeDeclined":true,"savingsDeclined":true,"housing":{"disclosure":"declined"},"sponsorAvailable":"prefer_not","incomeProofAvailable":"prefer_not"}'::jsonb
  )$$,
  'student can save a declined financial profile'
);

SELECT lives_ok(
  $$SELECT commands.complete_module3('aa000001-0001-4000-8000-0000000000c1')$$,
  'explicit decline completes Module 3'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aa000001-0001-4000-8000-0000000000e1',
    'role', 'authenticated',
    'requestId', 'req_fin_q'
  )::text,
  true
);

SELECT is(
  (SELECT count(*)::integer FROM public.cases WHERE id = 'aa000001-0001-4000-8000-0000000000c1'),
  0,
  'parent without an active link sees no student case'
);

SELECT is(
  (SELECT count(*)::integer FROM public.financial_profiles WHERE case_id = 'aa000001-0001-4000-8000-0000000000c1'),
  0,
  'parent without an active link sees no financial profile'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aa000001-0001-4000-8000-0000000000d1',
    'role', 'authenticated',
    'requestId', 'req_fin_p'
  )::text,
  true
);

SELECT is(
  (SELECT count(*)::integer FROM public.financial_profiles WHERE case_id = 'aa000001-0001-4000-8000-0000000000c1'),
  1,
  'finance-scoped parent can read child A finances'
);

SELECT is(
  (SELECT count(*)::integer FROM public.financial_profiles WHERE case_id = 'aa000001-0001-4000-8000-0000000000c2'),
  0,
  'profile-only grant on child B does not expose finances'
);

SELECT is(
  (SELECT count(*)::integer FROM public.academic_profiles WHERE case_id = 'aa000001-0001-4000-8000-0000000000c1'),
  0,
  'finance scope does not grant academic profile rows'
);

SELECT is(
  (SELECT count(*)::integer FROM public.cases WHERE id = 'aa000001-0001-4000-8000-0000000000c2'),
  1,
  'active parent can see the authorized second child case'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aa000001-0001-4000-8000-0000000000a1',
    'role', 'authenticated',
    'requestId', 'req_fin_revoke'
  )::text,
  true
);

SELECT lives_ok(
  $$SELECT commands.revoke_parent_link('aa000001-0001-4000-8000-0000000000f1')$$,
  'student can revoke an active parent link'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aa000001-0001-4000-8000-0000000000d1',
    'role', 'authenticated',
    'requestId', 'req_fin_revoked'
  )::text,
  true
);

SELECT is(
  (SELECT count(*)::integer FROM public.financial_profiles WHERE case_id = 'aa000001-0001-4000-8000-0000000000c1'),
  0,
  'revoked link loses finance access immediately'
);

SELECT is(
  (SELECT count(*)::integer FROM public.cases WHERE id = 'aa000001-0001-4000-8000-0000000000c1'),
  0,
  'revoked link cannot select the former case'
);

SELECT is(
  (SELECT count(*)::integer FROM public.cases WHERE id = 'aa000001-0001-4000-8000-0000000000c2'),
  1,
  'revoking child A does not expose or remove child B'
);

SELECT * FROM finish();
ROLLBACK;
