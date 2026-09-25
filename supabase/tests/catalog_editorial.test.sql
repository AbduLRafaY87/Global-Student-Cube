BEGIN;

-- SYNTHETIC catalog rows only. See supabase/tests/fixtures/catalog_synthetic.sql.
-- That fixture is excluded from supabase/seed.sql and production.

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
      'requestId', 'req_catalog_editorial'
    )::text,
    true
  );
END;
$$;

DO $$
DECLARE
  platform uuid := '00000000-0000-4000-8000-000000000001';
  editor uuid := 'ffffff01-ffff-4fff-8fff-ffffffffffff';
  uni uuid := 'ffffff02-ffff-4fff-8fff-ffffffffffff';
BEGIN
  DELETE FROM public.outbox_events
  WHERE aggregate_id = 'ffffff02-ffff-4fff-8fff-ffffffffffff';
  DELETE FROM public.source_facts
  WHERE entity_id = 'ffffff02-ffff-4fff-8fff-ffffffffffff';
  DELETE FROM public.universities WHERE id = 'ffffff02-ffff-4fff-8fff-ffffffffffff';

  PERFORM gsc_tests.create_auth_user(editor, 'catalog-ed@example.invalid');
  INSERT INTO public.accounts (id, auth_user_id, email_normalized, status)
  VALUES (editor, editor, 'catalog-ed@example.invalid', 'approved');
  INSERT INTO public.account_roles (account_id, role, granted_by)
  VALUES (editor, 'admin', editor);
  PERFORM set_config('gsc.role_change_allowed', 'on', true);
  UPDATE public.user_profiles SET role = 'admin' WHERE id = editor;
  PERFORM set_config('gsc.role_change_allowed', 'off', true);
  INSERT INTO public.staff_permissions (account_id, permission, granted_by)
  VALUES (editor, 'catalog_editorial', platform);

  INSERT INTO public.approved_hosts (host, path_prefixes, permission_basis, reviewed_by, notes)
  VALUES (
    'example.invalid',
    ARRAY['/']::text[],
    'official_public_page',
    platform,
    'SYNTHETIC - not real'
  );

  INSERT INTO public.universities (
    id, name, country, city, type, website_url, publication_state
  ) VALUES (
    uni,
    'SYNTHETIC - not real University',
    'GB',
    'London',
    'public',
    'https://example.invalid/synthetic-uni',
    'draft'
  );
END
$$;

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('ffffff01-ffff-4fff-8fff-ffffffffffff', 'aal2');
    SELECT commands.set_catalog_publication_state(
      'university',
      'ffffff02-ffff-4fff-8fff-ffffffffffff',
      'in_review',
      'submit synthetic draft'
    );
    SELECT commands.set_catalog_publication_state(
      'university',
      'ffffff02-ffff-4fff-8fff-ffffffffffff',
      'published',
      'publish without source'
    );
  $$,
  'VALIDATION_FAILED',
  'cannot publish without provenance'
);

SELECT gsc_tests.set_claims('ffffff01-ffff-4fff-8fff-ffffffffffff', 'aal2');

SELECT is(
  (
    SELECT commands.import_catalog_rows(
      'json',
      '[{"entity_type":"university","field_path":"name","value":"SYNTHETIC - not real"}]'::jsonb,
      true,
      'dry-run unsourced'
    ) ->> 'rejected'
  ),
  '1',
  'import rejects unsourced rows'
);

SELECT is(
  (
    SELECT commands.import_catalog_rows(
      'json',
      '[{
        "entity_type":"university",
        "entity_id":"ffffff02-ffff-4fff-8fff-ffffffffffff",
        "field_path":"city",
        "value":"Manchester",
        "official_url":"https://example.invalid/synthetic-uni",
        "retrieved_at":"2026-09-24T00:00:00Z",
        "content_hash":"synthetic-hash",
        "excerpt":"SYNTHETIC - not real",
        "source_type":"official_university",
        "next_review_at":"2026-12-24T00:00:00Z"
      }]'::jsonb,
      true,
      'dry-run sourced'
    ) ->> 'accepted'
  ),
  '1',
  'sourced import rows are accepted on dry-run and never auto-published'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.audit_events
    WHERE action = 'import_catalog_rows'
      AND actor_id = 'ffffff01-ffff-4fff-8fff-ffffffffffff'
  ),
  'catalog import writes an audit row'
);

DO $$
DECLARE
  doc uuid;
BEGIN
  PERFORM gsc_tests.set_claims('ffffff01-ffff-4fff-8fff-ffffffffffff', 'aal2');
  SELECT id INTO doc FROM (
    SELECT (commands.upsert_source_document(
      'https://example.invalid/synthetic-uni',
      'example.invalid',
      now(),
      'synthetic-hash-2',
      'SYNTHETIC - not real',
      'official_public_page',
      'manual',
      'source synthetic university'
    ) ->> 'id')::uuid AS id
  ) s;

  PERFORM commands.upsert_source_fact(
    doc,
    'university',
    'ffffff02-ffff-4fff-8fff-ffffffffffff',
    'name',
    '"SYNTHETIC - not real University"'::jsonb,
    'SYNTHETIC - not real',
    'official_university',
    now() + interval '90 days',
    'fact for synthetic university'
  );

  PERFORM commands.set_catalog_publication_state(
    'university',
    'ffffff02-ffff-4fff-8fff-ffffffffffff',
    'in_review',
    'submit after source'
  );
  PERFORM commands.set_catalog_publication_state(
    'university',
    'ffffff02-ffff-4fff-8fff-ffffffffffff',
    'published',
    'publish synthetic'
  );
END
$$;

SELECT isnt_empty(
  $$SELECT id FROM public.catalog_universities_public
    WHERE id = 'ffffff02-ffff-4fff-8fff-ffffffffffff'$$,
  'published synthetic university is visible on the public projection'
);

SELECT lives_ok(
  $$
    SELECT gsc_tests.set_claims('ffffff01-ffff-4fff-8fff-ffffffffffff', 'aal2');
    SELECT commands.set_catalog_publication_state(
      'university',
      'ffffff02-ffff-4fff-8fff-ffffffffffff',
      'withdrawn',
      'withdraw synthetic'
    );
  $$,
  'withdraw keeps the university row'
);

SELECT is_empty(
  $$SELECT id FROM public.catalog_universities_public
    WHERE id = 'ffffff02-ffff-4fff-8fff-ffffffffffff'$$,
  'withdrawn items disappear from public views'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.universities
    WHERE id = 'ffffff02-ffff-4fff-8fff-ffffffffffff'
      AND publication_state = 'withdrawn'
  ),
  'withdraw keeps history on the university row'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.audit_events
    WHERE action = 'set_catalog_publication_state'
      AND resource_id = 'ffffff02-ffff-4fff-8fff-ffffffffffff'
      AND safe_diff ->> 'to' = 'withdrawn'
  ),
  'withdraw writes an audit row'
);

SELECT * FROM finish();
ROLLBACK;
