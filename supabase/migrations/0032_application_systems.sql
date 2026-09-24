-- Owner §6 application systems + lossless leftover applications backfill.
-- No APP screens. No country→system inference. No fee amounts.
-- SYNTHETIC fee/deadline amounts belong in the test project only, not this file.

CREATE OR REPLACE FUNCTION public.is_file_purpose(p_purpose text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_purpose IN (
    'transcript',
    'passport',
    'recommendation_letter',
    'statement_of_purpose',
    'financial_proof',
    'photo',
    'visa_form',
    'medical',
    'insurance',
    'offer_letter',
    'portfolio',
    'resume',
    'profile_image',
    'introduction_media',
    'advisory_pdf',
    'other',
    'apply_personal_statement',
    'apply_supplement',
    'apply_reference',
    'apply_certified_transcript',
    'apply_vpd',
    'apply_school_report',
    'apply_system_certification'
  )
$$;

CREATE TABLE IF NOT EXISTS public.application_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  code text NOT NULL,
  name text NOT NULL,
  choice_model text NOT NULL,
  max_choices smallint,
  fee_model text NOT NULL,
  deadline_model text NOT NULL,
  essay_model text NOT NULL,
  document_model text NOT NULL,
  publication_state text NOT NULL,
  notes text,
  CONSTRAINT application_systems_code_key UNIQUE (code),
  CONSTRAINT application_systems_choice_model_check CHECK (choice_model IN (
    'single',
    'unordered_set',
    'preference_ordered'
  )),
  CONSTRAINT application_systems_fee_model_check CHECK (fee_model IN (
    'per_system',
    'per_choice',
    'per_group',
    'hybrid',
    'unknown'
  )),
  CONSTRAINT application_systems_deadline_model_check CHECK (deadline_model IN (
    'system',
    'institution',
    'both',
    'unknown'
  )),
  CONSTRAINT application_systems_essay_model_check CHECK (essay_model IN (
    'one_statement_many_courses',
    'shared_core_plus_supplements',
    'per_choice',
    'system_prompts',
    'none'
  )),
  CONSTRAINT application_systems_document_model_check CHECK (document_model IN (
    'system_certification',
    'per_institution',
    'both',
    'none'
  )),
  CONSTRAINT application_systems_publication_check CHECK (publication_state IN (
    'published',
    'internal'
  )),
  CONSTRAINT application_systems_max_choices_check CHECK (
    max_choices IS NULL OR max_choices >= 1
  )
);

CREATE TABLE IF NOT EXISTS public.application_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  case_id uuid REFERENCES public.cases (id) ON DELETE RESTRICT,
  system_id uuid NOT NULL REFERENCES public.application_systems (id) ON DELETE RESTRICT,
  cycle_year smallint,
  intake_year smallint,
  residency_category text,
  state text NOT NULL,
  migration_source text,
  CONSTRAINT application_groups_state_check CHECK (state IN (
    'draft',
    'submitted',
    'closed'
  )),
  CONSTRAINT application_groups_residency_check CHECK (
    residency_category IS NULL OR residency_category IN (
      'home',
      'international',
      'eu',
      'in_state',
      'out_of_state'
    )
  ),
  CONSTRAINT application_groups_years_check CHECK (
    (cycle_year IS NULL OR cycle_year BETWEEN 2000 AND 2100)
    AND (intake_year IS NULL OR intake_year BETWEEN 2000 AND 2100)
  )
);

CREATE INDEX IF NOT EXISTS application_groups_case_idx
  ON public.application_groups (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS application_groups_system_idx
  ON public.application_groups (system_id, state);

CREATE TABLE IF NOT EXISTS public.application_fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  system_id uuid NOT NULL REFERENCES public.application_systems (id) ON DELETE RESTRICT,
  applies_to text NOT NULL,
  kind text NOT NULL,
  amount numeric(20, 6),
  currency char(3),
  residency_category text,
  included_choices smallint,
  cycle_year smallint,
  source_fact_id uuid,
  CONSTRAINT application_fee_rules_applies_check CHECK (applies_to IN (
    'system',
    'group',
    'choice'
  )),
  CONSTRAINT application_fee_rules_amount_check CHECK (
    amount IS NULL OR amount >= 0
  ),
  CONSTRAINT application_fee_rules_currency_pair CHECK (
    (amount IS NULL AND currency IS NULL)
    OR (amount IS NOT NULL AND currency IS NOT NULL)
  ),
  CONSTRAINT application_fee_rules_included_check CHECK (
    included_choices IS NULL OR included_choices >= 0
  )
);

