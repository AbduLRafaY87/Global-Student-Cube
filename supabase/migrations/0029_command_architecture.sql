-- Protected command architecture (spec: unexposed commands schema,
-- gsc_api_executor only, no anon/authenticated/service_role mutation on
-- user_profiles or applications). Do not expose `commands` in the Data API.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gsc_api_executor') THEN
    CREATE ROLE gsc_api_executor NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gsc_worker') THEN
    CREATE ROLE gsc_worker NOLOGIN NOINHERIT;
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE 'GRANT CONNECT ON DATABASE postgres TO gsc_api_executor';
EXCEPTION
  WHEN insufficient_privilege OR undefined_object THEN
    NULL;
END
$$;

REVOKE ALL ON SCHEMA commands FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA commands TO gsc_api_executor;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_version_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_version_check CHECK (version > 0);

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_version_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_version_check CHECK (version > 0);

CREATE TABLE IF NOT EXISTS public.idempotency_records (
  actor_key text NOT NULL,
  method text NOT NULL,
  path_hash text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  response_cipher bytea,
  http_status integer,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (actor_key, method, path_hash, key)
);

ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.idempotency_records FROM PUBLIC, anon, authenticated, service_role;

DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
DROP POLICY IF EXISTS applications_insert_own ON public.applications;
DROP POLICY IF EXISTS applications_update_own ON public.applications;
DROP POLICY IF EXISTS applications_delete_own ON public.applications;

REVOKE INSERT, UPDATE, DELETE ON public.user_profiles
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.applications
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.applications TO authenticated;

CREATE OR REPLACE FUNCTION commands.actor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  raw text;
  claims jsonb;
  sub text;
BEGIN
  raw := nullif(current_setting('request.jwt.claims', true), '');
  IF raw IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  claims := raw::jsonb;
  sub := claims ->> 'sub';
  IF sub IS NULL OR sub = '' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN sub::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
END;
$$;

