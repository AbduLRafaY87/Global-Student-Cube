-- Invite-only staff/parent roles, staff permissions, MFA recovery codes.
-- user_profiles.role remains the leftover home-role projection.

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  inviter_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  email_hash text NOT NULL,
  token_hash text NOT NULL,
  role text NOT NULL CHECK (role IN (
    'parent',
    'alumni',
    'mentor',
    'counselor',
    'admin'
  )),
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  revoked_at timestamptz,
  CONSTRAINT invitations_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS invitations_expires_at_idx
  ON public.invitations (expires_at);

CREATE TABLE IF NOT EXISTS public.parent_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  inviter_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  target_email_hash text NOT NULL,
  token_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT parent_invitations_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS parent_invitations_expires_at_idx
  ON public.parent_invitations (expires_at);

CREATE TABLE IF NOT EXISTS public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  parent_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('adult_authorized', 'verified_guardian')),
  status text NOT NULL CHECK (status IN (
    'draft',
    'invited',
    'accepted_pending_verification',
    'active',
    'declined',
    'revoked',
    'expired'
  )),
  authorized_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  verified_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  revoked_at timestamptz,
  CONSTRAINT parent_links_case_parent_key UNIQUE (case_id, parent_id)
);

CREATE TABLE IF NOT EXISTS public.staff_permissions (
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  permission text NOT NULL CHECK (permission IN (
    'verification',
    'catalog_editorial',
    'case_oversight',
    'safety',
    'rewards_approval',
    'operations',
    'supervisor'
  )),
  expires_at timestamptz,
  granted_by uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, permission),
  CONSTRAINT staff_permissions_no_self_grant CHECK (granted_by <> account_id)
);

CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  code_hash text NOT NULL,
  consumed_at timestamptz,
  CONSTRAINT mfa_recovery_codes_code_hash_key UNIQUE (code_hash)
);

CREATE INDEX IF NOT EXISTS mfa_recovery_codes_account_idx
  ON public.mfa_recovery_codes (account_id);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parent_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parent_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_recovery_codes FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.invitations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.parent_invitations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.parent_links FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.staff_permissions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.mfa_recovery_codes FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION commands.assurance()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  raw text;
BEGIN
  raw := nullif(current_setting('request.jwt.claims', true), '');
  IF raw IS NULL THEN
    RETURN 'none';
  END IF;
  RETURN COALESCE(raw::jsonb ->> 'assurance', 'none');
END;
$$;

CREATE OR REPLACE FUNCTION commands.require_aal2()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = commands
AS $$
BEGIN
  IF commands.assurance() IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'MFA_REQUIRED';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION commands.projected_home_role(p_account_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE account_id = p_account_id AND role = 'admin' AND revoked_at IS NULL
    ) THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE account_id = p_account_id AND role = 'counselor' AND revoked_at IS NULL
    ) THEN 'counselor'
    WHEN EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE account_id = p_account_id AND role = 'parent' AND revoked_at IS NULL
    ) THEN 'parent'
    ELSE 'student'
  END
$$;

CREATE OR REPLACE FUNCTION commands.sync_home_role(p_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  projected text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE account_id = p_account_id AND revoked_at IS NULL
  ) THEN
    RETURN NULL;
  END IF;

  projected := commands.projected_home_role(p_account_id);
  PERFORM set_config('gsc.role_change_allowed', 'on', true);
  UPDATE public.user_profiles
  SET role = projected, updated_at = now()
  WHERE id = p_account_id
    AND role IS DISTINCT FROM projected;
  RETURN projected;
END;
$$;

