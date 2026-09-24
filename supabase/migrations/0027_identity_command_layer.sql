-- Spec identity tables, command functions, GSC counter, consent immutability.
-- D2: public signup is student-only; GSC ids are allocated at account creation
-- because admin approval is removed.

CREATE SCHEMA IF NOT EXISTS commands;

REVOKE ALL ON SCHEMA commands FROM PUBLIC;
GRANT USAGE ON SCHEMA commands TO service_role;

CREATE TABLE IF NOT EXISTS public.countries (
  code char(2) PRIMARY KEY,
  name text NOT NULL,
  supported boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.platform_counters (
  name text PRIMARY KEY,
  next_value bigint NOT NULL CHECK (next_value > 0)
);

INSERT INTO public.platform_counters (name, next_value)
VALUES ('gsc_id', 1)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.abuse_buckets (
  key_hash text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL CHECK (count >= 0),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS abuse_buckets_expires_at_idx
  ON public.abuse_buckets (expires_at);

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  email_normalized text NOT NULL,
  status text NOT NULL,
  gsc_id text,
  approved_at timestamptz,
  last_signed_in_at timestamptz,
  CONSTRAINT accounts_auth_user_match
    CHECK (auth_user_id IS NULL OR auth_user_id = id),
  CONSTRAINT accounts_status_check CHECK (status IN (
    'email_pending',
    'phone_pending',
    'guardian_pending',
    'review_pending',
    'approved',
    'rejected',
    'suspended',
    'deletion_pending'
  )),
  CONSTRAINT accounts_auth_user_id_key UNIQUE (auth_user_id),
  CONSTRAINT accounts_email_normalized_key UNIQUE (email_normalized),
  CONSTRAINT accounts_gsc_id_key UNIQUE (gsc_id)
);

CREATE INDEX IF NOT EXISTS accounts_status_created_at_id_idx
  ON public.accounts (status, created_at, id);

CREATE TABLE IF NOT EXISTS public.account_roles (
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN (
    'student',
    'parent',
    'alumni',
    'mentor',
    'counselor',
    'admin'
  )),
  granted_by uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, role)
);

CREATE TABLE IF NOT EXISTS public.identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  family_name text NOT NULL DEFAULT '',
  parent_spouse_name text,
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'prefer_not_to_say')),
  dob date NOT NULL,
  nationality char(2) NOT NULL REFERENCES public.countries (code),
  residence_country char(2) NOT NULL REFERENCES public.countries (code),
  city text NOT NULL,
  address jsonb NOT NULL,
  phone_cipher bytea NOT NULL,
  phone_hash text NOT NULL,
  whatsapp_cipher bytea,
  social_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT identities_account_id_key UNIQUE (account_id)
);

CREATE TABLE IF NOT EXISTS public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  student_account_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  operating_guardian_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  student_name text NOT NULL,
  student_dob date NOT NULL,
  passport_status text CHECK (passport_status IN ('yes', 'no', 'in_process')),
  state text NOT NULL,
  module2_completed_at timestamptz,
  module3_completed_at timestamptz,
  CONSTRAINT cases_actor_present CHECK (
    student_account_id IS NOT NULL OR operating_guardian_id IS NOT NULL
  ),
  CONSTRAINT cases_student_account_id_key UNIQUE (student_account_id)
);

CREATE INDEX IF NOT EXISTS cases_state_idx ON public.cases (state);

