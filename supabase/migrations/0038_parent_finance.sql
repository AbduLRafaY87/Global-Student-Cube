-- Module 3 financial profiles and derived parent case_grants.
-- case_grants stay command-derived. Leftover parent_student_links are not this model.

ALTER TABLE public.parent_invitations
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.financial_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  occupation text,
  income numeric(20, 6),
  income_currency char(3),
  income_declined boolean NOT NULL DEFAULT false,
  savings numeric(20, 6),
  savings_currency char(3),
  savings_declined boolean NOT NULL DEFAULT false,
  housing jsonb NOT NULL DEFAULT '{}'::jsonb,
  sponsor_available boolean,
  income_proof_available boolean,
  completed_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  CONSTRAINT financial_profiles_case_id_key UNIQUE (case_id),
  CONSTRAINT financial_profiles_income_amount_check CHECK (income IS NULL OR income >= 0),
  CONSTRAINT financial_profiles_savings_amount_check CHECK (savings IS NULL OR savings >= 0),
  CONSTRAINT financial_profiles_income_declined_null CHECK (
    (NOT income_declined) OR (income IS NULL AND income_currency IS NULL)
  ),
  CONSTRAINT financial_profiles_savings_declined_null CHECK (
    (NOT savings_declined) OR (savings IS NULL AND savings_currency IS NULL)
  ),
  CONSTRAINT financial_profiles_income_pair CHECK (
    (income IS NULL) = (income_currency IS NULL)
  ),
  CONSTRAINT financial_profiles_savings_pair CHECK (
    (savings IS NULL) = (savings_currency IS NULL)
  )
);