CREATE OR REPLACE FUNCTION commands.is_admin_actor(p_actor uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = p_actor AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE account_id = p_actor AND role = 'admin' AND revoked_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION commands.require_privileged_admin()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  PERFORM commands.require_aal2();
  IF NOT commands.is_admin_actor(actor) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN actor;
END;
$$;

CREATE OR REPLACE FUNCTION commands.ensure_account(
  p_account_id uuid,
  p_email_normalized text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.accounts (id, auth_user_id, email_normalized, status)
  VALUES (p_account_id, p_account_id, p_email_normalized, 'email_pending')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION commands.apply_role_grant(
  p_actor uuid,
  p_target uuid,
  p_role text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grantor uuid;
  projected text;
BEGIN
  IF p_role NOT IN ('student', 'parent', 'alumni', 'mentor', 'counselor', 'admin') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF EXISTS (SELECT 1 FROM public.accounts WHERE id = p_target) THEN
    grantor := COALESCE(
      (SELECT id FROM public.accounts WHERE id = p_actor),
      p_target
    );

    INSERT INTO public.account_roles (account_id, role, granted_by, revoked_at)
    VALUES (p_target, p_role, grantor, NULL)
    ON CONFLICT (account_id, role) DO UPDATE
      SET revoked_at = NULL,
          granted_by = EXCLUDED.granted_by;

    projected := commands.sync_home_role(p_target);
  ELSE
    IF p_role NOT IN ('student', 'parent', 'counselor', 'admin') THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
    PERFORM set_config('gsc.role_change_allowed', 'on', true);
    UPDATE public.user_profiles
    SET role = p_role, updated_at = now()
    WHERE id = p_target;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;
    projected := p_role;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(p_actor),
    'grant_account_role',
    'account_roles',
    p_target,
    NULL,
    commands.request_id(),
    jsonb_build_object('role', p_role, 'homeRole', projected)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'account_roles',
    p_target,
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    'account_role_granted',
    jsonb_build_object('account_id', p_target, 'role', p_role)
  );

  RETURN COALESCE(projected, p_role);
END;
$$;

CREATE OR REPLACE FUNCTION commands.apply_role_revoke(
  p_actor uuid,
  p_target uuid,
  p_role text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  projected text;
BEGIN
  UPDATE public.account_roles
  SET revoked_at = now()
  WHERE account_id = p_target
    AND role = p_role
    AND revoked_at IS NULL;

  projected := commands.sync_home_role(p_target);

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(p_actor),
    'revoke_account_role',
    'account_roles',
    p_target,
    NULL,
    commands.request_id(),
    jsonb_build_object('role', p_role, 'homeRole', projected)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'account_roles',
    p_target,
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    'account_role_revoked',
    jsonb_build_object('account_id', p_target, 'role', p_role)
  );

  RETURN projected;
END;
$$;

CREATE OR REPLACE FUNCTION commands.grant_account_role(
  p_target uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  projected text;
BEGIN
  actor := commands.require_privileged_admin();
  projected := commands.apply_role_grant(actor, p_target, p_role);
  RETURN jsonb_build_object('account_id', p_target, 'role', p_role, 'homeRole', projected);
END;
$$;

CREATE OR REPLACE FUNCTION commands.revoke_account_role(
  p_target uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  projected text;
BEGIN
  actor := commands.require_privileged_admin();
  projected := commands.apply_role_revoke(actor, p_target, p_role);
  RETURN jsonb_build_object('account_id', p_target, 'role', p_role, 'homeRole', projected);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, target_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  IF target_role NOT IN ('student', 'parent', 'counselor', 'admin') THEN
    RAISE EXCEPTION 'Invalid user role';
  END IF;

  PERFORM commands.apply_role_grant(auth.uid(), target_user_id, target_role);
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_invitation(
  p_email_hash text,
  p_token_hash text,
  p_role text,
  p_scopes text[],
  p_expires_at timestamptz,
  p_inviter_email_normalized text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  invite_id uuid;
BEGIN
  actor := commands.require_privileged_admin();
  PERFORM commands.ensure_account(actor, p_inviter_email_normalized);

  IF p_role NOT IN ('parent', 'alumni', 'mentor', 'counselor', 'admin') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_email_hash IS NULL OR p_token_hash IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.invitations
  SET revoked_at = now()
  WHERE inviter_id = actor
    AND email_hash = p_email_hash
    AND role = p_role
    AND accepted_at IS NULL
    AND revoked_at IS NULL;

  INSERT INTO public.invitations (
    inviter_id, email_hash, token_hash, role, scopes, expires_at
  )
  VALUES (
    actor,
    p_email_hash,
    p_token_hash,
    p_role,
    COALESCE(p_scopes, '{}'),
    COALESCE(p_expires_at, now() + interval '7 days')
  )
  RETURNING id INTO invite_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'create_invitation',
    'invitations',
    invite_id,
    commands.request_id(),
    jsonb_build_object('role', p_role)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'invitations',
    invite_id,
    1,
    'invitation_created',
    jsonb_build_object('invitation_id', invite_id, 'role', p_role)
  );

  RETURN jsonb_build_object(
    'id', invite_id,
    'role', p_role,
    'expiresAt', (SELECT expires_at FROM public.invitations WHERE id = invite_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.revoke_invitation(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_privileged_admin();

  UPDATE public.invitations
  SET revoked_at = now()
  WHERE id = p_invitation_id
    AND revoked_at IS NULL
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'revoke_invitation',
    'invitations',
    p_invitation_id,
    commands.request_id(),
    jsonb_build_object('id', p_invitation_id)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'invitations',
    p_invitation_id,
    2,
    'invitation_revoked',
    jsonb_build_object('invitation_id', p_invitation_id)
  );

  RETURN jsonb_build_object('id', p_invitation_id, 'revoked', true);
END;
$$;

CREATE OR REPLACE FUNCTION commands.preview_invitation(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.invitations%ROWTYPE;
BEGIN
  SELECT * INTO row
  FROM public.invitations
  WHERE token_hash = p_token_hash;

  IF NOT FOUND
    OR row.revoked_at IS NOT NULL
    OR row.accepted_at IS NOT NULL
    OR row.expires_at <= now()
  THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  RETURN jsonb_build_object(
    'id', row.id,
    'role', row.role,
    'expiresAt', row.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.accept_invitation(
  p_token_hash text,
  p_email_hash text,
  p_email_normalized text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.invitations%ROWTYPE;
  projected text;
BEGIN
  actor := commands.actor_id();

  SELECT * INTO row
  FROM public.invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND
    OR row.revoked_at IS NOT NULL
    OR row.expires_at <= now()
  THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF row.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST';
  END IF;

  IF row.email_hash IS DISTINCT FROM p_email_hash THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM commands.ensure_account(actor, p_email_normalized);

  UPDATE public.invitations
  SET accepted_at = now(), accepted_by = actor
  WHERE id = row.id
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_REQUEST';
  END IF;

  projected := commands.apply_role_grant(row.inviter_id, actor, row.role);

  RETURN jsonb_build_object(
    'id', row.id,
    'role', row.role,
    'homeRole', projected
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_parent_invitation(
  p_case_id uuid,
  p_email_hash text,
  p_token_hash text,
  p_scopes text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  invite_id uuid;
  case_student uuid;
BEGIN
  actor := commands.actor_id();

  SELECT student_account_id INTO case_student
  FROM public.cases
  WHERE id = p_case_id;

  IF case_student IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF case_student IS DISTINCT FROM actor
    AND NOT commands.is_admin_actor(actor)
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.parent_invitations (
    case_id, inviter_id, target_email_hash, token_hash, scopes, expires_at
  )
  VALUES (
    p_case_id,
    actor,
    p_email_hash,
    p_token_hash,
    COALESCE(p_scopes, '{}'),
    now() + interval '7 days'
  )
  RETURNING id INTO invite_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'create_parent_invitation',
    'parent_invitations',
    invite_id,
    commands.request_id(),
    jsonb_build_object('case_id', p_case_id)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'parent_invitations',
    invite_id,
    1,
    'parent_invitation_created',
    jsonb_build_object('invitation_id', invite_id, 'case_id', p_case_id)
  );

  RETURN jsonb_build_object('id', invite_id, 'caseId', p_case_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.accept_parent_invitation(
  p_token_hash text,
  p_email_hash text,
  p_email_normalized text,
  p_kind text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.parent_invitations%ROWTYPE;
  link_id uuid;
  kind text;
BEGIN
  actor := commands.actor_id();
  kind := CASE
    WHEN p_kind IN ('adult_authorized', 'verified_guardian') THEN p_kind
    ELSE 'adult_authorized'
  END;

  SELECT * INTO row
  FROM public.parent_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND
    OR row.revoked_at IS NOT NULL
    OR row.expires_at <= now()
  THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF row.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST';
  END IF;

  IF row.target_email_hash IS DISTINCT FROM p_email_hash THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF row.inviter_id = actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM commands.ensure_account(actor, p_email_normalized);
  PERFORM commands.apply_role_grant(row.inviter_id, actor, 'parent');

  UPDATE public.parent_invitations
  SET accepted_at = now()
  WHERE id = row.id
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_REQUEST';
  END IF;

  INSERT INTO public.parent_links (
    case_id, parent_id, kind, status, authorized_by
  )
  VALUES (
    row.case_id,
    actor,
    kind,
    'accepted_pending_verification',
    NULL
  )
  ON CONFLICT (case_id, parent_id) DO UPDATE
    SET status = 'accepted_pending_verification',
        kind = EXCLUDED.kind
  RETURNING id INTO link_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'accept_parent_invitation',
    'parent_links',
    link_id,
    commands.request_id(),
    jsonb_build_object('case_id', row.case_id)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'parent_links',
    link_id,
    1,
    'parent_link_accepted',
    jsonb_build_object('link_id', link_id, 'case_id', row.case_id)
  );

  RETURN jsonb_build_object(
    'id', row.id,
    'linkId', link_id,
    'status', 'accepted_pending_verification'
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.grant_staff_permission(
  p_account_id uuid,
  p_permission text,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_privileged_admin();

  IF actor = p_account_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.staff_permissions (
    account_id, permission, expires_at, granted_by
  )
  VALUES (p_account_id, p_permission, p_expires_at, actor)
  ON CONFLICT (account_id, permission) DO UPDATE
    SET expires_at = EXCLUDED.expires_at,
        granted_by = EXCLUDED.granted_by;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'grant_staff_permission',
    'staff_permissions',
    p_account_id,
    commands.request_id(),
    jsonb_build_object('permission', p_permission)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'staff_permissions',
    p_account_id,
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    'staff_permission_granted',
    jsonb_build_object('account_id', p_account_id, 'permission', p_permission)
  );

  RETURN jsonb_build_object(
    'accountId', p_account_id,
    'permission', p_permission
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.revoke_staff_permission(
  p_account_id uuid,
  p_permission text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_privileged_admin();

  DELETE FROM public.staff_permissions
  WHERE account_id = p_account_id
    AND permission = p_permission;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'revoke_staff_permission',
    'staff_permissions',
    p_account_id,
    commands.request_id(),
    jsonb_build_object('permission', p_permission)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'staff_permissions',
    p_account_id,
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    'staff_permission_revoked',
    jsonb_build_object('account_id', p_account_id, 'permission', p_permission)
  );

  RETURN jsonb_build_object('accountId', p_account_id, 'revoked', true);
END;
$$;

CREATE OR REPLACE FUNCTION commands.replace_mfa_recovery_codes(
  p_code_hashes text[],
  p_email_normalized text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  hash text;
BEGIN
  actor := commands.actor_id();
  PERFORM commands.ensure_account(actor, p_email_normalized);

  DELETE FROM public.mfa_recovery_codes
  WHERE account_id = actor
    AND consumed_at IS NULL;

  FOREACH hash IN ARRAY p_code_hashes
  LOOP
    INSERT INTO public.mfa_recovery_codes (account_id, code_hash)
    VALUES (actor, hash);
  END LOOP;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'replace_mfa_recovery_codes',
    'mfa_recovery_codes',
    actor,
    commands.request_id(),
    jsonb_build_object('count', coalesce(array_length(p_code_hashes, 1), 0))
  );

  RETURN jsonb_build_object('count', coalesce(array_length(p_code_hashes, 1), 0));
END;
$$;

CREATE OR REPLACE FUNCTION commands.consume_mfa_recovery_code(p_code_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  updated integer;
BEGIN
  actor := commands.actor_id();

  UPDATE public.mfa_recovery_codes
  SET consumed_at = now()
  WHERE account_id = actor
    AND code_hash = p_code_hash
    AND consumed_at IS NULL;

  GET DIAGNOSTICS updated = ROW_COUNT;

  IF updated = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'consume_mfa_recovery_code',
    'mfa_recovery_codes',
    actor,
    commands.request_id(),
    jsonb_build_object('consumed', true)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commands
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
