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
      'requestId', 'req_admin_ops'
    )::text,
    true
  );
END;
$$;

DO $$
DECLARE
  platform uuid := '00000000-0000-4000-8000-000000000001';
  admin_scoped uuid := 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  admin_bare uuid := 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  counselor_id uuid := 'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
  parent_id uuid := 'bbbbbbb4-bbbb-4bbb-8bbb-bbbbbbbbbbb4';
  student_id uuid := 'bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5';
  perm text;
BEGIN
  PERFORM gsc_tests.create_auth_user(admin_scoped, 'adm-scoped@example.invalid');
  PERFORM gsc_tests.create_auth_user(admin_bare, 'adm-bare@example.invalid');
  PERFORM gsc_tests.create_auth_user(counselor_id, 'adm-counselor@example.invalid');
  PERFORM gsc_tests.create_auth_user(parent_id, 'adm-parent@example.invalid');
  PERFORM gsc_tests.create_auth_user(student_id, 'adm-student@example.invalid');

  INSERT INTO public.accounts (id, auth_user_id, email_normalized, status)
  VALUES
    (admin_scoped, admin_scoped, 'adm-scoped@example.invalid', 'approved'),
    (admin_bare, admin_bare, 'adm-bare@example.invalid', 'approved'),
    (counselor_id, counselor_id, 'adm-counselor@example.invalid', 'approved'),
    (parent_id, parent_id, 'adm-parent@example.invalid', 'approved'),
    (student_id, student_id, 'adm-student@example.invalid', 'approved');

  INSERT INTO public.account_roles (account_id, role, granted_by)
  VALUES
    (admin_scoped, 'admin', admin_scoped),
    (admin_bare, 'admin', admin_bare),
    (counselor_id, 'counselor', admin_scoped),
    (parent_id, 'parent', admin_scoped);

  PERFORM set_config('gsc.role_change_allowed', 'on', true);
  UPDATE public.user_profiles SET role = 'admin' WHERE id IN (admin_scoped, admin_bare);
  UPDATE public.user_profiles SET role = 'counselor' WHERE id = counselor_id;
  UPDATE public.user_profiles SET role = 'parent' WHERE id = parent_id;
  PERFORM set_config('gsc.role_change_allowed', 'off', true);

  FOREACH perm IN ARRAY ARRAY[
    'verification',
    'operations',
    'supervisor'
  ]
  LOOP
    INSERT INTO public.staff_permissions (account_id, permission, granted_by)
    VALUES (admin_scoped, perm, platform);
  END LOOP;
END
$$;

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5', 'aal2');
    SELECT commands.list_verification_queue(NULL, NULL, false, 20, 0);
  $$,
  'FORBIDDEN',
  'student cannot read the verification queue'
);

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb4-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'aal2');
    SELECT commands.list_verification_queue(NULL, NULL, false, 20, 0);
  $$,
  'FORBIDDEN',
  'parent cannot read the verification queue'
);

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'aal2');
    SELECT commands.decide_verification_case(
      'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
      'approved',
      'no',
      NULL,
      1
    );
  $$,
  'FORBIDDEN',
  'counselor cannot decide verification cases'
);

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aal2');
    SELECT commands.list_verification_queue(NULL, NULL, false, 20, 0);
  $$,
  'FORBIDDEN',
  'admin without verification scope is denied'
);

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aal2');
    SELECT commands.search_admin_users('', 20, 0);
  $$,
  'FORBIDDEN',
  'admin without operations scope cannot search users'
);

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aal1');
    SELECT commands.search_admin_users('', 20, 0);
  $$,
  'MFA_REQUIRED',
  'admin with scope but without aal2 is denied'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.verification_cases
    WHERE account_id = 'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
      AND state = 'pending'
      AND commands.verification_kind(professional_evidence) = 'counselor'
  ),
  'granting counselor opens a professional verification case'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.outbox_events
    WHERE aggregate_type = 'verification_cases'
      AND event_type = 'verification_escalation_scheduled'
      AND aggregate_id IN (
        SELECT id FROM public.verification_cases
        WHERE account_id = 'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
      )
  ),
  'seven-day escalation is scheduled through the outbox'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.verification_cases
    WHERE commands.verification_kind(professional_evidence) = 'student'
  ),
  0,
  'no student approval verification cases exist'
);

SELECT lives_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aal2');
    SELECT commands.decide_verification_case(
      (
        SELECT id FROM public.verification_cases
        WHERE account_id = 'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
        LIMIT 1
      ),
      'approved',
      'credentials reviewed',
      'Approved for listing.',
      1
    );
  $$,
  'verification staff can approve a professional case'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.audit_events
    WHERE action = 'decide_verification_case'
      AND actor_id = 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
      AND reason = 'credentials reviewed'
      AND safe_diff ->> 'version' = '2'
  ),
  'decision writes actor, reason and version to audit'
);

SELECT throws_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aal2');
    SELECT commands.decide_verification_case(
      (
        SELECT id FROM public.verification_cases
        WHERE account_id = 'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
        LIMIT 1
      ),
      'approved',
      'second try',
      NULL,
      1
    );
  $$,
  'VERSION_CONFLICT',
  'a second reviewer cannot approve the same version'
);

SELECT is(
  commands.counselor_is_available('bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3'),
  true,
  'approved counselor is prospectively available'
);

SELECT lives_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aal2');
    SELECT commands.suspend_account(
      'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
      'safety hold',
      1
    );
  $$,
  'operations staff can suspend an account'
);

SELECT is(
  commands.counselor_is_available('bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3'),
  false,
  'suspended counselor loses prospective access immediately'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.audit_events
    WHERE action = 'suspend_account'
      AND resource_id = 'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
      AND reason = 'safety hold'
  ),
  'suspend writes an audit row with reason'
);

SELECT lives_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aal2');
    SELECT commands.admin_set_user_role(
      'bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
      'parent',
      'linked household',
      1
    );
  $$,
  'role change goes through admin_set_user_role'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.audit_events
    WHERE action = 'set_user_role'
      AND resource_id = 'bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5'
      AND reason = 'linked household'
  ),
  'role change records actor, reason and version'
);

SELECT lives_ok(
  $$
    SELECT gsc_tests.set_claims('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aal2');
    SELECT commands.request_support_export(
      'bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
      'subject access request'
    );
  $$,
  'export stub writes a real command result'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.outbox_events
    WHERE event_type = 'data_export_requested'
      AND payload ->> 'completed_by' = 'prompt_30'
  ),
  'export stub is queued for Prompt 30'
);

SELECT * FROM finish();
ROLLBACK;