CREATE OR REPLACE FUNCTION commands.audit_actor(p_auth_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT a.id FROM public.accounts a WHERE a.id = p_auth_id
$$;

CREATE OR REPLACE FUNCTION commands.request_id()
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
    RETURN NULL;
  END IF;
  RETURN raw::jsonb ->> 'requestId';
END;
$$;

CREATE OR REPLACE FUNCTION commands.update_user_profile(
  p_expected_version bigint,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_onboarding_completed boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  current public.user_profiles%ROWTYPE;
  new_version bigint;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_onboarded boolean;
BEGIN
  actor := commands.actor_id();

  IF p_expected_version IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION_REQUIRED';
  END IF;

  v_first_name := btrim(COALESCE(p_first_name, ''));
  v_last_name := btrim(COALESCE(p_last_name, ''));
  v_phone := NULLIF(btrim(COALESCE(p_phone, '')), '');

  IF v_first_name = '' OR v_last_name = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO current
  FROM public.user_profiles
  WHERE id = actor
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF current.version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  new_version := current.version + 1;
  v_onboarded := COALESCE(p_onboarding_completed, current.onboarding_completed);

  UPDATE public.user_profiles
  SET
    first_name = v_first_name,
    last_name = v_last_name,
    phone = v_phone,
    onboarding_completed = v_onboarded,
    version = new_version,
    updated_at = now()
  WHERE id = actor;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'update_user_profile',
    'user_profiles',
    actor,
    NULL,
    commands.request_id(),
    jsonb_build_object(
      'beforeVersion', current.version,
      'afterVersion', new_version
    )
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'user_profiles',
    actor,
    new_version,
    'user_profile_updated',
    jsonb_build_object('account_id', actor, 'version', new_version)
  );

  RETURN jsonb_build_object(
    'id', actor,
    'first_name', v_first_name,
    'last_name', v_last_name,
    'phone', v_phone,
    'onboarding_completed', v_onboarded,
    'version', new_version
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_application(
  p_university_id uuid,
  p_status text,
  p_deadline date,
  p_idempotency_key text,
  p_request_hash text,
  p_path_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  existing public.idempotency_records%ROWTYPE;
  created public.applications%ROWTYPE;
  payload jsonb;
BEGIN
  actor := commands.actor_id();

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'INVALID_REQUEST';
  END IF;

  IF p_university_id IS NULL OR p_deadline IS NULL
     OR p_status NOT IN ('draft', 'submitted', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.universities WHERE id = p_university_id
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  DELETE FROM public.idempotency_records WHERE expires_at < now();

  SELECT * INTO existing
  FROM public.idempotency_records
  WHERE actor_key = actor::text
    AND method = 'POST'
    AND path_hash = p_path_hash
    AND key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF existing.request_hash IS DISTINCT FROM p_request_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN convert_from(existing.response_cipher, 'UTF8')::jsonb;
  END IF;

  INSERT INTO public.applications (
    student_id, university_id, status, deadline, version
  )
  VALUES (
    actor, p_university_id, p_status, p_deadline, 1
  )
  RETURNING * INTO created;

  payload := jsonb_build_object(
    'id', created.id,
    'student_id', created.student_id,
    'university_id', created.university_id,
    'status', created.status,
    'deadline', created.deadline,
    'version', created.version
  );

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'create_application',
    'applications',
    created.id,
    NULL,
    commands.request_id(),
    jsonb_build_object('beforeVersion', NULL, 'afterVersion', created.version)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'applications',
    created.id,
    created.version,
    'application_created',
    payload
  );

  INSERT INTO public.idempotency_records (
    actor_key, method, path_hash, key, request_hash,
    response_cipher, http_status, expires_at
  ) VALUES (
    actor::text,
    'POST',
    p_path_hash,
    p_idempotency_key,
    p_request_hash,
    convert_to(payload::text, 'UTF8'),
    201,
    now() + interval '7 days'
  );

  RETURN payload;
END;
$$;

CREATE OR REPLACE FUNCTION commands.update_application(
  p_id uuid,
  p_expected_version bigint,
  p_university_id uuid,
  p_status text,
  p_deadline date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  current public.applications%ROWTYPE;
  new_version bigint;
  next_university uuid;
  next_status text;
  next_deadline date;
BEGIN
  actor := commands.actor_id();

  IF p_expected_version IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION_REQUIRED';
  END IF;

  IF p_status IS NOT NULL
     AND p_status NOT IN ('draft', 'submitted', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO current
  FROM public.applications
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND OR current.student_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF current.version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  next_university := COALESCE(p_university_id, current.university_id);
  next_status := COALESCE(p_status, current.status);
  next_deadline := COALESCE(p_deadline, current.deadline);

  IF NOT EXISTS (
    SELECT 1 FROM public.universities WHERE id = next_university
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  new_version := current.version + 1;

  UPDATE public.applications
  SET
    university_id = next_university,
    status = next_status,
    deadline = next_deadline,
    version = new_version,
    updated_at = now()
  WHERE id = p_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'update_application',
    'applications',
    p_id,
    NULL,
    commands.request_id(),
    jsonb_build_object(
      'beforeVersion', current.version,
      'afterVersion', new_version
    )
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'applications',
    p_id,
    new_version,
    'application_updated',
    jsonb_build_object('id', p_id, 'version', new_version, 'status', next_status)
  );

  RETURN jsonb_build_object(
    'id', p_id,
    'student_id', actor,
    'university_id', next_university,
    'status', next_status,
    'deadline', next_deadline,
    'version', new_version
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.delete_application(
  p_id uuid,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  current public.applications%ROWTYPE;
  new_version bigint;
BEGIN
  actor := commands.actor_id();

  IF p_expected_version IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION_REQUIRED';
  END IF;

  SELECT * INTO current
  FROM public.applications
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND OR current.student_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF current.version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  new_version := current.version + 1;

  DELETE FROM public.applications WHERE id = p_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'delete_application',
    'applications',
    p_id,
    NULL,
    commands.request_id(),
    jsonb_build_object(
      'beforeVersion', current.version,
      'afterVersion', new_version
    )
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'applications',
    p_id,
    new_version,
    'application_deleted',
    jsonb_build_object('id', p_id, 'version', new_version)
  );

  RETURN jsonb_build_object('id', p_id, 'version', new_version);
END;
$$;

ALTER FUNCTION commands.bump_abuse(text, integer, integer) SECURITY DEFINER;
ALTER FUNCTION commands.consume_reset_token(text, uuid) SECURITY DEFINER;
ALTER FUNCTION commands.next_gsc_id() SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.register_student_account(
  uuid, text, text, text, text, text, date, text, text, text, jsonb, text, text, text, jsonb, text, text, text, text, boolean, boolean
);
DROP FUNCTION IF EXISTS public.activate_after_email_verified(uuid);
DROP FUNCTION IF EXISTS public.bump_abuse(text, integer, integer);
DROP FUNCTION IF EXISTS public.consume_reset_token(text, uuid);

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commands
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;

ALTER DEFAULT PRIVILEGES IN SCHEMA commands
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA commands
  GRANT EXECUTE ON FUNCTIONS TO gsc_api_executor;
