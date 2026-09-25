-- Spec WP-03 / settings: data export, 30-day deletion, legal holds,
-- phone OTP challenges (hash only), support and protected safety intake,
-- operational analytics without causal claims.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  state text NOT NULL,
  due_at timestamptz,
  expires_at timestamptz,
  reason text,
  package jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT data_requests_kind_check CHECK (kind IN ('export', 'delete')),
  CONSTRAINT data_requests_state_check CHECK (state IN (
    'queued', 'processing', 'ready', 'held', 'completed', 'failed', 'cancelled'
  ))
);

CREATE INDEX IF NOT EXISTS data_requests_account_idx
  ON public.data_requests (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS data_requests_state_due_idx
  ON public.data_requests (state, due_at);

CREATE TABLE IF NOT EXISTS public.legal_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  reason_cipher bytea NOT NULL,
  authorized_by uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  review_at timestamptz NOT NULL,
  released_at timestamptz
);

CREATE INDEX IF NOT EXISTS legal_holds_resource_idx
  ON public.legal_holds (resource_type, resource_id);

CREATE TABLE IF NOT EXISTS public.phone_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  phone_hash text NOT NULL,
  code_hash text,
  provider text NOT NULL,
  provider_sid text,
  attempt_count integer NOT NULL DEFAULT 0,
  send_count integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CONSTRAINT phone_challenges_provider_check CHECK (provider IN ('sandbox', 'twilio')),
  CONSTRAINT phone_challenges_no_raw_otp CHECK (code_hash IS NULL OR length(code_hash) >= 32)
);

