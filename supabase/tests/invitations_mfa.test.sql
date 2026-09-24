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

CREATE OR REPLACE FUNCTION gsc_tests.set_jwt(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text,
    true
  );
END;
$$;

GRANT USAGE ON SCHEMA gsc_tests TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA gsc_tests TO authenticated, anon, postgres;

DO $$
DECLARE
  admin_id uuid := 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  counselor_id uuid := 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
  student_id uuid := 'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
BEGIN
  PERFORM gsc_tests.create_auth_user(admin_id, 'invite-admin@example.invalid');
  PERFORM gsc_tests.create_auth_user(counselor_id, 'invite-counselor@example.invalid');
  PERFORM gsc_tests.create_auth_user(student_id, 'invite-student@example.invalid');

  INSERT INTO public.accounts (id, auth_user_id, email_normalized, status)
  VALUES
    (admin_id, admin_id, 'invite-admin@example.invalid', 'approved'),
    (counselor_id, counselor_id, 'invite-counselor@example.invalid', 'approved'),
    (student_id, student_id, 'invite-student@example.invalid', 'approved');

  INSERT INTO public.account_roles (account_id, role, granted_by)
  VALUES (admin_id, 'admin', admin_id);

  PERFORM set_config('gsc.role_change_allowed', 'on', true);
  UPDATE public.user_profiles SET role = 'admin' WHERE id = admin_id;
  UPDATE public.user_profiles SET role = 'counselor' WHERE id = counselor_id;
  PERFORM set_config('gsc.role_change_allowed', 'off', true);
END
$$;

SELECT is(
  (SELECT role FROM public.user_profiles WHERE id = 'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3'),
  'student',
  'public-created profile remains a student'
);

SELECT throws_ok(
  $$
    SELECT set_config(
      'request.jwt.claims',
      '{"sub":"aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3","assurance":"aal1"}',
      true
    );
    SELECT commands.create_invitation(
      'hash-email',
      'hash-token-student',
      'counselor',
      '{}',
      now() + interval '7 days',
      'invite-student@example.invalid'
    );
  $$,
  'MFA_REQUIRED',
  'student without aal2 cannot create invitations'
);

SELECT throws_ok(
  $$
    SELECT set_config(
      'request.jwt.claims',
      '{"sub":"aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2","assurance":"aal1"}',
      true
    );
    SELECT commands.create_invitation(
      'hash-email',
      'hash-token-counselor',
      'counselor',
      '{}',
      now() + interval '7 days',
      'invite-counselor@example.invalid'
    );
  $$,
  'MFA_REQUIRED',
  'counselor without MFA cannot run privileged invite commands'
);

SELECT lives_ok(
  $$
    SELECT set_config(
      'request.jwt.claims',
      '{"sub":"aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1","assurance":"aal2"}',
      true
    );
    SELECT commands.create_invitation(
      'invitee-email-hash',
      'invite-token-hash-1',
      'counselor',
      '{}',
      now() + interval '7 days',
      'invite-admin@example.invalid'
    );
  $$,
  'admin with aal2 can create an invitation'
);

SELECT throws_ok(
  $$
    SELECT set_config(
      'request.jwt.claims',
      '{"sub":"aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3","assurance":"aal1"}',
      true
    );
    SELECT commands.accept_invitation(
      'invite-token-hash-1',
      'wrong-email-hash',
      'invite-student@example.invalid'
    );
  $$,
  'FORBIDDEN',
  'invite email binding is enforced'
);

SELECT lives_ok(
  $$
    SELECT set_config(
      'request.jwt.claims',
      '{"sub":"aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3","assurance":"aal1"}',
      true
    );
    SELECT commands.accept_invitation(
      'invite-token-hash-1',
      'invitee-email-hash',
      'invite-student@example.invalid'
    );
  $$,
  'matching invitee can accept once'
);

SELECT is(
  (SELECT role FROM public.user_profiles WHERE id = 'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3'),
  'counselor',
  'accepted counselor invite updates leftover home-role projection'
);

SELECT throws_ok(
  $$
    SELECT set_config(
      'request.jwt.claims',
      '{"sub":"aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3","assurance":"aal1"}',
      true
    );
    SELECT commands.accept_invitation(
      'invite-token-hash-1',
      'invitee-email-hash',
      'invite-student@example.invalid'
    );
  $$,
  'INVALID_REQUEST',
  'reused invite token fails'
);

INSERT INTO public.invitations (
  inviter_id, email_hash, token_hash, role, scopes, expires_at
)
VALUES (
  'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'expired-email-hash',
  'expired-token-hash',
  'mentor',
  '{}',
  now() - interval '1 day'
);

SELECT throws_ok(
  $$
    SELECT set_config(
      'request.jwt.claims',
      '{"sub":"aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2","assurance":"aal1"}',
      true
    );
    SELECT commands.accept_invitation(
      'expired-token-hash',
      'expired-email-hash',
      'invite-counselor@example.invalid'
    );
  $$,
  'NOT_FOUND',
  'expired invite token fails'
);

SELECT throws_ok(
  $$
    SELECT set_config(
      'request.jwt.claims',
      '{"sub":"aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1","assurance":"aal2"}',
      true
    );
    SELECT commands.grant_staff_permission(
      'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'operations',
      NULL
    );
  $$,
  'FORBIDDEN',
  'staff permission cannot be self-granted'
);

SELECT lives_ok(
  $$
    SELECT set_config(
      'request.jwt.claims',
      '{"sub":"aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1","assurance":"aal2"}',
      true
    );
    SELECT commands.grant_staff_permission(
      'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      'operations',
      NULL
    );
  $$,
  'admin may grant a staff permission to another account'
);

SELECT throws_ok(
  $$UPDATE public.user_profiles
    SET role = 'admin'
    WHERE id = 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2'$$,
  'User roles can only be changed through the admin role function',
  'direct UPDATE of user_profiles.role is rejected'
);

SET ROLE authenticated;
SELECT gsc_tests.set_jwt('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3');

SELECT throws_ok(
  $$SELECT public.set_user_role(
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'admin'
  )$$,
  'P0001',
  'Only administrators can change user roles',
  'non-admin cannot call set_user_role'
);

RESET ROLE;
SET ROLE authenticated;
SELECT gsc_tests.set_jwt('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1');

SELECT lives_ok(
  $$SELECT public.set_user_role(
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'parent'
  )$$,
  'set_user_role remains the admin-callable leftover role path'
);

RESET ROLE;

SELECT is(
  (SELECT role FROM public.user_profiles WHERE id = 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
  'parent',
  'set_user_role updates the leftover home-role projection'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3","assurance":"aal1"}',
  true
);

SELECT lives_ok(
  $$SELECT commands.replace_mfa_recovery_codes(
    ARRAY['hash-one', 'hash-two'],
    'invite-student@example.invalid'
  )$$,
  'recovery codes can be stored hashed'
);

SELECT is(
  commands.consume_mfa_recovery_code('hash-one'),
  true,
  'first recovery-code use succeeds'
);

SELECT is(
  commands.consume_mfa_recovery_code('hash-one'),
  false,
  'consumed recovery code cannot be reused'
);

SELECT * FROM finish();
ROLLBACK;
