-- ADM-01/02 people and safety operations.
-- verification_cases matches the spec identity table; kind lives in
-- professional_evidence because the spec column list has no kind field.
-- version is required so stale decisions fail (ADM-02 acceptance).

INSERT INTO public.accounts (id, auth_user_id, email_normalized, status)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  NULL,
  'platform@internal.gsc',
  'approved'
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.verification_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  community_cipher bytea,
  professional_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  assigned_to uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  state text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  escalates_at timestamptz NOT NULL,
  internal_comment text,
  CONSTRAINT verification_cases_state_check CHECK (state IN (
    'pending',
    'approved',
    'rejected',
    'needs_information'
  ))
);

CREATE INDEX IF NOT EXISTS verification_cases_state_escalates_idx
  ON public.verification_cases (state, escalates_at);

CREATE INDEX IF NOT EXISTS verification_cases_account_idx
  ON public.verification_cases (account_id, submitted_at DESC);

ALTER TABLE public.verification_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_cases FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.verification_cases
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION commands.has_staff_permission(
  p_account_id uuid,
  p_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_permissions
    WHERE account_id = p_account_id
      AND permission = p_permission
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION commands.require_admin_scope(p_permission text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_privileged_admin();
  IF NOT commands.has_staff_permission(actor, p_permission) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN actor;
END;
$$;

CREATE OR REPLACE FUNCTION commands.staff_permission_list(p_account_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(permission ORDER BY permission),
    '{}'::text[]
  )
  FROM public.staff_permissions
  WHERE account_id = p_account_id
    AND (expires_at IS NULL OR expires_at > now())
$$;

CREATE OR REPLACE FUNCTION commands.verification_kind(p_evidence jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(p_evidence ->> 'kind', '')
$$;

CREATE OR REPLACE FUNCTION commands.counselor_is_available(p_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.id = p_account_id
      AND a.status = 'approved'
      AND EXISTS (
        SELECT 1 FROM public.account_roles r
        WHERE r.account_id = a.id
          AND r.role = 'counselor'
          AND r.revoked_at IS NULL
      )
      AND EXISTS (
        SELECT 1 FROM public.verification_cases v
        WHERE v.account_id = a.id
          AND v.state = 'approved'
          AND commands.verification_kind(v.professional_evidence) = 'counselor'
      )
  )
$$;

CREATE OR REPLACE FUNCTION commands.schedule_verification_escalation(
  p_case_id uuid,
  p_version bigint,
  p_escalates_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'verification_cases',
    p_case_id,
    p_version,
    'verification_escalation_scheduled',
    jsonb_build_object(
      'case_id', p_case_id,
      'escalate_at', p_escalates_at
    )
  )
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION commands.open_verification_case(
  p_account_id uuid,
  p_kind text,
  p_evidence jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  case_id uuid;
  submitted timestamptz := clock_timestamp();
  escalate_at timestamptz := submitted + interval '7 days';
  evidence jsonb;
BEGIN
  IF p_kind NOT IN ('counselor', 'mentor', 'company', 'guardian_link') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.verification_cases
    WHERE account_id = p_account_id
      AND commands.verification_kind(professional_evidence) = p_kind
      AND state IN ('pending', 'needs_information')
  ) THEN
    SELECT id INTO case_id
    FROM public.verification_cases
    WHERE account_id = p_account_id
      AND commands.verification_kind(professional_evidence) = p_kind
      AND state IN ('pending', 'needs_information')
    ORDER BY submitted_at DESC
    LIMIT 1;
    RETURN case_id;
  END IF;

  evidence := COALESCE(p_evidence, '{}'::jsonb) || jsonb_build_object('kind', p_kind);

  INSERT INTO public.verification_cases (
    account_id,
    professional_evidence,
    state,
    submitted_at,
    escalates_at
  ) VALUES (
    p_account_id,
    evidence,
    'pending',
    submitted,
    escalate_at
  )
  RETURNING id INTO case_id;

  PERFORM commands.schedule_verification_escalation(case_id, 1, escalate_at);

  RETURN case_id;
END;
$$;

CREATE OR REPLACE FUNCTION commands.sync_professional_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  kind text;
BEGIN
  IF NEW.revoked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  kind := CASE
    WHEN NEW.role = 'counselor' THEN 'counselor'
    WHEN NEW.role IN ('mentor', 'alumni') THEN 'mentor'
    ELSE NULL
  END;

  IF kind IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM commands.open_verification_case(NEW.account_id, kind, '{}'::jsonb);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS account_roles_open_verification ON public.account_roles;
CREATE TRIGGER account_roles_open_verification
  AFTER INSERT OR UPDATE OF revoked_at ON public.account_roles
  FOR EACH ROW
  EXECUTE FUNCTION commands.sync_professional_verification();

CREATE OR REPLACE FUNCTION commands.sync_guardian_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  IF NEW.kind IS DISTINCT FROM 'verified_guardian' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM 'accepted_pending_verification' THEN
    RETURN NEW;
  END IF;

  PERFORM commands.open_verification_case(
    NEW.parent_id,
    'guardian_link',
    jsonb_build_object(
      'parentLinkId', NEW.id,
      'caseId', NEW.case_id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parent_links_open_verification ON public.parent_links;
CREATE TRIGGER parent_links_open_verification
  AFTER INSERT OR UPDATE OF status, kind ON public.parent_links
  FOR EACH ROW
  EXECUTE FUNCTION commands.sync_guardian_verification();

CREATE OR REPLACE FUNCTION commands.list_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  perms text[];
  queues jsonb := '[]'::jsonb;
BEGIN
  actor := commands.require_privileged_admin();
  perms := commands.staff_permission_list(actor);

  IF commands.has_staff_permission(actor, 'verification') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'professional_review',
        'label', 'Professional reviews',
        'href', '/admin/approvals?kind=professional',
        'count', (
          SELECT count(*)::integer
          FROM public.verification_cases
          WHERE state IN ('pending', 'needs_information')
            AND commands.verification_kind(professional_evidence)
              IN ('counselor', 'mentor', 'company')
        )
      ),
      jsonb_build_object(
        'id', 'guardian_review',
        'label', 'Guardian-link reviews',
        'href', '/admin/approvals?kind=guardian_link',
        'count', (
          SELECT count(*)::integer
          FROM public.verification_cases
          WHERE state IN ('pending', 'needs_information')
            AND commands.verification_kind(professional_evidence) = 'guardian_link'
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'supervisor') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'escalations',
        'label', 'Supervisor escalations',
        'href', '/admin/approvals?escalated=1',
        'count', (
          SELECT count(*)::integer
          FROM public.verification_cases
          WHERE state IN ('pending', 'needs_information')
            AND escalates_at <= now()
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'operations') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'recent_audit',
        'label', 'Recent audited actions',
        'href', '/admin/audit',
        'count', (
          SELECT count(*)::integer
          FROM public.audit_events
          WHERE occurred_at >= now() - interval '7 days'
        )
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'homeRole', 'admin',
    'permissions', to_jsonb(perms),
    'queues', queues,
    'recentAudit', CASE
      WHEN commands.has_staff_permission(actor, 'operations') THEN (
        SELECT COALESCE(
          jsonb_agg(row_to_json(ev)::jsonb ORDER BY ev.occurred_at DESC),
          '[]'::jsonb
        )
        FROM (
          SELECT id, actor_id, action, resource_type, resource_id, occurred_at, reason
          FROM public.audit_events
          ORDER BY occurred_at DESC
          LIMIT 5
        ) ev
      )
      ELSE '[]'::jsonb
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_verification_queue(
  p_kind text,
  p_state text,
  p_escalated boolean,
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  lim integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  off integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  actor := commands.require_privileged_admin();
  IF NOT (
    commands.has_staff_permission(actor, 'verification')
    OR commands.has_staff_permission(actor, 'supervisor')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_escalated AND NOT commands.has_staff_permission(actor, 'supervisor') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(row_to_json(q)::jsonb)
      FROM (
        SELECT
          v.id,
          v.account_id,
          v.state,
          v.version,
          v.submitted_at,
          v.escalates_at,
          v.assigned_to,
          commands.verification_kind(v.professional_evidence) AS kind,
          a.email_normalized,
          a.gsc_id,
          a.status AS account_status,
          (v.escalates_at <= now()) AS escalation_due
        FROM public.verification_cases v
        JOIN public.accounts a ON a.id = v.account_id
        WHERE (
          p_state IS NULL
          OR p_state = ''
          OR v.state = p_state
        )
        AND (
          p_kind IS NULL
          OR p_kind = ''
          OR p_kind = 'professional'
            AND commands.verification_kind(v.professional_evidence)
              IN ('counselor', 'mentor', 'company')
          OR commands.verification_kind(v.professional_evidence) = p_kind
        )
        AND (
          NOT COALESCE(p_escalated, false)
          OR v.escalates_at <= now()
        )
        AND commands.verification_kind(v.professional_evidence)
          IN ('counselor', 'mentor', 'company', 'guardian_link')
        ORDER BY v.submitted_at ASC, v.id ASC
        LIMIT lim OFFSET off
      ) q
    ), '[]'::jsonb),
    'limit', lim,
    'offset', off
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_verification_case(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  payload jsonb;
BEGIN
  IF NOT (
    commands.has_staff_permission(commands.require_privileged_admin(), 'verification')
    OR commands.has_staff_permission(commands.actor_id(), 'supervisor')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT jsonb_build_object(
    'id', v.id,
    'accountId', v.account_id,
    'state', v.state,
    'version', v.version,
    'submittedAt', v.submitted_at,
    'escalatesAt', v.escalates_at,
    'assignedTo', v.assigned_to,
    'kind', commands.verification_kind(v.professional_evidence),
    'emailNormalized', a.email_normalized,
    'gscId', a.gsc_id,
    'accountStatus', a.status,
    'internalComment', v.internal_comment,
    'hasCommunityDeclaration', v.community_cipher IS NOT NULL,
    'evidence', jsonb_build_object(
      'kind', v.professional_evidence ->> 'kind',
      'parentLinkId', v.professional_evidence ->> 'parentLinkId',
      'caseId', v.professional_evidence ->> 'caseId',
      'applicantMessage', v.professional_evidence ->> 'applicantMessage'
    ),
    'escalationDue', v.escalates_at <= now()
  )
  INTO payload
  FROM public.verification_cases v
  JOIN public.accounts a ON a.id = v.account_id
  WHERE v.id = p_case_id;

  IF payload IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  RETURN payload;
END;
$$;

CREATE OR REPLACE FUNCTION commands.assign_verification_case(
  p_case_id uuid,
  p_reviewer_id uuid,
  p_reason text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.verification_cases%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('verification');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF NOT commands.has_staff_permission(p_reviewer_id, 'verification') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO row
  FROM public.verification_cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF row.version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  IF row.state NOT IN ('pending', 'needs_information') THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  UPDATE public.verification_cases
  SET assigned_to = p_reviewer_id,
      version = version + 1,
      updated_at = now()
  WHERE id = p_case_id
    AND version = p_expected_version
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'assign_verification_case',
    'verification_cases',
    p_case_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object(
      'version', row.version,
      'assignedTo', p_reviewer_id
    )
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'verification_cases',
    p_case_id,
    row.version,
    'verification_case_assigned',
    jsonb_build_object('case_id', p_case_id, 'assigned_to', p_reviewer_id)
  );

  RETURN jsonb_build_object('id', p_case_id, 'version', row.version);
END;
$$;

CREATE OR REPLACE FUNCTION commands.comment_verification_case(
  p_case_id uuid,
  p_comment text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.verification_cases%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('verification');

  IF p_comment IS NULL OR length(btrim(p_comment)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.verification_cases
  SET internal_comment = btrim(p_comment),
      version = version + 1,
      updated_at = now()
  WHERE id = p_case_id
    AND version = p_expected_version
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'comment_verification_case',
    'verification_cases',
    p_case_id,
    'internal_comment',
    commands.request_id(),
    jsonb_build_object('version', row.version)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'verification_cases',
    p_case_id,
    row.version,
    'verification_case_commented',
    jsonb_build_object('case_id', p_case_id)
  );

  RETURN jsonb_build_object('id', p_case_id, 'version', row.version);
END;
$$;

CREATE OR REPLACE FUNCTION commands.decide_verification_case(
  p_case_id uuid,
  p_decision text,
  p_reason text,
  p_applicant_message text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.verification_cases%ROWTYPE;
  kind text;
  link_id uuid;
BEGIN
  actor := commands.require_admin_scope('verification');

  IF p_decision NOT IN ('approved', 'rejected', 'needs_information') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_decision IN ('approved', 'rejected')
    AND (p_reason IS NULL OR length(btrim(p_reason)) = 0)
  THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO row
  FROM public.verification_cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF row.version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  IF row.state NOT IN ('pending', 'needs_information') THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  kind := commands.verification_kind(row.professional_evidence);

  UPDATE public.verification_cases
  SET state = p_decision,
      assigned_to = COALESCE(assigned_to, actor),
      professional_evidence = professional_evidence
        || jsonb_build_object(
          'applicantMessage', NULLIF(btrim(COALESCE(p_applicant_message, '')), '')
        ),
      version = version + 1,
      updated_at = now()
  WHERE id = p_case_id
    AND version = p_expected_version
    AND state IN ('pending', 'needs_information')
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  IF kind = 'guardian_link' AND p_decision IN ('approved', 'rejected') THEN
    link_id := NULLIF(row.professional_evidence ->> 'parentLinkId', '')::uuid;
    IF link_id IS NOT NULL THEN
      UPDATE public.parent_links
      SET status = CASE
            WHEN p_decision = 'approved' THEN 'active'
            ELSE 'declined'
          END,
          verified_by = CASE
            WHEN p_decision = 'approved' THEN actor
            ELSE verified_by
          END
      WHERE id = link_id
        AND status = 'accepted_pending_verification';
    END IF;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'decide_verification_case',
    'verification_cases',
    p_case_id,
    NULLIF(btrim(COALESCE(p_reason, '')), ''),
    commands.request_id(),
    jsonb_build_object(
      'version', row.version,
      'decision', p_decision,
      'kind', kind
    )
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'verification_cases',
    p_case_id,
    row.version,
    'verification_case_decided',
    jsonb_build_object(
      'case_id', p_case_id,
      'decision', p_decision,
      'kind', kind
    )
  );

  RETURN jsonb_build_object(
    'id', p_case_id,
    'state', p_decision,
    'version', row.version
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.escalate_verification_case(
  p_case_id uuid,
  p_reason text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.verification_cases%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('supervisor');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.verification_cases
  SET assigned_to = actor,
      professional_evidence = professional_evidence
        || jsonb_build_object('escalated', true),
      version = version + 1,
      updated_at = now()
  WHERE id = p_case_id
    AND version = p_expected_version
    AND state IN ('pending', 'needs_information')
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'escalate_verification_case',
    'verification_cases',
    p_case_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('version', row.version, 'assignedTo', actor)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'verification_cases',
    p_case_id,
    row.version,
    'verification_case_escalated',
    jsonb_build_object('case_id', p_case_id, 'supervisor_id', actor)
  );

  RETURN jsonb_build_object('id', p_case_id, 'version', row.version);
END;
$$;

CREATE OR REPLACE FUNCTION commands.search_admin_users(
  p_query text,
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  lim integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  off integer := GREATEST(COALESCE(p_offset, 0), 0);
  needle text := lower(btrim(COALESCE(p_query, '')));
BEGIN
  PERFORM commands.require_admin_scope('operations');

  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(row_to_json(u)::jsonb)
      FROM (
        SELECT
          a.id,
          a.email_normalized,
          a.status,
          a.gsc_id,
          a.version,
          a.updated_at,
          commands.projected_home_role(a.id) AS home_role,
          COALESCE(
            i.full_name,
            NULLIF(btrim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '')
          ) AS display_name
        FROM public.accounts a
        LEFT JOIN public.identities i ON i.account_id = a.id
        LEFT JOIN public.user_profiles p ON p.id = a.id
        WHERE a.id <> '00000000-0000-4000-8000-000000000001'
          AND (
            needle = ''
            OR a.email_normalized LIKE needle || '%'
            OR a.gsc_id ILIKE needle || '%'
            OR COALESCE(i.full_name, '') ILIKE '%' || needle || '%'
            OR COALESCE(p.first_name, '') ILIKE needle || '%'
            OR COALESCE(p.last_name, '') ILIKE needle || '%'
          )
        ORDER BY a.created_at DESC, a.id
        LIMIT lim OFFSET off
      ) u
    ), '[]'::jsonb),
    'limit', lim,
    'offset', off
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_admin_user(p_account_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  payload jsonb;
BEGIN
  PERFORM commands.require_admin_scope('operations');

  SELECT jsonb_build_object(
    'id', a.id,
    'emailNormalized', a.email_normalized,
    'status', a.status,
    'gscId', a.gsc_id,
    'version', a.version,
    'updatedAt', a.updated_at,
    'homeRole', commands.projected_home_role(a.id),
    'displayName', COALESCE(
      i.full_name,
      NULLIF(btrim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '')
    ),
    'roles', COALESCE((
      SELECT jsonb_agg(r.role ORDER BY r.role)
      FROM public.account_roles r
      WHERE r.account_id = a.id AND r.revoked_at IS NULL
    ), '[]'::jsonb),
    'permissions', to_jsonb(commands.staff_permission_list(a.id)),
    'counselorAvailable', commands.counselor_is_available(a.id)
  )
  INTO payload
  FROM public.accounts a
  LEFT JOIN public.identities i ON i.account_id = a.id
  LEFT JOIN public.user_profiles p ON p.id = a.id
  WHERE a.id = p_account_id
    AND a.id <> '00000000-0000-4000-8000-000000000001';

  IF payload IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  RETURN payload;
END;
$$;

CREATE OR REPLACE FUNCTION commands.suspend_account(
  p_account_id uuid,
  p_reason text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.accounts%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('operations');

  IF actor = p_account_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.accounts
  SET status = 'suspended',
      version = version + 1,
      updated_at = now()
  WHERE id = p_account_id
    AND version = p_expected_version
    AND status IS DISTINCT FROM 'suspended'
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'suspend_account',
    'accounts',
    p_account_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object(
      'version', row.version,
      'status', 'suspended',
      'counselorAvailable', commands.counselor_is_available(p_account_id)
    )
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'accounts',
    p_account_id,
    row.version,
    'account_suspended',
    jsonb_build_object(
      'account_id', p_account_id,
      'counselor_available', commands.counselor_is_available(p_account_id)
    )
  );

  RETURN jsonb_build_object(
    'id', p_account_id,
    'status', row.status,
    'version', row.version,
    'counselorAvailable', commands.counselor_is_available(p_account_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.restore_account(
  p_account_id uuid,
  p_reason text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.accounts%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('operations');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.accounts
  SET status = 'approved',
      version = version + 1,
      updated_at = now()
  WHERE id = p_account_id
    AND version = p_expected_version
    AND status = 'suspended'
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'restore_account',
    'accounts',
    p_account_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('version', row.version, 'status', 'approved')
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'accounts',
    p_account_id,
    row.version,
    'account_restored',
    jsonb_build_object('account_id', p_account_id)
  );

  RETURN jsonb_build_object(
    'id', p_account_id,
    'status', row.status,
    'version', row.version
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.admin_set_user_role(
  p_account_id uuid,
  p_role text,
  p_reason text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  current_version bigint;
  projected text;
BEGIN
  actor := commands.require_admin_scope('operations');

  IF actor = p_account_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT version INTO current_version
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF current_version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  projected := commands.apply_role_grant(actor, p_account_id, p_role);

  UPDATE public.accounts
  SET version = version + 1,
      updated_at = now()
  WHERE id = p_account_id
  RETURNING version INTO current_version;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'set_user_role',
    'accounts',
    p_account_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object(
      'version', current_version,
      'role', p_role,
      'homeRole', projected
    )
  );

  RETURN jsonb_build_object(
    'id', p_account_id,
    'homeRole', projected,
    'version', current_version
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_audit_events(
  p_actor_id uuid,
  p_target_id uuid,
  p_action text,
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  lim integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  off integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  PERFORM commands.require_admin_scope('operations');

  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(row_to_json(e)::jsonb)
      FROM (
        SELECT
          id,
          actor_id,
          action,
          resource_type,
          resource_id,
          reason,
          occurred_at,
          safe_diff
        FROM public.audit_events
        WHERE (p_actor_id IS NULL OR actor_id = p_actor_id)
          AND (p_target_id IS NULL OR resource_id = p_target_id)
          AND (p_action IS NULL OR p_action = '' OR action = p_action)
          AND (p_from IS NULL OR occurred_at >= p_from)
          AND (p_to IS NULL OR occurred_at <= p_to)
        ORDER BY occurred_at DESC, id DESC
        LIMIT lim OFFSET off
      ) e
    ), '[]'::jsonb),
    'limit', lim,
    'offset', off
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
DECLARE
  actor uuid;
  request_id uuid := gen_random_uuid();
BEGIN
  actor := commands.require_admin_scope('operations');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_account_id) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'request_data_export',
    'accounts',
    p_account_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object(
      'stub', true,
      'completedBy', 'prompt_30',
      'requestId', request_id
    )
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'accounts',
    p_account_id,
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    'data_export_requested',
    jsonb_build_object(
      'account_id', p_account_id,
      'stub', true,
      'completed_by', 'prompt_30',
      'request_id', request_id
    )
  );

  RETURN jsonb_build_object(
    'id', request_id,
    'kind', 'export',
    'status', 'queued_stub'
  );
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
DECLARE
  actor uuid;
  request_id uuid := gen_random_uuid();
BEGIN
  actor := commands.require_admin_scope('operations');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_account_id) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'request_account_deletion',
    'accounts',
    p_account_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object(
      'stub', true,
      'completedBy', 'prompt_30',
      'requestId', request_id
    )
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'accounts',
    p_account_id,
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    'account_deletion_requested',
    jsonb_build_object(
      'account_id', p_account_id,
      'stub', true,
      'completed_by', 'prompt_30',
      'request_id', request_id
    )
  );

  RETURN jsonb_build_object(
    'id', request_id,
    'kind', 'deletion',
    'status', 'queued_stub'
  );
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commands
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