CREATE OR REPLACE FUNCTION public.can_see_case(p_case_id uuid, p_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = p_case_id
      AND (
        c.student_account_id = p_account_id
        OR c.operating_guardian_id = p_account_id
        OR EXISTS (
          SELECT 1 FROM public.case_grants g
          WHERE g.case_id = p_case_id
            AND g.account_id = p_account_id
            AND g.revoked_at IS NULL
            AND (g.expires_at IS NULL OR g.expires_at > now())
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_finance(p_case_id uuid, p_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = p_case_id
      AND (
        c.student_account_id = p_account_id
        OR c.operating_guardian_id = p_account_id
        OR commands.grant_is_live(p_case_id, p_account_id, 'finance.read')
        OR commands.grant_is_live(p_case_id, p_account_id, 'finance.write')
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.can_see_case(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_finance(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS cases_select_own ON public.cases;
CREATE POLICY cases_select_own
  ON public.cases
  FOR SELECT
  TO authenticated
  USING (public.can_see_case(id, auth.uid()));

ALTER TABLE public.financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.financial_profiles FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.financial_profiles TO authenticated;
GRANT ALL ON public.financial_profiles TO postgres, service_role;

CREATE POLICY financial_profiles_select_scope
  ON public.financial_profiles
  FOR SELECT TO authenticated
  USING (public.can_read_finance(case_id, auth.uid()));

GRANT SELECT ON public.parent_links TO authenticated;
GRANT SELECT ON public.parent_invitations TO authenticated;

DROP POLICY IF EXISTS parent_links_select_visible ON public.parent_links;
CREATE POLICY parent_links_select_visible
  ON public.parent_links
  FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR public.can_see_case(case_id, auth.uid())
  );

DROP POLICY IF EXISTS parent_invitations_select_visible ON public.parent_invitations;
CREATE POLICY parent_invitations_select_visible
  ON public.parent_invitations
  FOR SELECT TO authenticated
  USING (
    inviter_id = auth.uid()
    OR public.can_see_case(case_id, auth.uid())
  );

CREATE OR REPLACE FUNCTION commands.require_finance_write(p_case_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.cases%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.student_account_id = actor OR row.operating_guardian_id = actor THEN
    IF NOT commands.has_data_use_consent(p_case_id) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    RETURN actor;
  END IF;
  IF commands.grant_is_live(p_case_id, actor, 'finance.write') THEN
    IF NOT commands.has_data_use_consent(p_case_id) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    RETURN actor;
  END IF;
  RAISE EXCEPTION 'FORBIDDEN';
END;
$$;

CREATE OR REPLACE FUNCTION commands.sync_parent_case_grants(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, commands
AS $$
DECLARE
  link public.parent_links%ROWTYPE;
  scope text;
  scopes text[];
BEGIN
  SELECT * INTO link FROM public.parent_links WHERE id = p_link_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.case_grants
  SET revoked_at = now()
  WHERE parent_link_id = p_link_id
    AND revoked_at IS NULL;

  IF link.status IS DISTINCT FROM 'active' OR link.revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT pi.scopes INTO scopes
  FROM public.parent_invitations pi
  WHERE pi.case_id = link.case_id
    AND pi.accepted_at IS NOT NULL
  ORDER BY pi.accepted_at DESC
  LIMIT 1;

  IF scopes IS NULL THEN
    scopes := ARRAY['profile.read'];
  END IF;

  FOREACH scope IN ARRAY scopes LOOP
    INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
    VALUES (link.case_id, link.parent_id, scope, p_link_id)
    ON CONFLICT (case_id, account_id, scope) DO UPDATE
      SET revoked_at = NULL,
          parent_link_id = EXCLUDED.parent_link_id;

    IF scope = 'profile.write' THEN
      INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
      VALUES (link.case_id, link.parent_id, 'profile.read', p_link_id)
      ON CONFLICT (case_id, account_id, scope) DO UPDATE
        SET revoked_at = NULL, parent_link_id = EXCLUDED.parent_link_id;
    END IF;
    IF scope = 'finance.write' THEN
      INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
      VALUES (link.case_id, link.parent_id, 'finance.read', p_link_id)
      ON CONFLICT (case_id, account_id, scope) DO UPDATE
        SET revoked_at = NULL, parent_link_id = EXCLUDED.parent_link_id;
    END IF;
    IF scope = 'task.write' THEN
      INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
      VALUES (link.case_id, link.parent_id, 'task.read', p_link_id)
      ON CONFLICT (case_id, account_id, scope) DO UPDATE
        SET revoked_at = NULL, parent_link_id = EXCLUDED.parent_link_id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION commands.parent_link_grants_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, commands
AS $$
BEGIN
  PERFORM commands.sync_parent_case_grants(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parent_links_sync_grants ON public.parent_links;
CREATE TRIGGER parent_links_sync_grants
  AFTER INSERT OR UPDATE OF status, revoked_at, kind ON public.parent_links
  FOR EACH ROW
  EXECUTE FUNCTION commands.parent_link_grants_trigger();

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
  student_dob date;
  age integer;
  next_status text;
BEGIN
  actor := commands.actor_id();

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

  SELECT student_dob INTO student_dob FROM public.cases WHERE id = row.case_id;
  age := EXTRACT(YEAR FROM age(current_date, student_dob))::integer;
  IF age < 18 THEN
    kind := 'verified_guardian';
    next_status := 'accepted_pending_verification';
  ELSE
    kind := CASE
      WHEN p_kind = 'verified_guardian' THEN 'verified_guardian'
      ELSE 'adult_authorized'
    END;
    next_status := CASE
      WHEN kind = 'verified_guardian' THEN 'accepted_pending_verification'
      ELSE 'active'
    END;
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
    next_status,
    CASE WHEN next_status = 'active' THEN row.inviter_id ELSE NULL END
  )
  ON CONFLICT (case_id, parent_id) DO UPDATE
    SET status = EXCLUDED.status,
        kind = EXCLUDED.kind,
        authorized_by = EXCLUDED.authorized_by,
        revoked_at = NULL
  RETURNING id INTO link_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'accept_parent_invitation',
    'parent_links',
    link_id,
    commands.request_id(),
    jsonb_build_object('case_id', row.case_id, 'kind', kind, 'status', next_status)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'parent_links',
    link_id,
    1,
    'parent_link_accepted',
    jsonb_build_object('link_id', link_id, 'case_id', row.case_id, 'status', next_status)
  );

  RETURN jsonb_build_object(
    'id', row.id,
    'linkId', link_id,
    'status', next_status,
    'kind', kind
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.revoke_parent_link(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  link public.parent_links%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO link FROM public.parent_links WHERE id = p_link_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF link.parent_id IS DISTINCT FROM actor
     AND NOT EXISTS (
       SELECT 1 FROM public.cases c
       WHERE c.id = link.case_id
         AND (c.student_account_id = actor OR c.operating_guardian_id = actor)
     )
     AND NOT commands.is_admin_actor(actor)
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.parent_links
  SET status = 'revoked', revoked_at = now()
  WHERE id = p_link_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'revoke_parent_link', 'parent_links', p_link_id,
    commands.request_id(), jsonb_build_object('case_id', link.case_id)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'parent_links', p_link_id, 1, 'parent_link_revoked',
    jsonb_build_object('link_id', p_link_id, 'case_id', link.case_id)
  );
  RETURN jsonb_build_object('id', p_link_id, 'status', 'revoked');
END;
$$;

CREATE OR REPLACE FUNCTION commands.replace_parent_link_scopes(
  p_link_id uuid,
  p_scopes text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  link public.parent_links%ROWTYPE;
  invite_id uuid;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO link FROM public.parent_links WHERE id = p_link_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = link.case_id AND c.student_account_id = actor
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT id INTO invite_id
  FROM public.parent_invitations
  WHERE case_id = link.case_id AND accepted_at IS NOT NULL
  ORDER BY accepted_at DESC
  LIMIT 1;

  IF invite_id IS NOT NULL THEN
    UPDATE public.parent_invitations
    SET scopes = COALESCE(p_scopes, '{}')
    WHERE id = invite_id;
  END IF;

  PERFORM commands.sync_parent_case_grants(p_link_id);

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'replace_parent_link_scopes', 'parent_links', p_link_id,
    commands.request_id(), jsonb_build_object('scopes', p_scopes)
  );
  RETURN jsonb_build_object('id', p_link_id, 'scopes', p_scopes);
END;
$$;

CREATE OR REPLACE FUNCTION commands.revoke_parent_invitation(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.parent_invitations%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.parent_invitations WHERE id = p_invitation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.inviter_id IS DISTINCT FROM actor
     AND NOT EXISTS (
       SELECT 1 FROM public.cases c
       WHERE c.id = row.case_id AND c.student_account_id = actor
     )
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.parent_invitations SET revoked_at = now() WHERE id = p_invitation_id;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'revoke_parent_invitation', 'parent_invitations',
    p_invitation_id, commands.request_id(), jsonb_build_object('case_id', row.case_id)
  );
  RETURN jsonb_build_object('id', p_invitation_id, 'revoked', true);
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_guardian_operated_case(
  p_student_name text,
  p_student_dob date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  case_id uuid;
  link_id uuid;
  age integer;
BEGIN
  actor := commands.actor_id();
  age := EXTRACT(YEAR FROM age(current_date, p_student_dob))::integer;
  IF age >= 13 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF btrim(p_student_name) = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.cases (
    operating_guardian_id, student_name, student_dob, state
  ) VALUES (
    actor, btrim(p_student_name), p_student_dob, 'guardian_pending'
  )
  RETURNING id INTO case_id;

  INSERT INTO public.parent_links (
    case_id, parent_id, kind, status, authorized_by
  ) VALUES (
    case_id, actor, 'verified_guardian', 'accepted_pending_verification', actor
  )
  RETURNING id INTO link_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'create_guardian_operated_case', 'cases', case_id,
    commands.request_id(), jsonb_build_object('link_id', link_id)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', case_id, 1, 'guardian_case_created',
    jsonb_build_object('case_id', case_id, 'link_id', link_id)
  );
  RETURN jsonb_build_object('caseId', case_id, 'linkId', link_id, 'status', 'accepted_pending_verification');
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_financial_profile(p_case_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  income_declined boolean;
  savings_declined boolean;
BEGIN
  actor := commands.require_finance_write(p_case_id);
  income_declined := coalesce((p_payload ->> 'incomeDeclined')::boolean, false);
  savings_declined := coalesce((p_payload ->> 'savingsDeclined')::boolean, false);

  IF p_payload ->> 'incomeDeclined' IS NULL OR p_payload ->> 'savingsDeclined' IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF length(coalesce(p_payload ->> 'occupation', '')) > 160 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_payload ? 'expectedVersion' THEN
    UPDATE public.cases
    SET version = version + 1, updated_at = now()
    WHERE id = p_case_id
      AND version = (p_payload ->> 'expectedVersion')::bigint;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'VERSION_CONFLICT';
    END IF;
  END IF;

  INSERT INTO public.financial_profiles (
    case_id, occupation, income, income_currency, income_declined,
    savings, savings_currency, savings_declined, housing,
    sponsor_available, income_proof_available
  ) VALUES (
    p_case_id,
    nullif(btrim(coalesce(p_payload ->> 'occupation', '')), ''),
    CASE WHEN income_declined THEN NULL
      WHEN p_payload ->> 'income' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (p_payload ->> 'income')::numeric
      ELSE NULL END,
    CASE WHEN income_declined THEN NULL ELSE nullif(upper(p_payload ->> 'incomeCurrency'), '') END,
    income_declined,
    CASE WHEN savings_declined THEN NULL
      WHEN p_payload ->> 'savings' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (p_payload ->> 'savings')::numeric
      ELSE NULL END,
    CASE WHEN savings_declined THEN NULL ELSE nullif(upper(p_payload ->> 'savingsCurrency'), '') END,
    savings_declined,
    coalesce(p_payload -> 'housing', '{}'::jsonb),
    CASE
      WHEN p_payload ->> 'sponsorAvailable' = 'yes' THEN true
      WHEN p_payload ->> 'sponsorAvailable' = 'no' THEN false
      ELSE NULL END,
    CASE
      WHEN p_payload ->> 'incomeProofAvailable' = 'yes' THEN true
      WHEN p_payload ->> 'incomeProofAvailable' = 'no' THEN false
      ELSE NULL END
  )
  ON CONFLICT (case_id) DO UPDATE SET
    occupation = EXCLUDED.occupation,
    income = EXCLUDED.income,
    income_currency = EXCLUDED.income_currency,
    income_declined = EXCLUDED.income_declined,
    savings = EXCLUDED.savings,
    savings_currency = EXCLUDED.savings_currency,
    savings_declined = EXCLUDED.savings_declined,
    housing = EXCLUDED.housing,
    sponsor_available = EXCLUDED.sponsor_available,
    income_proof_available = EXCLUDED.income_proof_available,
    updated_at = now();

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'save_financial_profile', 'financial_profiles', p_case_id,
    commands.request_id(), jsonb_build_object('incomeDeclined', income_declined)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'financial_profile_saved', jsonb_build_object('case_id', p_case_id)
  );
  RETURN jsonb_build_object('caseId', p_case_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.complete_module3(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  profile public.financial_profiles%ROWTYPE;
  disclosure text;
BEGIN
  actor := commands.require_finance_write(p_case_id);
  SELECT * INTO profile FROM public.financial_profiles WHERE case_id = p_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  disclosure := profile.housing ->> 'disclosure';
  IF disclosure IS NULL OR disclosure NOT IN ('provided', 'declined') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF disclosure = 'provided' AND (
    coalesce(profile.housing ->> 'status', '') = ''
    OR coalesce(profile.housing ->> 'structure', '') = ''
    OR coalesce(profile.housing ->> 'construction', '') = ''
    OR coalesce(profile.housing ->> 'rooms', '') = ''
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF NOT profile.income_declined AND (profile.income IS NULL OR profile.income_currency IS NULL) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF NOT profile.savings_declined AND (profile.savings IS NULL OR profile.savings_currency IS NULL) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.financial_profiles
  SET completed_by = actor, updated_at = now()
  WHERE case_id = p_case_id;

  UPDATE public.cases
  SET module3_completed_at = coalesce(module3_completed_at, now()),
      updated_at = now(),
      version = version + 1
  WHERE id = p_case_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'complete_module3', 'cases', p_case_id,
    commands.request_id(), jsonb_build_object('completed', true)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'module3_completed', jsonb_build_object('case_id', p_case_id)
  );
  RETURN jsonb_build_object('caseId', p_case_id, 'completed', true);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_parent_family()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  email_hash text;
BEGIN
  actor := commands.actor_id();
  SELECT encode(digest(a.email_normalized, 'sha256'), 'hex') INTO email_hash
  FROM public.accounts a
  WHERE a.id = actor;

  RETURN jsonb_build_object(
    'links', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pl.id,
        'caseId', pl.case_id,
        'kind', pl.kind,
        'status', pl.status,
        'revokedAt', pl.revoked_at,
        'studentName', c.student_name,
        'studentDob', c.student_dob,
        'gscId', sa.gsc_id,
        'module2CompletedAt', c.module2_completed_at,
        'module3CompletedAt', c.module3_completed_at,
        'updatedAt', c.updated_at,
        'scopes', coalesce((
          SELECT jsonb_agg(g.scope)
          FROM public.case_grants g
          WHERE g.case_id = pl.case_id
            AND g.account_id = actor
            AND g.revoked_at IS NULL
        ), '[]'::jsonb)
      ) ORDER BY c.student_name)
      FROM public.parent_links pl
      JOIN public.cases c ON c.id = pl.case_id
      LEFT JOIN public.accounts sa ON sa.id = c.student_account_id
      WHERE pl.parent_id = actor
    ), '[]'::jsonb),
    'pendingInvitations', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pi.id,
        'caseId', pi.case_id,
        'expiresAt', pi.expires_at,
        'scopes', to_jsonb(pi.scopes)
      ))
      FROM public.parent_invitations pi
      WHERE email_hash IS NOT NULL
        AND pi.target_email_hash = email_hash
        AND pi.accepted_at IS NULL
        AND pi.revoked_at IS NULL
        AND pi.expires_at > now()
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_parent_invitation_by_identifier(
  p_case_id uuid,
  p_identifier text,
  p_token_hash text,
  p_scopes text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  identifier text;
  email_hash text;
  found_email text;
BEGIN
  identifier := lower(btrim(coalesce(p_identifier, '')));
  IF identifier = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF position('@' IN identifier) > 0 THEN
    found_email := identifier;
    email_hash := encode(digest(identifier, 'sha256'), 'hex');
  ELSE
    SELECT a.email_normalized INTO found_email
    FROM public.accounts a
    WHERE upper(a.gsc_id) = upper(btrim(p_identifier))
    LIMIT 1;
    email_hash := encode(
      digest(coalesce(found_email, identifier), 'sha256'),
      'hex'
    );
  END IF;

  RETURN commands.create_parent_invitation(
    p_case_id,
    email_hash,
    p_token_hash,
    p_scopes
  ) || jsonb_build_object('notifyEmail', found_email);
END;
$$;

UPDATE public.case_grants g
SET revoked_at = now()
WHERE g.parent_link_id IS NOT NULL
  AND g.revoked_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.parent_links pl
    WHERE pl.id = g.parent_link_id
      AND pl.status = 'active'
      AND pl.revoked_at IS NULL
  );

DO $$
DECLARE
  link_row record;
BEGIN
  FOR link_row IN
    SELECT id FROM public.parent_links
    WHERE status = 'active' AND revoked_at IS NULL
  LOOP
    PERFORM commands.sync_parent_case_grants(link_row.id);
  END LOOP;
END
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