CREATE INDEX IF NOT EXISTS application_fee_rules_system_idx
  ON public.application_fee_rules (system_id, applies_to);

CREATE TABLE IF NOT EXISTS public.application_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  system_id uuid NOT NULL REFERENCES public.application_systems (id) ON DELETE RESTRICT,
  scope text NOT NULL,
  university_id uuid REFERENCES public.universities (id) ON DELETE RESTRICT,
  program_id uuid,
  kind text NOT NULL,
  deadline_date date,
  deadline_month smallint,
  deadline_precision text NOT NULL,
  timezone text,
  cycle_year smallint,
  source_fact_id uuid,
  CONSTRAINT application_deadlines_scope_check CHECK (scope IN (
    'system',
    'institution',
    'program'
  )),
  CONSTRAINT application_deadlines_precision_check CHECK (deadline_precision IN (
    'day',
    'month',
    'unknown'
  )),
  CONSTRAINT application_deadlines_month_check CHECK (
    deadline_month IS NULL OR deadline_month BETWEEN 1 AND 12
  ),
  CONSTRAINT application_deadlines_precision_consistent CHECK (
    (deadline_precision = 'day' AND deadline_date IS NOT NULL)
    OR (deadline_precision = 'month' AND deadline_month IS NOT NULL AND deadline_date IS NULL)
    OR (deadline_precision = 'unknown' AND deadline_date IS NULL AND deadline_month IS NULL)
  ),
  CONSTRAINT application_deadlines_scope_targets CHECK (
    (scope = 'system' AND university_id IS NULL AND program_id IS NULL)
    OR (scope = 'institution' AND university_id IS NOT NULL)
    OR (scope = 'program' AND program_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS application_deadlines_system_scope_idx
  ON public.application_deadlines (system_id, scope, cycle_year);

CREATE TABLE IF NOT EXISTS public.application_essay_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  system_id uuid NOT NULL REFERENCES public.application_systems (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  university_id uuid REFERENCES public.universities (id) ON DELETE RESTRICT,
  prompt_key text NOT NULL,
  word_limit integer,
  required boolean NOT NULL DEFAULT true,
  CONSTRAINT application_essay_requirements_kind_check CHECK (kind IN (
    'shared_core',
    'supplement',
    'one_statement'
  )),
  CONSTRAINT application_essay_requirements_word_check CHECK (
    word_limit IS NULL OR word_limit > 0
  )
);

CREATE TABLE IF NOT EXISTS public.application_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  system_id uuid NOT NULL REFERENCES public.application_systems (id) ON DELETE RESTRICT,
  university_id uuid REFERENCES public.universities (id) ON DELETE RESTRICT,
  program_id uuid,
  purpose text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  certify_once boolean NOT NULL DEFAULT false,
  CONSTRAINT application_document_requirements_purpose_check CHECK (
    public.is_file_purpose(purpose)
  )
);

CREATE TABLE IF NOT EXISTS public.application_document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  requirement_id uuid NOT NULL
    REFERENCES public.application_document_requirements (id) ON DELETE RESTRICT,
  file_id uuid NOT NULL,
  group_id uuid REFERENCES public.application_groups (id) ON DELETE RESTRICT,
  application_id uuid REFERENCES public.applications (id) ON DELETE RESTRICT,
  CONSTRAINT application_document_links_binding CHECK (
    group_id IS NOT NULL OR application_id IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.application_fee_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  group_id uuid NOT NULL REFERENCES public.application_groups (id) ON DELETE RESTRICT,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_usd numeric(24, 8),
  fx_ids uuid[] NOT NULL DEFAULT '{}',
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT application_fee_assessments_total_check CHECK (
    total_usd IS NULL OR total_usd >= 0
  )
);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.application_groups (id) ON DELETE RESTRICT;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS program_id uuid;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS preference_order smallint;

CREATE INDEX IF NOT EXISTS applications_group_id_idx
  ON public.applications (group_id);

CREATE UNIQUE INDEX IF NOT EXISTS applications_group_preference_uidx
  ON public.applications (group_id, preference_order)
  WHERE preference_order IS NOT NULL;

INSERT INTO public.application_systems (
  id, code, name, choice_model, max_choices, fee_model, deadline_model,
  essay_model, document_model, publication_state, notes
) VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'ucas',
    'UCAS',
    'unordered_set',
    5,
    'per_system',
    'system',
    'one_statement_many_courses',
    'per_institution',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'common_app',
    'Common App',
    'unordered_set',
    NULL,
    'hybrid',
    'both',
    'shared_core_plus_supplements',
    'both',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'coalition',
    'Coalition',
    'unordered_set',
    NULL,
    'hybrid',
    'both',
    'shared_core_plus_supplements',
    'both',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'uc',
    'University of California',
    'unordered_set',
    NULL,
    'per_system',
    'system',
    'system_prompts',
    'both',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'cal_state',
    'Cal State Apply',
    'unordered_set',
    NULL,
    'per_system',
    'system',
    'system_prompts',
    'both',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'ouac',
    'OUAC',
    'unordered_set',
    NULL,
    'hybrid',
    'both',
    'per_choice',
    'both',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000007',
    'educationplanner_bc',
    'EducationPlannerBC',
    'unordered_set',
    NULL,
    'hybrid',
    'both',
    'per_choice',
    'both',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000008',
    'apply_alberta',
    'ApplyAlberta',
    'unordered_set',
    NULL,
    'hybrid',
    'both',
    'per_choice',
    'both',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    'uac',
    'UAC',
    'preference_ordered',
    NULL,
    'per_system',
    'both',
    'none',
    'per_institution',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-00000000000a',
    'vtac',
    'VTAC',
    'preference_ordered',
    NULL,
    'per_system',
    'both',
    'none',
    'per_institution',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-00000000000b',
    'qtac',
    'QTAC',
    'preference_ordered',
    NULL,
    'per_system',
    'both',
    'none',
    'per_institution',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-00000000000c',
    'satac',
    'SATAC',
    'preference_ordered',
    NULL,
    'per_system',
    'both',
    'none',
    'per_institution',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-00000000000d',
    'uni_assist',
    'uni-assist',
    'unordered_set',
    NULL,
    'hybrid',
    'both',
    'per_choice',
    'system_certification',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-00000000000e',
    'studielink',
    'Studielink',
    'unordered_set',
    NULL,
    'per_choice',
    'both',
    'none',
    'both',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-00000000000f',
    'parcoursup',
    'Parcoursup',
    'unordered_set',
    NULL,
    'per_system',
    'system',
    'system_prompts',
    'system_certification',
    'published',
    'APPROXIMATE: Parcoursup wish mechanics do not cleanly match choice_model. Verify against a sourced official rule before using this row for real students.'
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    'direct',
    'Direct institution application',
    'single',
    1,
    'per_choice',
    'institution',
    'per_choice',
    'per_institution',
    'published',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000011',
    'legacy_unmapped',
    'Legacy unmapped (SYNTHETIC)',
    'single',
    1,
    'unknown',
    'unknown',
    'none',
    'none',
    'internal',
    'SYNTHETIC catch-all for leftover application rows. Never infer a real platform from university country.'
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.application_essay_requirements (
  system_id, kind, prompt_key, word_limit, required
)
SELECT id, 'one_statement', 'ucas.personal_statement', NULL, true
FROM public.application_systems WHERE code = 'ucas'
UNION ALL
SELECT id, 'shared_core', 'common_app.personal_essay', NULL, true
FROM public.application_systems WHERE code = 'common_app'
UNION ALL
SELECT id, 'shared_core', 'coalition.essay', NULL, true
FROM public.application_systems WHERE code = 'coalition';

INSERT INTO public.application_document_requirements (
  system_id, purpose, required, certify_once
)
SELECT id, 'apply_certified_transcript', true, true
FROM public.application_systems WHERE code = 'uni_assist';

CREATE OR REPLACE FUNCTION commands.group_state_from_leftover_status(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_status = 'draft' THEN 'draft'
    WHEN p_status = 'submitted' THEN 'submitted'
    ELSE 'closed'
  END
$$;

CREATE OR REPLACE FUNCTION commands.sync_leftover_application_deadline(
  p_application_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  app public.applications%ROWTYPE;
  sys uuid;
BEGIN
  SELECT * INTO app FROM public.applications WHERE id = p_application_id;
  IF NOT FOUND OR app.group_id IS NULL OR app.deadline IS NULL THEN
    RETURN;
  END IF;

  SELECT system_id INTO sys
  FROM public.application_groups
  WHERE id = app.group_id;

  DELETE FROM public.application_deadlines d
  WHERE d.system_id = sys
    AND d.scope = 'institution'
    AND d.university_id = app.university_id
    AND d.kind = 'leftover_institution'
    AND NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.application_groups g ON g.id = a.group_id
      WHERE g.system_id = sys
        AND a.university_id = app.university_id
        AND a.deadline = d.deadline_date
    );

  INSERT INTO public.application_deadlines (
    system_id, scope, university_id, kind, deadline_date,
    deadline_precision, timezone
  )
  SELECT
    sys,
    'institution',
    app.university_id,
    'leftover_institution',
    app.deadline,
    'day',
    NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM public.application_deadlines d
    WHERE d.system_id = sys
      AND d.scope = 'institution'
      AND d.university_id = app.university_id
      AND d.kind = 'leftover_institution'
      AND d.deadline_date = app.deadline
  );
END;
$$;

DO $$
DECLARE
  leftover uuid := '10000000-0000-4000-8000-000000000011';
  rec record;
  group_id uuid;
  resolved_case uuid;
BEGIN
  FOR rec IN
    SELECT a.*
    FROM public.applications a
    WHERE a.group_id IS NULL
    ORDER BY a.created_at, a.id
  LOOP
    SELECT c.id INTO resolved_case
    FROM public.cases c
    WHERE c.student_account_id = rec.student_id;

    INSERT INTO public.application_groups (
      case_id, system_id, state, migration_source
    ) VALUES (
      resolved_case,
      leftover,
      commands.group_state_from_leftover_status(rec.status),
      CASE
        WHEN resolved_case IS NULL THEN 'leftover_no_case'
        ELSE 'leftover'
      END
    )
    RETURNING id INTO group_id;

    UPDATE public.applications
    SET group_id = group_id
    WHERE id = rec.id;

    PERFORM commands.sync_leftover_application_deadline(rec.id);
  END LOOP;
END
$$;

ALTER TABLE public.applications
  ALTER COLUMN group_id SET NOT NULL;

CREATE OR REPLACE FUNCTION commands.enforce_application_choice_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  sys public.application_systems%ROWTYPE;
  choice_count integer;
BEGIN
  SELECT s.* INTO sys
  FROM public.application_systems s
  JOIN public.application_groups g ON g.system_id = s.id
  WHERE g.id = NEW.group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF sys.choice_model = 'preference_ordered' AND NEW.preference_order IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF sys.choice_model IN ('unordered_set', 'single') AND NEW.preference_order IS NOT NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT count(*) INTO choice_count
  FROM public.applications
  WHERE group_id = NEW.group_id
    AND id IS DISTINCT FROM NEW.id;

  IF sys.max_choices IS NOT NULL AND choice_count + 1 > sys.max_choices THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_choice_rules ON public.applications;
CREATE TRIGGER applications_choice_rules
  BEFORE INSERT OR UPDATE OF group_id, preference_order ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION commands.enforce_application_choice_rules();

CREATE OR REPLACE FUNCTION commands.open_leftover_application_group(
  p_actor uuid,
  p_status text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  group_id uuid;
  resolved_case uuid;
  direct_id uuid := '10000000-0000-4000-8000-000000000010';
BEGIN
  SELECT c.id INTO resolved_case
  FROM public.cases c
  WHERE c.student_account_id = p_actor;

  INSERT INTO public.application_groups (
    case_id, system_id, state, migration_source
  ) VALUES (
    resolved_case,
    direct_id,
    commands.group_state_from_leftover_status(p_status),
    'leftover_api'
  )
  RETURNING id INTO group_id;

  RETURN group_id;
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
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  existing public.idempotency_records%ROWTYPE;
  created public.applications%ROWTYPE;
  payload jsonb;
  group_id uuid;
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

  group_id := commands.open_leftover_application_group(actor, p_status);

  INSERT INTO public.applications (
    student_id, university_id, status, deadline, version, group_id
  )
  VALUES (
    actor, p_university_id, p_status, p_deadline, 1, group_id
  )
  RETURNING * INTO created;

  PERFORM commands.sync_leftover_application_deadline(created.id);

  payload := jsonb_build_object(
    'id', created.id,
    'student_id', created.student_id,
    'university_id', created.university_id,
    'status', created.status,
    'deadline', created.deadline,
    'version', created.version,
    'group_id', created.group_id
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
    jsonb_build_object(
      'beforeVersion', NULL,
      'afterVersion', created.version,
      'groupId', created.group_id
    )
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
SET search_path = public, commands
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

  UPDATE public.application_groups
  SET
    state = commands.group_state_from_leftover_status(next_status),
    updated_at = now()
  WHERE id = current.group_id;

  PERFORM commands.sync_leftover_application_deadline(p_id);

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
    'version', new_version,
    'group_id', current.group_id
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
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  current public.applications%ROWTYPE;
  new_version bigint;
  leftover_group uuid;
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

  leftover_group := current.group_id;
  new_version := current.version + 1;

  DELETE FROM public.application_document_links WHERE application_id = p_id;
  DELETE FROM public.applications WHERE id = p_id;

  IF leftover_group IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.applications WHERE group_id = leftover_group
  ) THEN
    DELETE FROM public.application_document_links WHERE group_id = leftover_group;
    DELETE FROM public.application_fee_assessments WHERE group_id = leftover_group;
    DELETE FROM public.application_groups WHERE id = leftover_group;
  END IF;

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

CREATE OR REPLACE FUNCTION commands.upsert_application_fee_rule(
  p_system_id uuid,
  p_applies_to text,
  p_kind text,
  p_amount numeric,
  p_currency text,
  p_residency_category text,
  p_included_choices integer,
  p_cycle_year integer,
  p_source_fact_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row_id uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_amount IS NOT NULL AND (
    p_source_fact_id IS NULL
    OR p_currency IS NULL
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.application_fee_rules (
    system_id, applies_to, kind, amount, currency, residency_category,
    included_choices, cycle_year, source_fact_id
  ) VALUES (
    p_system_id, p_applies_to, p_kind, p_amount, p_currency, p_residency_category,
    p_included_choices, p_cycle_year, p_source_fact_id
  )
  RETURNING id INTO row_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'upsert_application_fee_rule',
    'application_fee_rules',
    row_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('systemId', p_system_id, 'kind', p_kind, 'amount', p_amount)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'application_fee_rules',
    row_id,
    1,
    'application_fee_rule_upserted',
    jsonb_build_object('id', row_id, 'system_id', p_system_id)
  );

  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_application_deadline(
  p_system_id uuid,
  p_scope text,
  p_university_id uuid,
  p_program_id uuid,
  p_kind text,
  p_deadline_date date,
  p_deadline_month integer,
  p_deadline_precision text,
  p_timezone text,
  p_cycle_year integer,
  p_source_fact_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row_id uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_deadline_precision = 'day' AND p_source_fact_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.application_deadlines (
    system_id, scope, university_id, program_id, kind, deadline_date,
    deadline_month, deadline_precision, timezone, cycle_year, source_fact_id
  ) VALUES (
    p_system_id, p_scope, p_university_id, p_program_id, p_kind, p_deadline_date,
    p_deadline_month, p_deadline_precision, p_timezone, p_cycle_year, p_source_fact_id
  )
  RETURNING id INTO row_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'upsert_application_deadline',
    'application_deadlines',
    row_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object(
      'systemId', p_system_id,
      'scope', p_scope,
      'precision', p_deadline_precision
    )
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'application_deadlines',
    row_id,
    1,
    'application_deadline_upserted',
    jsonb_build_object('id', row_id, 'system_id', p_system_id)
  );

  RETURN jsonb_build_object('id', row_id);
END;
$$;

ALTER TABLE public.application_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_essay_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_fee_assessments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.application_systems FORCE ROW LEVEL SECURITY;
ALTER TABLE public.application_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.application_fee_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.application_deadlines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.application_essay_requirements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.application_document_requirements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.application_document_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.application_fee_assessments FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.application_systems
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.application_groups
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.application_fee_rules
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.application_deadlines
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.application_essay_requirements
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.application_document_requirements
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.application_document_links
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.application_fee_assessments
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commands
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION public.is_file_purpose(text) TO authenticated, gsc_api_executor;