CREATE TABLE IF NOT EXISTS public.consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  subject_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  case_id uuid REFERENCES public.cases (id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  purpose text NOT NULL,
  policy_version text NOT NULL,
  decision boolean NOT NULL,
  evidence_hash text NOT NULL,
  occurred_at timestamptz NOT NULL,
  CONSTRAINT consent_subject_or_case CHECK (
    subject_id IS NOT NULL OR case_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS consent_events_case_purpose_occurred_idx
  ON public.consent_events (case_id, purpose, occurred_at);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  reason text,
  request_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  safe_diff jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS audit_events_resource_occurred_idx
  ON public.audit_events (resource_type, resource_id, occurred_at);

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version bigint NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  dispatched_at timestamptz,
  CONSTRAINT outbox_events_once UNIQUE (
    aggregate_type,
    aggregate_id,
    aggregate_version,
    event_type
  )
);

CREATE TABLE IF NOT EXISTS public.registration_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  intent_key text NOT NULL UNIQUE,
  email_hash text NOT NULL,
  payload_hash text NOT NULL,
  state text NOT NULL,
  auth_user_id uuid,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.consumed_reset_tokens (
  token_hash text PRIMARY KEY,
  account_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  consumed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.prevent_immutable_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'This record cannot be changed';
END;
$$;

DROP TRIGGER IF EXISTS consent_events_no_update ON public.consent_events;
CREATE TRIGGER consent_events_no_update
  BEFORE UPDATE ON public.consent_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_immutable_row();

DROP TRIGGER IF EXISTS consent_events_no_delete ON public.consent_events;
CREATE TRIGGER consent_events_no_delete
  BEFORE DELETE ON public.consent_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_immutable_row();

DROP TRIGGER IF EXISTS audit_events_no_update ON public.audit_events;
CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_immutable_row();

DROP TRIGGER IF EXISTS audit_events_no_delete ON public.audit_events;
CREATE TRIGGER audit_events_no_delete
  BEFORE DELETE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_immutable_row();

CREATE OR REPLACE FUNCTION commands.format_gsc_id(p_seq bigint)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  rolled bigint;
  letter_index integer;
  remainder bigint;
BEGIN
  IF p_seq IS NULL OR p_seq < 1 THEN
    RAISE EXCEPTION 'GSC sequence must be a positive integer';
  END IF;

  IF p_seq <= 999999 THEN
    RETURN 'GSC-' || lpad(p_seq::text, 6, '0');
  END IF;

  rolled := p_seq - 999999;
  letter_index := ((rolled - 1) / 999999);
  remainder := ((rolled - 1) % 999999) + 1;

  IF letter_index > 25 THEN
    RAISE EXCEPTION 'GSC identifier namespace is exhausted';
  END IF;

  RETURN 'GSC-' || chr(65 + letter_index) || lpad(remainder::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION commands.next_gsc_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, commands
AS $$
DECLARE
  seq bigint;
BEGIN
  UPDATE public.platform_counters
  SET next_value = next_value + 1
  WHERE name = 'gsc_id'
  RETURNING next_value - 1 INTO seq;

  IF seq IS NULL THEN
    RAISE EXCEPTION 'gsc_id counter is missing';
  END IF;

  RETURN commands.format_gsc_id(seq);
END;
$$;

CREATE OR REPLACE FUNCTION commands.bump_abuse(
  p_key_hash text,
  p_window_seconds integer,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  bucket public.abuse_buckets%ROWTYPE;
  retry_seconds integer;
BEGIN
  DELETE FROM public.abuse_buckets WHERE expires_at < now();

  SELECT * INTO bucket
  FROM public.abuse_buckets
  WHERE key_hash = p_key_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.abuse_buckets (key_hash, window_start, count, expires_at)
    VALUES (
      p_key_hash,
      now(),
      1,
      now() + make_interval(secs => p_window_seconds)
    );
    RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
  END IF;

  IF bucket.window_start + make_interval(secs => p_window_seconds) <= now() THEN
    UPDATE public.abuse_buckets
    SET window_start = now(),
        count = 1,
        expires_at = now() + make_interval(secs => p_window_seconds)
    WHERE key_hash = p_key_hash;
    RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
  END IF;

  IF bucket.count >= p_limit THEN
    retry_seconds := GREATEST(
      1,
      ceil(
        extract(
          epoch FROM (
            bucket.window_start + make_interval(secs => p_window_seconds) - now()
          )
        )
      )::integer
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', retry_seconds
    );
  END IF;

  UPDATE public.abuse_buckets
  SET count = count + 1
  WHERE key_hash = p_key_hash;

  RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
END;
$$;

CREATE OR REPLACE FUNCTION commands.consume_reset_token(
  p_token_hash text,
  p_account_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.consumed_reset_tokens (token_hash, account_id)
  VALUES (p_token_hash, p_account_id);
  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION commands.register_student_account(
  p_account_id uuid,
  p_email_normalized text,
  p_full_name text,
  p_family_name text,
  p_parent_spouse_name text,
  p_gender text,
  p_dob date,
  p_nationality text,
  p_residence_country text,
  p_city text,
  p_address jsonb,
  p_phone_cipher bytea,
  p_phone_hash text,
  p_whatsapp_cipher bytea,
  p_social_urls jsonb,
  p_passport_status text,
  p_age_band text,
  p_policy_version text,
  p_evidence_hash text,
  p_consent_email boolean,
  p_consent_whatsapp boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  allocated_id text;
  case_row_id uuid;
  account_status text;
  case_state text;
  occurred timestamptz := now();
BEGIN
  IF p_dob >= (now() AT TIME ZONE 'utc')::date THEN
    RAISE EXCEPTION 'Date of birth must be in the past';
  END IF;

  IF p_age_band NOT IN ('teen', 'adult') THEN
    RAISE EXCEPTION 'Independent student accounts require age 13 or over';
  END IF;

  account_status := 'email_pending';
  case_state := CASE WHEN p_age_band = 'teen' THEN 'guardian_pending' ELSE 'open' END;
  allocated_id := commands.next_gsc_id();

  INSERT INTO public.accounts (
    id,
    auth_user_id,
    email_normalized,
    status,
    gsc_id
  )
  VALUES (
    p_account_id,
    p_account_id,
    p_email_normalized,
    account_status,
    allocated_id
  );

  INSERT INTO public.account_roles (account_id, role, granted_by)
  VALUES (p_account_id, 'student', p_account_id);

  INSERT INTO public.identities (
    account_id,
    full_name,
    family_name,
    parent_spouse_name,
    gender,
    dob,
    nationality,
    residence_country,
    city,
    address,
    phone_cipher,
    phone_hash,
    whatsapp_cipher,
    social_urls
  )
  VALUES (
    p_account_id,
    p_full_name,
    COALESCE(p_family_name, ''),
    NULLIF(p_parent_spouse_name, ''),
    p_gender,
    p_dob,
    p_nationality,
    p_residence_country,
    p_city,
    p_address,
    p_phone_cipher,
    p_phone_hash,
    p_whatsapp_cipher,
    COALESCE(p_social_urls, '[]'::jsonb)
  );

  INSERT INTO public.cases (
    student_account_id,
    student_name,
    student_dob,
    passport_status,
    state
  )
  VALUES (
    p_account_id,
    p_full_name,
    p_dob,
    NULLIF(p_passport_status, ''),
    case_state
  )
  RETURNING id INTO case_row_id;

  INSERT INTO public.consent_events (
    subject_id,
    case_id,
    actor_id,
    purpose,
    policy_version,
    decision,
    evidence_hash,
    occurred_at
  )
  VALUES
    (
      p_account_id,
      case_row_id,
      p_account_id,
      'data_use',
      p_policy_version,
      true,
      p_evidence_hash,
      occurred
    ),
    (
      p_account_id,
      case_row_id,
      p_account_id,
      'email_notices',
      p_policy_version,
      p_consent_email,
      p_evidence_hash,
      occurred
    ),
    (
      p_account_id,
      case_row_id,
      p_account_id,
      'whatsapp_notices',
      p_policy_version,
      p_consent_whatsapp,
      p_evidence_hash,
      occurred
    );

  INSERT INTO public.audit_events (
    actor_id,
    action,
    resource_type,
    resource_id,
    occurred_at,
    safe_diff
  )
  VALUES (
    p_account_id,
    'register_student',
    'accounts',
    p_account_id,
    occurred,
    jsonb_build_object('status', account_status, 'age_band', p_age_band)
  );

  INSERT INTO public.outbox_events (
    aggregate_type,
    aggregate_id,
    aggregate_version,
    event_type,
    payload
  )
  VALUES (
    'accounts',
    p_account_id,
    1,
    'student_registered',
    jsonb_build_object(
      'account_id', p_account_id,
      'case_id', case_row_id,
      'status', account_status
    )
  );

  UPDATE public.user_profiles
  SET
    first_name = split_part(p_full_name, ' ', 1),
    last_name = CASE
      WHEN position(' ' IN p_full_name) = 0 THEN ''
      ELSE substr(p_full_name, position(' ' IN p_full_name) + 1)
    END,
    updated_at = now()
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'account_id', p_account_id,
    'case_id', case_row_id,
    'gsc_id', allocated_id,
    'status', account_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.activate_after_email_verified(p_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  next_status text;
  years integer;
BEGIN
  SELECT a.status INTO current_status
  FROM public.accounts a
  WHERE a.id = p_account_id
  FOR UPDATE;

  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  IF current_status IN ('approved', 'guardian_pending') THEN
    RETURN current_status;
  END IF;

  IF current_status <> 'email_pending' THEN
    RETURN current_status;
  END IF;

  SELECT extract(
    year FROM age(now() AT TIME ZONE 'utc', i.dob)
  )::integer
  INTO years
  FROM public.identities i
  WHERE i.account_id = p_account_id;

  IF years IS NULL THEN
    RAISE EXCEPTION 'Identity not found';
  END IF;

  IF years < 13 THEN
    RAISE EXCEPTION 'Independent student accounts require age 13 or over';
  END IF;

  next_status := CASE WHEN years < 18 THEN 'guardian_pending' ELSE 'approved' END;

  UPDATE public.accounts
  SET
    status = next_status,
    approved_at = CASE WHEN next_status = 'approved' THEN now() ELSE approved_at END,
    updated_at = now(),
    version = version + 1
  WHERE id = p_account_id;

  INSERT INTO public.audit_events (
    actor_id,
    action,
    resource_type,
    resource_id,
    occurred_at,
    safe_diff
  )
  VALUES (
    p_account_id,
    'email_verified',
    'accounts',
    p_account_id,
    now(),
    jsonb_build_object('status', next_status)
  );

  INSERT INTO public.outbox_events (
    aggregate_type,
    aggregate_id,
    aggregate_version,
    event_type,
    payload
  )
  VALUES (
    'accounts',
    p_account_id,
    2,
    'email_verified',
    jsonb_build_object('status', next_status)
  );

  RETURN next_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, first_name, last_name, phone, role)
  VALUES (NEW.id, '', '', NULL, 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumed_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_buckets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.identities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events FORCE ROW LEVEL SECURITY;

CREATE POLICY countries_select_authenticated
  ON public.countries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY accounts_select_own
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY identities_select_own
  ON public.identities
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

CREATE POLICY cases_select_own
  ON public.cases
  FOR SELECT
  TO authenticated
  USING (student_account_id = auth.uid());

CREATE POLICY consent_events_select_own
  ON public.consent_events
  FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid() OR subject_id = auth.uid());

REVOKE ALL ON public.accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.account_roles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.identities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.cases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.consent_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.audit_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.outbox_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.registration_intents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.consumed_reset_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.platform_counters FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.abuse_buckets FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.countries TO anon, authenticated;
GRANT SELECT ON public.accounts TO authenticated;
GRANT SELECT ON public.identities TO authenticated;
GRANT SELECT ON public.cases TO authenticated;
GRANT SELECT ON public.consent_events TO authenticated;

REVOKE ALL ON FUNCTION commands.register_student_account(
  uuid, text, text, text, text, text, date, text, text, text, jsonb, bytea, text, bytea, jsonb, text, text, text, text, boolean, boolean
) FROM PUBLIC;
REVOKE ALL ON FUNCTION commands.activate_after_email_verified(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION commands.bump_abuse(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION commands.consume_reset_token(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION commands.next_gsc_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION commands.format_gsc_id(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION commands.register_student_account(
  uuid, text, text, text, text, text, date, text, text, text, jsonb, bytea, text, bytea, jsonb, text, text, text, text, boolean, boolean
) TO service_role;
GRANT EXECUTE ON FUNCTION commands.activate_after_email_verified(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION commands.bump_abuse(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION commands.consume_reset_token(text, uuid) TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO service_role;

CREATE OR REPLACE FUNCTION public.register_student_account(
  p_account_id uuid,
  p_email_normalized text,
  p_full_name text,
  p_family_name text,
  p_parent_spouse_name text,
  p_gender text,
  p_dob date,
  p_nationality text,
  p_residence_country text,
  p_city text,
  p_address jsonb,
  p_phone_cipher_hex text,
  p_phone_hash text,
  p_whatsapp_cipher_hex text,
  p_social_urls jsonb,
  p_passport_status text,
  p_age_band text,
  p_policy_version text,
  p_evidence_hash text,
  p_consent_email boolean,
  p_consent_whatsapp boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  RETURN commands.register_student_account(
    p_account_id,
    p_email_normalized,
    p_full_name,
    p_family_name,
    p_parent_spouse_name,
    p_gender,
    p_dob,
    p_nationality,
    p_residence_country,
    p_city,
    p_address,
    decode(p_phone_cipher_hex, 'hex'),
    p_phone_hash,
    CASE
      WHEN p_whatsapp_cipher_hex IS NULL OR p_whatsapp_cipher_hex = '' THEN NULL
      ELSE decode(p_whatsapp_cipher_hex, 'hex')
    END,
    p_social_urls,
    p_passport_status,
    p_age_band,
    p_policy_version,
    p_evidence_hash,
    p_consent_email,
    p_consent_whatsapp
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_after_email_verified(p_account_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, commands
AS $$
  SELECT commands.activate_after_email_verified(p_account_id);
$$;

CREATE OR REPLACE FUNCTION public.bump_abuse(
  p_key_hash text,
  p_window_seconds integer,
  p_limit integer
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, commands
AS $$
  SELECT commands.bump_abuse(p_key_hash, p_window_seconds, p_limit);
$$;

CREATE OR REPLACE FUNCTION public.consume_reset_token(
  p_token_hash text,
  p_account_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, commands
AS $$
  SELECT commands.consume_reset_token(p_token_hash, p_account_id);
$$;

REVOKE ALL ON FUNCTION public.register_student_account(
  uuid, text, text, text, text, text, date, text, text, text, jsonb, text, text, text, jsonb, text, text, text, text, boolean, boolean
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_after_email_verified(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_abuse(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_reset_token(text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_student_account(
  uuid, text, text, text, text, text, date, text, text, text, jsonb, text, text, text, jsonb, text, text, text, text, boolean, boolean
) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_after_email_verified(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_abuse(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_reset_token(text, uuid) TO service_role;