CREATE INDEX IF NOT EXISTS phone_challenges_account_idx
  ON public.phone_challenges (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  requester_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  reply_channel text,
  category text NOT NULL,
  description text NOT NULL,
  is_safety boolean NOT NULL DEFAULT false,
  safety_report_id uuid REFERENCES public.safety_reports (id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'open',
  reference_code text NOT NULL,
  CONSTRAINT support_requests_state_check CHECK (state IN ('open', 'reviewing', 'closed')),
  CONSTRAINT support_requests_category_check CHECK (category IN (
    'account', 'privacy', 'technical', 'safety', 'other'
  )),
  CONSTRAINT support_requests_reference_key UNIQUE (reference_code)
);

CREATE INDEX IF NOT EXISTS support_requests_requester_idx
  ON public.support_requests (requester_id, created_at DESC);

ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_holds FORCE ROW LEVEL SECURITY;
ALTER TABLE public.phone_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.data_requests FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.legal_holds FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.phone_challenges FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.support_requests FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION commands.has_open_legal_hold(p_type text, p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, commands
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.legal_holds
    WHERE resource_type = p_type AND resource_id = p_id AND released_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION commands.build_account_export(p_account uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'account', (
      SELECT jsonb_build_object(
        'id', a.id,
        'gscId', a.gsc_id,
        'status', a.status,
        'createdAt', a.created_at,
        'phoneVerifiedAt', a.phone_verified_at
      )
      FROM public.accounts a WHERE a.id = p_account
    ),
    'profile', (
      SELECT jsonb_build_object(
        'firstName', p.first_name,
        'lastName', p.last_name,
        'role', p.role
      )
      FROM public.user_profiles p WHERE p.id = p_account
    ),
    'consents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'purpose', c.purpose,
        'decision', c.decision,
        'policyVersion', c.policy_version,
        'occurredAt', c.occurred_at
      ) ORDER BY c.occurred_at)
      FROM public.consent_events c
      WHERE c.subject_id = p_account OR c.actor_id = p_account
    ), '[]'::jsonb),
    'files', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', f.id,
        'purpose', f.purpose,
        'state', f.state,
        'createdAt', f.created_at
      ) ORDER BY f.created_at)
      FROM public.files f WHERE f.owner_id = p_account
    ), '[]'::jsonb),
    'milestones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'kind', m.kind,
        'occurredOn', m.occurred_on,
        'verificationState', m.verification_state
      ) ORDER BY m.kind)
      FROM public.journey_milestones m
      JOIN public.cases cs ON cs.id = m.case_id
      WHERE cs.student_account_id = p_account
    ), '[]'::jsonb),
    'excluded', jsonb_build_array(
      'private_notes',
      'safety_evidence',
      'other_participant_records'
    )
  );
  RETURN payload;
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_data_request(
  p_account uuid,
  p_kind text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  request_id uuid;
  due timestamptz;
  pkg jsonb := '{}'::jsonb;
  state text := 'queued';
BEGIN
  actor := commands.actor_id();
  IF actor IS DISTINCT FROM p_account
     AND NOT commands.has_staff_permission(actor, 'operations') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_kind NOT IN ('export', 'delete') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_account) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF p_kind = 'export' THEN
    pkg := commands.build_account_export(p_account);
    state := 'ready';
    due := now() + interval '24 hours';
  ELSE
    due := now() + interval '30 days';
    UPDATE public.accounts
    SET status = 'deletion_pending', updated_at = now(), version = version + 1
    WHERE id = p_account AND status <> 'deletion_pending';
    UPDATE public.parent_links
    SET status = 'revoked', revoked_at = now()
    WHERE revoked_at IS NULL
      AND (
        parent_id = p_account
        OR case_id IN (
          SELECT id FROM public.cases WHERE student_account_id = p_account
        )
      );
    UPDATE public.content_items
    SET publication_state = 'withdrawn', updated_at = now(), version = version + 1
    WHERE (subject_account_id = p_account OR created_by = p_account)
      AND publication_state IN ('published', 'submitted', 'review', 'consent_check');
    IF commands.has_open_legal_hold('accounts', p_account) THEN
      state := 'held';
    END IF;
  END IF;

  INSERT INTO public.data_requests (
    account_id, requested_by, kind, state, due_at, expires_at, reason, package
  ) VALUES (
    p_account, actor, p_kind, state, due,
    CASE WHEN p_kind = 'export' THEN due ELSE NULL END,
    nullif(p_reason, ''), pkg
  )
  RETURNING id INTO request_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    CASE WHEN p_kind = 'export' THEN 'request_data_export' ELSE 'request_account_deletion' END,
    'data_requests',
    request_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('kind', p_kind, 'state', state, 'stub', false)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'data_requests', request_id, 1,
    CASE WHEN p_kind = 'export' THEN 'data_export_ready' ELSE 'account_deletion_started' END,
    jsonb_build_object('accountId', p_account, 'kind', p_kind, 'state', state)
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'id', request_id,
    'kind', p_kind,
    'status', state,
    'dueAt', due,
    'package', CASE WHEN p_kind = 'export' THEN pkg ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.request_support_export(
  p_account_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  PERFORM commands.require_admin_scope('operations');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  RETURN commands.create_data_request(p_account_id, 'export', p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION commands.request_support_deletion(
  p_account_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  PERFORM commands.require_admin_scope('operations');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  RETURN commands.create_data_request(p_account_id, 'delete', p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_my_data_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'kind', r.kind,
        'status', r.state,
        'dueAt', r.due_at,
        'createdAt', r.created_at,
        'hold', commands.has_open_legal_hold('accounts', r.account_id)
      ) ORDER BY r.created_at DESC)
      FROM public.data_requests r
      WHERE r.account_id = actor OR r.requested_by = actor
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_data_request(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.data_requests%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.data_requests WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.account_id <> actor AND row.requested_by <> actor
     AND NOT commands.has_staff_permission(actor, 'operations') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF row.kind = 'export' AND row.expires_at IS NOT NULL AND row.expires_at < now() THEN
    RETURN jsonb_build_object('id', row.id, 'kind', row.kind, 'status', 'expired');
  END IF;
  RETURN jsonb_build_object(
    'id', row.id,
    'kind', row.kind,
    'status', row.state,
    'dueAt', row.due_at,
    'package', CASE WHEN row.kind = 'export' THEN row.package ELSE NULL END,
    'hold', commands.has_open_legal_hold('accounts', row.account_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.process_deletion_request(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.data_requests%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  IF actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  SELECT * INTO row FROM public.data_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR row.kind <> 'delete' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.account_id <> actor AND NOT commands.has_staff_permission(actor, 'operations') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF commands.has_open_legal_hold('accounts', row.account_id) THEN
    UPDATE public.data_requests SET state = 'held', updated_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('id', p_id, 'status', 'held');
  END IF;
  IF row.due_at IS NOT NULL AND row.due_at > now()
     AND NOT commands.has_staff_permission(actor, 'operations') THEN
    RETURN jsonb_build_object('id', p_id, 'status', row.state, 'dueAt', row.due_at);
  END IF;

  UPDATE public.identities
  SET full_name = 'Deleted',
      family_name = 'Deleted',
      city = 'Deleted',
      address = '{}'::jsonb,
      phone_hash = 'deleted',
      phone_cipher = '\x00',
      whatsapp_cipher = NULL,
      social_urls = '[]'::jsonb,
      updated_at = now(),
      version = version + 1
  WHERE account_id = row.account_id;

  UPDATE public.user_profiles
  SET first_name = 'Deleted', last_name = 'Deleted', phone = NULL
  WHERE id = row.account_id;

  UPDATE public.data_requests
  SET state = 'completed', updated_at = now()
  WHERE id = p_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'process_account_deletion',
    'data_requests',
    p_id,
    commands.request_id(),
    jsonb_build_object(
      'retained', jsonb_build_array('reward_entries', 'audit_events', 'consent_events')
    )
  );
  RETURN jsonb_build_object('id', p_id, 'status', 'completed');
END;
$$;

CREATE OR REPLACE FUNCTION commands.place_legal_hold(
  p_type text,
  p_id uuid,
  p_reason text,
  p_review_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  hold_id uuid;
BEGIN
  actor := commands.require_admin_scope('operations');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 OR p_review_at IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  INSERT INTO public.legal_holds (
    resource_type, resource_id, reason_cipher, authorized_by, review_at
  ) VALUES (
    p_type, p_id, convert_to(p_reason, 'UTF8'), actor, p_review_at
  )
  RETURNING id INTO hold_id;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'place_legal_hold', p_type, p_id, p_reason,
    commands.request_id(), jsonb_build_object('holdId', hold_id, 'reviewAt', p_review_at)
  );
  RETURN jsonb_build_object('id', hold_id, 'status', 'held');
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_my_consents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'purpose', c.purpose,
        'decision', c.decision,
        'policyVersion', c.policy_version,
        'occurredAt', c.occurred_at,
        'evidenceHash', c.evidence_hash
      ) ORDER BY c.occurred_at DESC)
      FROM public.consent_events c
      WHERE c.subject_id = actor OR c.actor_id = actor
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.start_phone_challenge(
  p_phone_hash text,
  p_code_hash text,
  p_provider text,
  p_provider_sid text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  sends integer;
  challenge_id uuid;
BEGIN
  actor := commands.actor_id();
  IF p_phone_hash IS NULL OR p_provider NOT IN ('sandbox', 'twilio') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.identities i
    WHERE i.account_id = actor AND i.phone_hash = p_phone_hash
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT count(*) INTO sends
  FROM public.phone_challenges
  WHERE phone_hash = p_phone_hash
    AND created_at >= now() - interval '1 hour';
  IF sends >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;
  UPDATE public.phone_challenges
  SET consumed_at = now()
  WHERE account_id = actor AND consumed_at IS NULL;

  INSERT INTO public.phone_challenges (
    account_id, phone_hash, code_hash, provider, provider_sid, expires_at
  ) VALUES (
    actor, p_phone_hash, p_code_hash, p_provider, p_provider_sid,
    now() + interval '5 minutes'
  )
  RETURNING id INTO challenge_id;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'start_phone_challenge', 'phone_challenges',
    challenge_id, commands.request_id(),
    jsonb_build_object('provider', p_provider, 'storesRawOtp', false)
  );
  RETURN jsonb_build_object(
    'id', challenge_id,
    'expiresAt', now() + interval '5 minutes',
    'resendAfterSeconds', 60
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.verify_phone_challenge(
  p_challenge uuid,
  p_code_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.phone_challenges%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.phone_challenges WHERE id = p_challenge FOR UPDATE;
  IF NOT FOUND OR row.account_id <> actor THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.consumed_at IS NOT NULL OR row.expires_at < now() THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF row.attempt_count >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;
  UPDATE public.phone_challenges
  SET attempt_count = attempt_count + 1
  WHERE id = p_challenge;
  IF row.code_hash IS NULL OR row.code_hash <> p_code_hash THEN
    IF row.attempt_count + 1 >= 5 THEN
      UPDATE public.phone_challenges SET consumed_at = now() WHERE id = p_challenge;
    END IF;
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  UPDATE public.phone_challenges SET consumed_at = now() WHERE id = p_challenge;
  UPDATE public.accounts
  SET phone_verified_at = now(), updated_at = now(), version = version + 1
  WHERE id = actor;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'verify_phone', 'accounts', actor,
    commands.request_id(), jsonb_build_object('challengeId', p_challenge)
  );
  RETURN jsonb_build_object('verified', true, 'isLoginMfa', false);
END;
$$;

CREATE OR REPLACE FUNCTION commands.confirm_twilio_phone_challenge(p_challenge uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.phone_challenges%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.phone_challenges WHERE id = p_challenge FOR UPDATE;
  IF NOT FOUND OR row.account_id <> actor OR row.provider <> 'twilio' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.consumed_at IS NOT NULL OR row.expires_at < now() OR row.attempt_count >= 5 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  UPDATE public.phone_challenges SET consumed_at = now() WHERE id = p_challenge;
  UPDATE public.accounts
  SET phone_verified_at = now(), updated_at = now(), version = version + 1
  WHERE id = actor;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'verify_phone', 'accounts', actor,
    commands.request_id(), jsonb_build_object('challengeId', p_challenge, 'provider', 'twilio')
  );
  RETURN jsonb_build_object('verified', true, 'isLoginMfa', false);
END;
$$;

CREATE OR REPLACE FUNCTION commands.submit_support_request(
  p_category text,
  p_description text,
  p_reply_channel text,
  p_is_safety boolean,
  p_subject uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  report_id uuid;
  request_id uuid;
  reference text;
BEGIN
  BEGIN
    actor := commands.actor_id();
  EXCEPTION
    WHEN OTHERS THEN
      actor := NULL;
  END;
  IF p_category IS NULL OR p_category NOT IN ('account', 'privacy', 'technical', 'safety', 'other') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_description IS NULL OR length(btrim(p_description)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF actor IS NULL AND (p_reply_channel IS NULL OR length(btrim(p_reply_channel)) = 0) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF (p_is_safety OR p_category = 'safety') AND actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  reference := 'GSC-HLP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  IF p_is_safety OR p_category = 'safety' THEN
    INSERT INTO public.safety_reports (reporter_id, subject_id, case_id, evidence, state)
    VALUES (
      actor,
      p_subject,
      NULL,
      jsonb_build_object('detail', left(p_description, 2000), 'forwardToCounselor', false),
      'open'
    )
    RETURNING id INTO report_id;
    INSERT INTO public.moderation_reviews (
      queue_type, resource_type, resource_id, title, redacted_context,
      is_protected, status
    ) VALUES (
      'safety',
      'safety_reports',
      report_id,
      'Protected safety intake',
      'A protected safety complaint was filed. Full text is visible only to the designated safety admin.',
      true,
      'open'
    )
    ON CONFLICT (resource_type, resource_id) DO NOTHING;
  END IF;

  INSERT INTO public.support_requests (
    requester_id, reply_channel, category, description, is_safety,
    safety_report_id, reference_code
  ) VALUES (
    actor, nullif(p_reply_channel, ''), p_category, left(p_description, 4000),
    p_is_safety OR p_category = 'safety', report_id, reference
  )
  RETURNING id INTO request_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'submit_support_request',
    'support_requests',
    request_id,
    commands.request_id(),
    jsonb_build_object('safety', p_is_safety OR p_category = 'safety', 'reference', reference)
  );
  RETURN jsonb_build_object('id', request_id, 'reference', reference, 'safety', p_is_safety OR p_category = 'safety');
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_my_support_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'reference', s.reference_code,
        'category', s.category,
        'state', s.state,
        'createdAt', s.created_at,
        'safety', s.is_safety
      ) ORDER BY s.created_at DESC)
      FROM public.support_requests s
      WHERE s.requester_id = actor
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_support_request(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.support_requests%ROWTYPE;
  can_safety boolean;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.support_requests WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  can_safety := commands.has_staff_permission(actor, 'safety');
  IF row.requester_id IS DISTINCT FROM actor
     AND NOT commands.has_staff_permission(actor, 'operations')
     AND NOT can_safety THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN jsonb_build_object(
    'id', row.id,
    'reference', row.reference_code,
    'category', row.category,
    'state', row.state,
    'createdAt', row.created_at,
    'safety', row.is_safety,
    'description', CASE
      WHEN row.is_safety AND row.requester_id IS DISTINCT FROM actor AND NOT can_safety
        THEN NULL
      ELSE row.description
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.admin_operational_analytics(
  p_from timestamptz,
  p_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  approved integer;
  module_complete integer;
  bookings integer;
  attended integer;
  points bigint;
  mentors integer;
  internships integer;
  placements integer;
  verified_placements integer;
  influence_yes integer;
  influence_answers integer;
BEGIN
  actor := commands.require_admin_scope('operations');
  SELECT count(*) INTO approved
  FROM public.accounts
  WHERE status = 'approved'
    AND (p_from IS NULL OR created_at >= p_from)
    AND (p_to IS NULL OR created_at <= p_to);
  SELECT count(*) INTO module_complete
  FROM public.cases
  WHERE module2_completed_at IS NOT NULL AND module3_completed_at IS NOT NULL;
  SELECT count(*) INTO bookings FROM public.bookings
  WHERE (p_from IS NULL OR created_at >= p_from);
  SELECT count(*) INTO attended FROM public.bookings
  WHERE session_state IN ('completed', 'ended');
  SELECT COALESCE(sum(points), 0) INTO points
  FROM public.points_entries
  WHERE event_type IN ('earn_mentoring', 'earn_referral');
  SELECT count(DISTINCT mentor_account_id) INTO mentors
  FROM public.mentoring_connections;
  SELECT count(*) INTO internships
  FROM public.journey_milestones WHERE kind = 'internship' AND occurred_on IS NOT NULL;
  SELECT count(*) INTO placements
  FROM public.journey_milestones WHERE kind = 'first_job' AND occurred_on IS NOT NULL;
  SELECT count(*) INTO verified_placements
  FROM public.journey_milestones
  WHERE kind = 'first_job' AND verification_state = 'verified';
  SELECT count(*) INTO influence_yes
  FROM public.journey_milestones
  WHERE details ->> 'platformInfluenced' = 'yes';
  SELECT count(*) INTO influence_answers
  FROM public.journey_milestones
  WHERE details ->> 'platformInfluenced' IN ('yes', 'no');

  RETURN jsonb_build_object(
    'refreshedAt', now(),
    'caution', 'Perceived platform influence is not causal attribution. Do not label temporal associations as platform advantage.',
    'minimumCohort', 10,
    'metrics', jsonb_build_array(
      jsonb_build_object(
        'id', 'activation',
        'label', 'Seven-day activation coverage',
        'numerator', module_complete,
        'denominator', approved,
        'unknown', 0,
        'cohortSize', approved,
        'selfReported', 0,
        'verified', module_complete
      ),
      jsonb_build_object(
        'id', 'attendance',
        'label', 'Session attendance',
        'numerator', attended,
        'denominator', bookings,
        'unknown', GREATEST(bookings - attended, 0),
        'cohortSize', bookings,
        'selfReported', 0,
        'verified', attended
      ),
      jsonb_build_object(
        'id', 'rewards',
        'label', 'Points issued and active mentors',
        'numerator', points,
        'denominator', mentors,
        'unknown', 0,
        'cohortSize', mentors,
        'selfReported', 0,
        'verified', points
      ),
      jsonb_build_object(
        'id', 'placement',
        'label', 'Placement outcomes',
        'numerator', placements,
        'denominator', placements,
        'unknown', internships,
        'cohortSize', placements,
        'selfReported', placements - verified_placements,
        'verified', verified_placements
      ),
      jsonb_build_object(
        'id', 'influence',
        'label', 'Perceived platform influence',
        'numerator', influence_yes,
        'denominator', influence_answers,
        'unknown', 0,
        'cohortSize', influence_answers,
        'selfReported', influence_answers,
        'verified', 0
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.my_account_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN jsonb_build_object(
    'accountId', actor,
    'gscId', (SELECT gsc_id FROM public.accounts WHERE id = actor),
    'status', (SELECT status FROM public.accounts WHERE id = actor),
    'phoneVerifiedAt', (SELECT phone_verified_at FROM public.accounts WHERE id = actor),
    'firstName', (SELECT first_name FROM public.user_profiles WHERE id = actor),
    'lastName', (SELECT last_name FROM public.user_profiles WHERE id = actor),
    'role', (SELECT role FROM public.user_profiles WHERE id = actor),
    'roles', COALESCE((
      SELECT jsonb_agg(r.role)
      FROM public.account_roles r
      WHERE r.account_id = actor AND r.revoked_at IS NULL
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.record_phone_challenge_failure(p_challenge uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.phone_challenges%ROWTYPE;
  next_count integer;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.phone_challenges WHERE id = p_challenge FOR UPDATE;
  IF NOT FOUND OR row.account_id <> actor THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.consumed_at IS NOT NULL OR row.expires_at < now() THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  next_count := row.attempt_count + 1;
  UPDATE public.phone_challenges
  SET attempt_count = next_count,
      consumed_at = CASE WHEN next_count >= 5 THEN now() ELSE consumed_at END
  WHERE id = p_challenge;
  RETURN jsonb_build_object(
    'accepted', false,
    'invalidated', next_count >= 5,
    'attemptCount', next_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_security_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'action', e.action,
        'occurredAt', e.occurred_at
      ) ORDER BY e.occurred_at DESC)
      FROM (
        SELECT id, action, occurred_at
        FROM public.audit_events
        WHERE actor_id = actor
          AND action IN (
            'email_verified', 'verify_phone', 'start_phone_challenge',
            'request_data_export', 'request_account_deletion'
          )
        ORDER BY occurred_at DESC
        LIMIT 20
      ) e
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commands
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
