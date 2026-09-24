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
      'requestId', 'req_catalog'
    )::text,
    true
  );
END;
$$;

DO $$
DECLARE
  platform uuid := '00000000-0000-4000-8000-000000000001';
  editor uuid := 'eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1';
  student uuid := 'eeeeeee2-eeee-4eee-8eee-eeeeeeeeeee2';
  uni uuid := 'eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3';
  program uuid := 'eeeeeee4-eeee-4eee-8eee-eeeeeeeeeee4';
BEGIN
  PERFORM gsc_tests.create_auth_user(editor, 'catalog-editor@example.invalid');
  PERFORM gsc_tests.create_auth_user(student, 'catalog-student@example.invalid');

  INSERT INTO public.accounts (id, auth_user_id, email_normalized, status)
  VALUES
    (editor, editor, 'catalog-editor@example.invalid', 'approved'),
    (student, student, 'catalog-student@example.invalid', 'approved');

  INSERT INTO public.account_roles (account_id, role, granted_by)
  VALUES (editor, 'admin', editor);

  PERFORM set_config('gsc.role_change_allowed', 'on', true);
  UPDATE public.user_profiles SET role = 'admin' WHERE id = editor;
  PERFORM set_config('gsc.role_change_allowed', 'off', true);

  INSERT INTO public.staff_permissions (account_id, permission, granted_by)
  VALUES (editor, 'catalog_editorial', platform);

  INSERT INTO public.universities (
    id, name, country, city, type, website_url, publication_state
  ) VALUES (
    uni,
    'Draft Catalog University',
    'CA',
    'Toronto',
    'public',
    'https://example.invalid/draft-uni',
    'draft'
  );

  INSERT INTO public.programs (
    id, university_id, name, level, field_id, duration_value, duration_unit,
    study_modes, general_url, publication_state
  ) VALUES (
    program,
    uni,
    'Draft Computing',
    'undergraduate',
    '20000000-0000-4000-8000-000000000001',
    4,
    'years',
    ARRAY['on_campus']::text[],
    'https://example.invalid/draft-program',
    'draft'
  );
END
$$;

SELECT is_empty(
  $$SELECT id FROM public.catalog_universities_public$$,
  'draft universities are invisible on the public projection'
);

SELECT is_empty(
  $$SELECT id FROM public.catalog_programs_public$$,
  'draft programs are invisible on the public projection'
);

SET ROLE authenticated;
SELECT is_empty(
  $$SELECT id FROM public.catalog_universities_public$$,
  'authenticated users do not see draft universities via the public view'
);
SELECT throws_ok(
  $$SELECT application_url FROM public.program_action_links$$,
  '42501',
  NULL,
  'program action links are not granted to authenticated clients'
);
RESET ROLE;

SELECT throws_ok(
  $$INSERT INTO public.programs (
    university_id, name, level, field_id, duration_value, duration_unit, study_modes
  ) VALUES (
    'eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3',
    'Bad duration',
    'undergraduate',
    '20000000-0000-4000-8000-000000000001',
    0,
    'years',
    ARRAY['on_campus']::text[]
  )$$,
  '23514',
  NULL,
  'program duration must be greater than zero'
);

SELECT throws_ok(
  $$UPDATE public.programs
    SET international_ratio = 140
    WHERE id = 'eeeeeee4-eeee-4eee-8eee-eeeeeeeeeee4'$$,
  '23514',
  NULL,
  'international ratio cannot exceed 100'
);

SELECT throws_ok(
  $$INSERT INTO public.accommodations (
    university_id, name, type, amount, currency, basis
  ) VALUES (
    'eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3',
    'Unpaired hall',
    'dorm',
    800,
    NULL,
    'monthly'
  )$$,
  '23514',
  NULL,
  'accommodation amount and currency must be paired'
);

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1', 'aal2');
    SELECT commands.set_catalog_publication_state(
      'university',
      'eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3',
      'in_review',
      'submit draft'
    );
    SELECT commands.set_catalog_publication_state(
      'university',
      'eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3',
      'published',
      'publish without source'
    );
  $$,
  'VALIDATION_FAILED',
  'cannot publish a university without source and next review date'
);

DO $$
DECLARE
  doc uuid;
  fact uuid;
BEGIN
  PERFORM gsc_tests.set_claims('eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1', 'aal2');

  SELECT id INTO doc FROM (
    SELECT (commands.upsert_source_document(
      'https://example.invalid/draft-uni',
      'example.invalid',
      now(),
      'hash-draft-uni',
      'permitted excerpt',
      'official_public_page',
      'manual',
      'seed document'
    ) ->> 'id')::uuid AS id
  ) s;

  SELECT id INTO fact FROM (
    SELECT (commands.upsert_source_fact(
      doc,
      'university',
      'eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3',
      'name',
      '"Draft Catalog University"'::jsonb,
      'permitted excerpt',
      'official_university',
      now() + interval '90 days',
      'seed fact'
    ) ->> 'id')::uuid AS id
  ) s;

  IF fact IS NULL THEN
    RAISE EXCEPTION 'expected source fact';
  END IF;
END
$$;

SELECT lives_ok(
  $$
    SELECT gsc_tests.set_claims('eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1', 'aal2');
    SELECT commands.set_catalog_publication_state(
      'university',
      'eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3',
      'in_review',
      'submit after source'
    );
    SELECT commands.set_catalog_publication_state(
      'university',
      'eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3',
      'published',
      'publish with source and review date'
    );
  $$,
  'sourced university can be published'
);

SELECT is(
  (
    SELECT name FROM public.catalog_universities_public
    WHERE id = 'eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3'
  ),
  'Draft Catalog University',
  'published university appears on the public projection'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_scholarships_public'
      AND column_name = 'counselor_remarks'
  ),
  0,
  'private counselor_remarks is absent from the public scholarship DTO'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_universities_public'
      AND column_name IN ('contacts', 'logo_id', 'acceptance_rate')
  ),
  0,
  'private or removed university fields never appear on the public DTO'
);

SELECT is(
  public.catalog_page_limit(200),
  50,
  'catalog page helper caps at 50'
);

SELECT * FROM finish();
ROLLBACK;
