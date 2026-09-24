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

CREATE OR REPLACE FUNCTION gsc_tests.set_claims(p_id uuid, p_assurance text)
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
      'assurance', p_assurance,
      'requestId', 'req_app_systems'
    )::text,
    true
  );
END;
$$;

DO $$
DECLARE
  student_id uuid := 'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1';
  admin_id uuid := 'ddddddd2-dddd-4ddd-8ddd-ddddddddddd2';
  uni_id uuid := 'ddddddd3-dddd-4ddd-8ddd-ddddddddddd3';
  leftover uuid := '10000000-0000-4000-8000-000000000011';
  app_id uuid := 'ddddddd4-dddd-4ddd-8ddd-ddddddddddd4';
  group_id uuid;
BEGIN
  PERFORM gsc_tests.create_auth_user(student_id, 'appsys-student@example.invalid');
  PERFORM gsc_tests.create_auth_user(admin_id, 'appsys-admin@example.invalid');

  INSERT INTO public.accounts (id, auth_user_id, email_normalized, status)
  VALUES
    (student_id, student_id, 'appsys-student@example.invalid', 'approved'),
    (admin_id, admin_id, 'appsys-admin@example.invalid', 'approved');

  INSERT INTO public.account_roles (account_id, role, granted_by)
  VALUES (admin_id, 'admin', admin_id);

  PERFORM set_config('gsc.role_change_allowed', 'on', true);
  UPDATE public.user_profiles SET role = 'admin' WHERE id = admin_id;
  PERFORM set_config('gsc.role_change_allowed', 'off', true);

  INSERT INTO public.universities (
    id, name, country, publication_state
  )
  VALUES (
    uni_id,
    'Synthetic Leftover University',
    'GB',
    'withdrawn'
  );

  INSERT INTO public.application_groups (system_id, state, migration_source)
  VALUES (leftover, 'closed', 'leftover_no_case')
  RETURNING id INTO group_id;

  INSERT INTO public.applications (
    id, student_id, university_id, status, deadline, group_id
  )
  VALUES (
    app_id, student_id, uni_id, 'accepted', '2027-01-15', group_id
  );

  PERFORM commands.sync_leftover_application_deadline(app_id);
END
$$;

SELECT is(
  (
    SELECT s.code
    FROM public.applications a
    JOIN public.application_groups g ON g.id = a.group_id
    JOIN public.application_systems s ON s.id = g.system_id
    WHERE a.id = 'ddddddd4-dddd-4ddd-8ddd-ddddddddddd4'
  ),
  'legacy_unmapped',
  'leftover rows stay on legacy_unmapped even when the university country is GB'
);

SELECT is(
  (
    SELECT g.state
    FROM public.applications a
    JOIN public.application_groups g ON g.id = a.group_id
    WHERE a.id = 'ddddddd4-dddd-4ddd-8ddd-ddddddddddd4'
  ),
  'closed',
  'accepted leftover choice maps the group to closed and keeps status on the choice'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.cases
    WHERE student_account_id = 'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1'
  ),
  0,
  'backfill does not invent a case for a leftover student_id'
);

SELECT is(
  (
    SELECT deadline_precision
    FROM public.application_deadlines
    WHERE university_id = 'ddddddd3-dddd-4ddd-8ddd-ddddddddddd3'
      AND kind = 'leftover_institution'
  ),
  'day',
  'leftover DATE is copied as day precision, not month'
);

SELECT is(
  (
    SELECT notes LIKE 'APPROXIMATE:%'
    FROM public.application_systems
    WHERE code = 'parcoursup'
  ),
  true,
  'Parcoursup is flagged as an approximate choice model'
);

SELECT is(
  (
    SELECT choice_model FROM public.application_systems WHERE code = 'ucas'
  ),
  'unordered_set',
  'UCAS is an unordered set of up to five courses'
);

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', 'aal2');
    SELECT commands.upsert_application_fee_rule(
      '10000000-0000-4000-8000-000000000001',
      'system',
      'base_application',
      28.50,
      'GBP',
      NULL,
      5,
      2027,
      'ddddddd5-dddd-4ddd-8ddd-ddddddddddd5',
      'seed'
    );
  $$,
  'FORBIDDEN',
  'students cannot source application fee facts'
);

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('ddddddd2-dddd-4ddd-8ddd-ddddddddddd2', 'aal2');
    SELECT commands.upsert_application_fee_rule(
      '10000000-0000-4000-8000-000000000001',
      'system',
      'base_application',
      28.50,
      'GBP',
      NULL,
      5,
      2027,
      'ddddddd5-dddd-4ddd-8ddd-ddddddddddd5',
      'seed'
    );
  $$,
  'FORBIDDEN',
  'admin without catalog_editorial cannot source fee facts'
);

SET ROLE authenticated;
SELECT throws_ok(
  $$INSERT INTO public.application_systems (
    code, name, choice_model, fee_model, deadline_model, essay_model,
    document_model, publication_state
  ) VALUES (
    'invented', 'No', 'single', 'per_choice', 'institution', 'none', 'none', 'published'
  )$$,
  '42501',
  NULL,
  'authenticated cannot insert application systems'
);
RESET ROLE;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.application_fee_rules
    WHERE amount IS NOT NULL
  ),
  0,
  'production seed has no invented fee amounts'
);

SELECT * FROM finish();
ROLLBACK;
