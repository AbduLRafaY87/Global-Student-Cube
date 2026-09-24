-- Module 2 student profile: academics, tests, preferences, activities,
-- awards, relatives, private files. Leftover rows are copied, not deleted.
-- Writes go through commands. SEN rows are not writable by authenticated.

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
    'apply_system_certification',
    'test_result',
    'award_evidence'
  )
$$;

CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  case_id uuid REFERENCES public.cases (id) ON DELETE RESTRICT,
  purpose text NOT NULL,
  object_key text NOT NULL,
  size_bytes bigint NOT NULL,
  declared_mime text NOT NULL,
  detected_mime text,
  sha256 text,
  state text NOT NULL DEFAULT 'pending',
  delete_after timestamptz,
  original_name text,
  CONSTRAINT files_purpose_check CHECK (public.is_file_purpose(purpose)),
  CONSTRAINT files_size_check CHECK (size_bytes > 0),
  CONSTRAINT files_state_check CHECK (state IN (
    'pending', 'quarantined', 'clean', 'rejected', 'deleted'
  )),
  CONSTRAINT files_object_key_key UNIQUE (object_key)
);

CREATE TABLE IF NOT EXISTS public.case_grants (
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  scope text NOT NULL,
  parent_link_id uuid REFERENCES public.parent_links (id) ON DELETE RESTRICT,
  assignment_id uuid,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, account_id, scope),
  CONSTRAINT case_grants_scope_check CHECK (scope IN (
    'profile.read',
    'profile.write',
    'finance.read',
    'finance.write',
    'shortlist.read',
    'shortlist.write',
    'booking.manage',
    'report.read',
    'task.read',
    'task.write',
    'journey.read'
  ))
);

CREATE INDEX IF NOT EXISTS case_grants_account_case_idx
  ON public.case_grants (account_id, case_id);

CREATE TABLE IF NOT EXISTS public.academic_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  level text,
  education_years smallint,
  continuing_field boolean,
  target_level text,
  field_ids uuid[] NOT NULL DEFAULT '{}',
  previous_field_ids uuid[] NOT NULL DEFAULT '{}',
  discipline_ids uuid[] NOT NULL DEFAULT '{}',
  specialization_ids uuid[] NOT NULL DEFAULT '{}',
  intake_month smallint,
  intake_year smallint,
  intake_undecided boolean NOT NULL DEFAULT false,
  career_goal text,
  accommodation text,
  intro_file_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  intro_language text,
  intro_caption text,
  tests_taken boolean,
  scholarship_received boolean,
  scholarship_not_granted boolean,
  CONSTRAINT academic_profiles_case_id_key UNIQUE (case_id),
  CONSTRAINT academic_profiles_years_check CHECK (
    education_years IS NULL OR education_years BETWEEN 0 AND 40
  ),
  CONSTRAINT academic_profiles_month_check CHECK (
    intake_month IS NULL OR intake_month BETWEEN 1 AND 12
  ),
  CONSTRAINT academic_profiles_level_check CHECK (
    level IS NULL OR level IN ('high_school', 'diploma', 'ug', 'pg')
  ),
  CONSTRAINT academic_profiles_target_check CHECK (
    target_level IS NULL OR target_level IN (
      'undergraduate', 'masters', 'phd', 'certificate'
    )
  ),
  CONSTRAINT academic_profiles_accommodation_check CHECK (
    accommodation IS NULL OR accommodation IN ('dorm', 'apartment', 'shared')
  )
);

CREATE TABLE IF NOT EXISTS public.education_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  institution text NOT NULL,
  level text NOT NULL,
  country char(2),
  city text,
  board text NOT NULL,
  completion_year smallint,
  completion_status text,
  result_status text,
  score_value text,
  score_scale text,
  evidence_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  CONSTRAINT education_records_level_check CHECK (
    level IN ('school', 'college', 'university')
  ),
  CONSTRAINT education_records_completion_check CHECK (
    completion_status IS NULL OR completion_status IN (
      'completed', 'currently_studying', 'awaiting_result'
    )
  ),
  CONSTRAINT education_records_result_check CHECK (
    result_status IS NULL OR result_status IN (
      'available', 'awaiting_result', 'not_available'
    )
  )
);

CREATE INDEX IF NOT EXISTS education_records_case_year_idx
  ON public.education_records (case_id, completion_year);

CREATE TABLE IF NOT EXISTS public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  test_type text NOT NULL,
  test_variant text NOT NULL,
  scale_code text NOT NULL,
  scale_version text NOT NULL,
  score numeric(8, 3),
  reported_score text,
  subscores jsonb NOT NULL DEFAULT '[]'::jsonb,
  comparable_total numeric(8, 3),
  taken_on date NOT NULL,
  evidence_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  verification text NOT NULL DEFAULT 'unverified',
  leftover_id uuid,
  CONSTRAINT test_results_type_check CHECK (
    test_type IN ('IELTS', 'TOEFL', 'SAT', 'GRE', 'OTHER')
  ),
  CONSTRAINT test_results_verification_check CHECK (
    verification IN ('unverified', 'evidence_attached', 'counselor_review', 'verified')
  )
);

CREATE INDEX IF NOT EXISTS test_results_case_type_idx
  ON public.test_results (case_id, test_type);

CREATE TABLE IF NOT EXISTS public.student_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  ordinal smallint NOT NULL,
  type text NOT NULL,
  other_type text,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  duration_months smallint,
  duration_text text NOT NULL DEFAULT '',
  hours_week numeric(5, 2),
  achievements text,
  leftover_id uuid,
  CONSTRAINT student_activities_case_ordinal_key UNIQUE (case_id, ordinal),
  CONSTRAINT student_activities_ordinal_check CHECK (ordinal BETWEEN 1 AND 5),
  CONSTRAINT student_activities_hours_check CHECK (
    hours_week IS NULL OR hours_week BETWEEN 0 AND 168
  ),
  CONSTRAINT student_activities_type_check CHECK (
    type IN ('sport', 'academic', 'volunteer', 'arts', 'other')
  )
);

CREATE TABLE IF NOT EXISTS public.student_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  name text NOT NULL,
  outcome text NOT NULL,
  year smallint NOT NULL,
  amount numeric(20, 6),
  currency char(3),
  evidence_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  evidence_unavailable_reason text,
  CONSTRAINT student_awards_outcome_check CHECK (
    outcome IN ('received', 'not_granted')
  ),
  CONSTRAINT student_awards_amount_check CHECK (amount IS NULL OR amount >= 0),
  CONSTRAINT student_awards_amount_currency_check CHECK (
    (amount IS NULL) = (currency IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.country_preferences (
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  country_code char(2) NOT NULL REFERENCES public.countries (code),
  priority smallint NOT NULL,
  cities jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (case_id, country_code),
  CONSTRAINT country_preferences_case_priority_key UNIQUE (case_id, priority),
  CONSTRAINT country_preferences_priority_check CHECK (priority BETWEEN 1 AND 3)
);

CREATE TABLE IF NOT EXISTS public.relative_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  relationship text NOT NULL,
  country char(2) NOT NULL,
  city text NOT NULL
);

INSERT INTO public.taxonomy_terms (id, parent_id, kind, code, label) VALUES
  ('20000000-0000-4000-8000-000000000031', '20000000-0000-4000-8000-000000000001', 'discipline', 'other_stem', 'Other'),
  ('20000000-0000-4000-8000-000000000032', '20000000-0000-4000-8000-000000000002', 'discipline', 'other_engineering', 'Other'),
  ('20000000-0000-4000-8000-000000000033', '20000000-0000-4000-8000-000000000003', 'discipline', 'other_it', 'Other'),
  ('20000000-0000-4000-8000-000000000034', '20000000-0000-4000-8000-000000000004', 'discipline', 'other_business', 'Other'),
  ('20000000-0000-4000-8000-000000000035', '20000000-0000-4000-8000-000000000005', 'discipline', 'other_arts', 'Other'),
  ('20000000-0000-4000-8000-000000000036', '20000000-0000-4000-8000-000000000006', 'discipline', 'other_medicine', 'Other'),
  ('20000000-0000-4000-8000-000000000037', '20000000-0000-4000-8000-000000000007', 'discipline', 'other_health', 'Other'),
  ('20000000-0000-4000-8000-000000000038', '20000000-0000-4000-8000-000000000008', 'discipline', 'other_law', 'Other'),
  ('20000000-0000-4000-8000-000000000039', '20000000-0000-4000-8000-000000000001', 'discipline', 'undecided_stem', 'Undecided'),
  ('20000000-0000-4000-8000-00000000003a', '20000000-0000-4000-8000-000000000011', 'specialization', 'other_cs', 'Other')
ON CONFLICT (kind, code) DO NOTHING;

CREATE OR REPLACE FUNCTION commands.word_count(p_text text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_text IS NULL OR btrim(p_text) = '' THEN 0
    ELSE coalesce(array_length(regexp_split_to_array(btrim(p_text), '\s+'), 1), 0)
  END
$$;

CREATE OR REPLACE FUNCTION commands.supported_country_count()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.countries
  WHERE supported
    AND EXISTS (
      SELECT 1
      FROM public.universities u
      WHERE u.country = countries.code
        AND u.publication_state = 'published'
    )
$$;

CREATE OR REPLACE FUNCTION commands.has_data_use_consent(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT decision
    FROM public.consent_events
    WHERE case_id = p_case_id
      AND purpose = 'data_use'
    ORDER BY occurred_at DESC
    LIMIT 1
  ), false)
$$;

CREATE OR REPLACE FUNCTION commands.grant_is_live(p_case_id uuid, p_account_id uuid, p_scope text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.case_grants g
    WHERE g.case_id = p_case_id
      AND g.account_id = p_account_id
      AND g.scope = p_scope
      AND g.revoked_at IS NULL
      AND (g.expires_at IS NULL OR g.expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION commands.can_read_case(p_case_id uuid, p_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.id = p_case_id
      AND (
        c.student_account_id = p_account_id
        OR c.operating_guardian_id = p_account_id
        OR commands.grant_is_live(p_case_id, p_account_id, 'profile.read')
        OR commands.grant_is_live(p_case_id, p_account_id, 'profile.write')
      )
  )
$$;

CREATE OR REPLACE FUNCTION commands.require_case_scope(p_case_id uuid, p_scope text)
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
    RETURN actor;
  END IF;
  IF commands.grant_is_live(p_case_id, actor, p_scope)
     OR (p_scope = 'profile.read' AND commands.grant_is_live(p_case_id, actor, 'profile.write'))
  THEN
    RETURN actor;
  END IF;
  RAISE EXCEPTION 'FORBIDDEN';
END;
$$;

CREATE OR REPLACE FUNCTION commands.require_profile_write(p_case_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_case_scope(p_case_id, 'profile.write');
  IF NOT commands.has_data_use_consent(p_case_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN actor;
END;
$$;

CREATE OR REPLACE FUNCTION commands.sync_student_case_grants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  scope text;
BEGIN
  IF NEW.student_account_id IS NULL THEN
    RETURN NEW;
  END IF;
  FOREACH scope IN ARRAY ARRAY[
    'profile.read', 'profile.write', 'finance.read', 'finance.write',
    'shortlist.read', 'shortlist.write', 'booking.manage', 'report.read',
    'task.read', 'task.write', 'journey.read'
  ]
  LOOP
    INSERT INTO public.case_grants (case_id, account_id, scope)
    VALUES (NEW.id, NEW.student_account_id, scope)
    ON CONFLICT (case_id, account_id, scope) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cases_sync_student_grants ON public.cases;
CREATE TRIGGER cases_sync_student_grants
  AFTER INSERT OR UPDATE OF student_account_id ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION commands.sync_student_case_grants();

CREATE OR REPLACE FUNCTION commands.compare_test_requirement(
  p_result_scale text,
  p_result_version text,
  p_result_score numeric,
  p_req_scale text,
  p_req_version text,
  p_req_minimum numeric,
  p_concordance_revision text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_result_scale IS DISTINCT FROM p_req_scale
      OR p_result_version IS DISTINCT FROM p_req_version
    THEN 'manual review'
    WHEN p_concordance_revision IS NOT NULL
      AND (
        p_result_scale IS DISTINCT FROM p_req_scale
        OR p_result_version IS DISTINCT FROM p_req_version
      )
    THEN 'manual review'
    WHEN p_result_score IS NULL THEN 'manual review'
    WHEN p_result_score >= p_req_minimum THEN 'met'
    ELSE 'unmet'
  END
$$;

CREATE OR REPLACE FUNCTION commands.ensure_academic_profile(p_case_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  profile_id uuid;
BEGIN
  INSERT INTO public.academic_profiles (case_id)
  VALUES (p_case_id)
  ON CONFLICT (case_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO profile_id;
  RETURN profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION commands.validate_taxonomy_ids(p_ids uuid[], p_kind text)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  item uuid;
BEGIN
  IF p_ids IS NULL THEN
    RETURN;
  END IF;
  FOREACH item IN ARRAY p_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.taxonomy_terms
      WHERE id = item AND kind = p_kind AND active
    ) THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_academic_history(p_case_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  rec jsonb;
  years integer;
BEGIN
  actor := commands.require_profile_write(p_case_id);
  years := CASE
    WHEN p_payload ? 'educationYears' AND p_payload ->> 'educationYears' IS NOT NULL
      AND p_payload ->> 'educationYears' <> ''
    THEN (p_payload ->> 'educationYears')::integer
    ELSE NULL
  END;
  IF years IS NOT NULL AND (years < 0 OR years > 40) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  PERFORM commands.ensure_academic_profile(p_case_id);
  UPDATE public.academic_profiles
  SET
    level = nullif(p_payload ->> 'level', ''),
    education_years = years,
    updated_at = now()
  WHERE case_id = p_case_id;

  DELETE FROM public.education_records WHERE case_id = p_case_id;
  FOR rec IN SELECT value FROM jsonb_array_elements(coalesce(p_payload -> 'records', '[]'::jsonb))
  LOOP
    IF coalesce(rec ->> 'resultStatus', '') = 'available'
       AND coalesce(rec ->> 'scoreScale', '') = ''
    THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
    INSERT INTO public.education_records (
      case_id, institution, level, country, city, board,
      completion_year, completion_status, result_status,
      score_value, score_scale, evidence_id
    ) VALUES (
      p_case_id,
      coalesce(rec ->> 'institution', ''),
      rec ->> 'level',
      nullif(upper(rec ->> 'country'), ''),
      nullif(rec ->> 'city', ''),
      CASE
        WHEN rec ->> 'board' = 'other'
        THEN 'other:' || coalesce(rec ->> 'boardOther', '')
        ELSE rec ->> 'board'
      END,
      CASE WHEN rec ->> 'completionYear' ~ '^[0-9]+$' THEN (rec ->> 'completionYear')::smallint ELSE NULL END,
      nullif(rec ->> 'completionStatus', ''),
      nullif(rec ->> 'resultStatus', ''),
      nullif(rec ->> 'scoreValue', ''),
      CASE
        WHEN rec ->> 'scoreScale' = 'other'
        THEN 'other:' || coalesce(rec ->> 'scoreBounds', '')
        ELSE nullif(rec ->> 'scoreScale', '')
      END,
      CASE WHEN rec ->> 'evidenceId' ~ '^[0-9a-f-]{36}$' THEN (rec ->> 'evidenceId')::uuid ELSE NULL END
    );
  END LOOP;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'save_academic_history',
    'academic_profiles',
    p_case_id,
    commands.request_id(),
    jsonb_build_object('records', jsonb_array_length(coalesce(p_payload -> 'records', '[]'::jsonb)))
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'academic_history_saved',
    jsonb_build_object('case_id', p_case_id)
  );

  RETURN jsonb_build_object('caseId', p_case_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_test_results(p_case_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  rec jsonb;
  tests_taken boolean;
  scale_code text;
  scale_version text;
  taken_on date;
BEGIN
  actor := commands.require_profile_write(p_case_id);
  tests_taken := CASE
    WHEN p_payload ->> 'testsTaken' = 'true' THEN true
    WHEN p_payload ->> 'testsTaken' = 'false' THEN false
    ELSE NULL
  END;
  IF tests_taken IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF tests_taken AND jsonb_array_length(coalesce(p_payload -> 'tests', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  PERFORM commands.ensure_academic_profile(p_case_id);
  UPDATE public.academic_profiles
  SET tests_taken = tests_taken, updated_at = now()
  WHERE case_id = p_case_id;

  DELETE FROM public.test_results WHERE case_id = p_case_id;
  IF tests_taken THEN
    FOR rec IN SELECT value FROM jsonb_array_elements(coalesce(p_payload -> 'tests', '[]'::jsonb))
    LOOP
      scale_code := rec ->> 'scaleCode';
      scale_version := rec ->> 'scaleVersion';
      taken_on := (rec ->> 'takenOn')::date;
      IF taken_on > current_date THEN
        RAISE EXCEPTION 'VALIDATION_FAILED';
      END IF;
      IF rec ->> 'testType' = 'GRE' AND rec ? 'score' AND rec ->> 'score' IS NOT NULL AND rec ->> 'score' <> '' THEN
        RAISE EXCEPTION 'VALIDATION_FAILED';
      END IF;
      IF rec ->> 'testType' = 'TOEFL'
         AND scale_code = 'TOEFL_IBT_BAND_2026'
         AND rec ->> 'testType' = 'TOEFL'
         AND (rec ->> 'score')::numeric > 6
      THEN
        RAISE EXCEPTION 'VALIDATION_FAILED';
      END IF;
      INSERT INTO public.test_results (
        case_id, test_type, test_variant, scale_code, scale_version,
        score, reported_score, subscores, comparable_total, taken_on,
        evidence_id, verification
      ) VALUES (
        p_case_id,
        rec ->> 'testType',
        coalesce(nullif(rec ->> 'testVariant', ''), 'unspecified'),
        coalesce(nullif(scale_code, ''), 'OTHER_REPORTED'),
        coalesce(nullif(scale_version, ''), '1'),
        CASE WHEN rec ->> 'score' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (rec ->> 'score')::numeric ELSE NULL END,
        rec ->> 'reportedScore',
        coalesce(rec -> 'subscores', '[]'::jsonb),
        CASE WHEN rec ->> 'comparableTotal' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (rec ->> 'comparableTotal')::numeric ELSE NULL END,
        taken_on,
        CASE WHEN rec ->> 'evidenceId' ~ '^[0-9a-f-]{36}$' THEN (rec ->> 'evidenceId')::uuid ELSE NULL END,
        coalesce(nullif(rec ->> 'verification', ''), 'unverified')
      );
    END LOOP;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'save_test_results', 'test_results', p_case_id,
    commands.request_id(), jsonb_build_object('testsTaken', tests_taken)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'test_results_saved', jsonb_build_object('case_id', p_case_id)
  );
  RETURN jsonb_build_object('caseId', p_case_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_preferences(p_case_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  rec jsonb;
  required_count integer;
  target text;
  field_ids uuid[];
  previous_ids uuid[];
  discipline_ids uuid[];
  specialization_ids uuid[];
BEGIN
  actor := commands.require_profile_write(p_case_id);
  required_count := commands.supported_country_count();
  IF required_count > 3 THEN
    required_count := 3;
  END IF;
  target := nullif(p_payload ->> 'targetLevel', '');
  field_ids := coalesce((
    SELECT array_agg(value::uuid)
    FROM jsonb_array_elements_text(coalesce(p_payload -> 'fieldIds', '[]'::jsonb))
  ), '{}');
  previous_ids := coalesce((
    SELECT array_agg(value::uuid)
    FROM jsonb_array_elements_text(coalesce(p_payload -> 'previousFieldIds', '[]'::jsonb))
  ), '{}');
  discipline_ids := coalesce((
    SELECT array_agg(value::uuid)
    FROM jsonb_array_elements_text(coalesce(p_payload -> 'disciplineIds', '[]'::jsonb))
  ), '{}');
  specialization_ids := coalesce((
    SELECT array_agg(value::uuid)
    FROM jsonb_array_elements_text(coalesce(p_payload -> 'specializationIds', '[]'::jsonb))
  ), '{}');

  PERFORM commands.validate_taxonomy_ids(field_ids, 'field');
  PERFORM commands.validate_taxonomy_ids(previous_ids, 'field');
  PERFORM commands.validate_taxonomy_ids(discipline_ids, 'discipline');
  PERFORM commands.validate_taxonomy_ids(specialization_ids, 'specialization');

  IF target IS DISTINCT FROM 'masters' THEN
    discipline_ids := '{}';
    specialization_ids := '{}';
  END IF;

  IF jsonb_array_length(coalesce(p_payload -> 'countries', '[]'::jsonb)) <> required_count
     AND required_count > 0
  THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  PERFORM commands.ensure_academic_profile(p_case_id);
  UPDATE public.academic_profiles
  SET
    continuing_field = CASE
      WHEN p_payload ->> 'continuingField' = 'true' THEN true
      WHEN p_payload ->> 'continuingField' = 'false' THEN false
      ELSE NULL
    END,
    target_level = target,
    field_ids = field_ids,
    previous_field_ids = previous_ids,
    discipline_ids = discipline_ids,
    specialization_ids = specialization_ids,
    intake_month = CASE WHEN p_payload ->> 'intakeUndecided' = 'true' THEN NULL
      WHEN p_payload ->> 'intakeMonth' ~ '^[0-9]+$' THEN (p_payload ->> 'intakeMonth')::smallint
      ELSE NULL END,
    intake_year = CASE WHEN p_payload ->> 'intakeUndecided' = 'true' THEN NULL
      WHEN p_payload ->> 'intakeYear' ~ '^[0-9]+$' THEN (p_payload ->> 'intakeYear')::smallint
      ELSE NULL END,
    intake_undecided = coalesce((p_payload ->> 'intakeUndecided')::boolean, false),
    accommodation = nullif(p_payload ->> 'accommodation', ''),
    updated_at = now()
  WHERE case_id = p_case_id;

  DELETE FROM public.country_preferences WHERE case_id = p_case_id;
  FOR rec IN SELECT value FROM jsonb_array_elements(coalesce(p_payload -> 'countries', '[]'::jsonb))
  LOOP
    INSERT INTO public.country_preferences (case_id, country_code, priority, cities)
    VALUES (
      p_case_id,
      upper(rec ->> 'countryCode'),
      (rec ->> 'priority')::smallint,
      coalesce(rec -> 'cities', '[]'::jsonb)
    );
  END LOOP;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'save_preferences', 'academic_profiles', p_case_id,
    commands.request_id(), jsonb_build_object('targetLevel', target)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'preferences_saved', jsonb_build_object('case_id', p_case_id)
  );
  RETURN jsonb_build_object('caseId', p_case_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_experience(p_case_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  rec jsonb;
  ordinal integer := 0;
BEGIN
  actor := commands.require_profile_write(p_case_id);
  IF commands.word_count(coalesce(p_payload ->> 'careerGoal', '')) > 200 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF jsonb_array_length(coalesce(p_payload -> 'activities', '[]'::jsonb)) > 5 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  PERFORM commands.ensure_academic_profile(p_case_id);
  UPDATE public.academic_profiles
  SET
    career_goal = nullif(p_payload ->> 'careerGoal', ''),
    scholarship_received = CASE
      WHEN p_payload ->> 'scholarshipReceived' = 'true' THEN true
      WHEN p_payload ->> 'scholarshipReceived' = 'false' THEN false
      ELSE NULL END,
    scholarship_not_granted = CASE
      WHEN p_payload ->> 'scholarshipNotGranted' = 'true' THEN true
      WHEN p_payload ->> 'scholarshipNotGranted' = 'false' THEN false
      ELSE NULL END,
    intro_file_id = CASE WHEN p_payload ->> 'introFileId' ~ '^[0-9a-f-]{36}$' THEN (p_payload ->> 'introFileId')::uuid ELSE NULL END,
    intro_language = nullif(p_payload ->> 'introLanguage', ''),
    intro_caption = nullif(p_payload ->> 'introCaption', ''),
    updated_at = now()
  WHERE case_id = p_case_id;

  DELETE FROM public.student_activities WHERE case_id = p_case_id;
  FOR rec IN SELECT value FROM jsonb_array_elements(coalesce(p_payload -> 'activities', '[]'::jsonb))
  LOOP
    ordinal := ordinal + 1;
    INSERT INTO public.student_activities (
      case_id, ordinal, type, other_type, name, role,
      duration_months, duration_text, hours_week, achievements
    ) VALUES (
      p_case_id,
      ordinal,
      rec ->> 'type',
      nullif(rec ->> 'otherType', ''),
      rec ->> 'name',
      coalesce(rec ->> 'role', ''),
      CASE WHEN rec ->> 'durationMonths' ~ '^[0-9]+$' THEN (rec ->> 'durationMonths')::smallint ELSE NULL END,
      coalesce(rec ->> 'durationText', ''),
      CASE WHEN rec ->> 'hoursWeek' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (rec ->> 'hoursWeek')::numeric ELSE NULL END,
      nullif(rec ->> 'achievements', '')
    );
  END LOOP;

  DELETE FROM public.student_awards WHERE case_id = p_case_id;
  FOR rec IN SELECT value FROM jsonb_array_elements(coalesce(p_payload -> 'awards', '[]'::jsonb))
  LOOP
    INSERT INTO public.student_awards (
      case_id, name, outcome, year, amount, currency, evidence_id, evidence_unavailable_reason
    ) VALUES (
      p_case_id,
      rec ->> 'name',
      rec ->> 'outcome',
      (rec ->> 'year')::smallint,
      CASE WHEN rec ->> 'amount' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (rec ->> 'amount')::numeric ELSE NULL END,
      nullif(upper(rec ->> 'currency'), ''),
      CASE WHEN rec ->> 'evidenceId' ~ '^[0-9a-f-]{36}$' THEN (rec ->> 'evidenceId')::uuid ELSE NULL END,
      nullif(rec ->> 'evidenceUnavailableReason', '')
    );
  END LOOP;

  DELETE FROM public.relative_connections WHERE case_id = p_case_id;
  IF p_payload #>> '{relative,hasRelative}' = 'true' THEN
    INSERT INTO public.relative_connections (case_id, relationship, country, city)
    VALUES (
      p_case_id,
      coalesce(p_payload #>> '{relative,relationship}', ''),
      upper(p_payload #>> '{relative,country}'),
      coalesce(p_payload #>> '{relative,city}', '')
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'save_experience', 'academic_profiles', p_case_id,
    commands.request_id(), jsonb_build_object('activities', ordinal)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'experience_saved', jsonb_build_object('case_id', p_case_id)
  );
  RETURN jsonb_build_object('caseId', p_case_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.complete_module2(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  profile public.academic_profiles%ROWTYPE;
  required_count integer;
  country_count integer;
  education_count integer;
  test_count integer;
  received_count integer;
  not_granted_count integer;
BEGIN
  actor := commands.require_profile_write(p_case_id);
  SELECT * INTO profile FROM public.academic_profiles WHERE case_id = p_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF profile.level IS NULL
     OR profile.education_years IS NULL
     OR profile.target_level IS NULL
     OR coalesce(array_length(profile.field_ids, 1), 0) = 0
     OR profile.accommodation IS NULL
     OR coalesce(btrim(profile.career_goal), '') = ''
     OR commands.word_count(profile.career_goal) > 200
     OR profile.tests_taken IS NULL
     OR profile.scholarship_received IS NULL
     OR profile.scholarship_not_granted IS NULL
     OR (NOT profile.intake_undecided AND (profile.intake_month IS NULL OR profile.intake_year IS NULL))
  THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF profile.target_level = 'masters'
     AND coalesce(array_length(profile.discipline_ids, 1), 0) = 0
  THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT count(*) INTO education_count FROM public.education_records WHERE case_id = p_case_id;
  IF education_count = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.education_records
    WHERE case_id = p_case_id
      AND (
        country IS NULL OR btrim(city) = ''
        OR (result_status = 'available' AND (score_value IS NULL OR score_scale IS NULL))
      )
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  required_count := least(3, commands.supported_country_count());
  SELECT count(*) INTO country_count FROM public.country_preferences WHERE case_id = p_case_id;
  IF required_count > 0 AND country_count <> required_count THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT count(*) INTO test_count FROM public.test_results WHERE case_id = p_case_id;
  IF profile.tests_taken AND test_count = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT count(*) INTO received_count FROM public.student_awards WHERE case_id = p_case_id AND outcome = 'received';
  SELECT count(*) INTO not_granted_count FROM public.student_awards WHERE case_id = p_case_id AND outcome = 'not_granted';
  IF profile.scholarship_received AND received_count = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF profile.scholarship_not_granted AND not_granted_count = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.cases
  SET module2_completed_at = coalesce(module2_completed_at, now()),
      updated_at = now(),
      version = version + 1
  WHERE id = p_case_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'complete_module2', 'cases', p_case_id,
    commands.request_id(), jsonb_build_object('completed', true)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'module2_completed', jsonb_build_object('case_id', p_case_id)
  );
  RETURN jsonb_build_object('caseId', p_case_id, 'completed', true);
END;
$$;

CREATE OR REPLACE FUNCTION commands.register_file_upload(
  p_case_id uuid,
  p_purpose text,
  p_size_bytes bigint,
  p_mime text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  file_id uuid;
  object_key text;
  limit_bytes bigint;
BEGIN
  actor := commands.require_profile_write(p_case_id);
  IF NOT public.is_file_purpose(p_purpose) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_size_bytes IS NULL OR p_size_bytes <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  limit_bytes := CASE
    WHEN p_purpose IN ('profile_image', 'photo') THEN 5 * 1024 * 1024
    WHEN p_purpose = 'introduction_media' THEN 100 * 1024 * 1024
    ELSE 20 * 1024 * 1024
  END;
  IF p_size_bytes > limit_bytes THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_mime IN ('text/html', 'image/svg+xml', 'application/xhtml+xml', 'application/x-msdownload') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  object_key := p_case_id::text || '/' || gen_random_uuid()::text;
  INSERT INTO public.files (
    owner_id, case_id, purpose, object_key, size_bytes, declared_mime, state
  ) VALUES (
    actor, p_case_id, p_purpose, object_key, p_size_bytes, p_mime, 'pending'
  ) RETURNING id INTO file_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'register_file_upload', 'files', file_id,
    commands.request_id(), jsonb_build_object('purpose', p_purpose)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'files', file_id, 1, 'file_upload_registered',
    jsonb_build_object('file_id', file_id, 'case_id', p_case_id)
  );
  RETURN jsonb_build_object(
    'id', file_id,
    'objectKey', object_key,
    'bucket', 'student-documents'
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.complete_file_upload(
  p_file_id uuid,
  p_detected_mime text,
  p_sha256 text,
  p_duration_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.files%ROWTYPE;
  next_state text;
BEGIN
  SELECT * INTO row FROM public.files WHERE id = p_file_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  actor := commands.require_profile_write(row.case_id);
  IF row.owner_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_duration_seconds IS NOT NULL AND row.purpose = 'introduction_media' AND p_duration_seconds > 60 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_detected_mime IN ('text/html', 'image/svg+xml') THEN
    next_state := 'rejected';
  ELSE
    next_state := 'clean';
  END IF;
  UPDATE public.files
  SET detected_mime = nullif(p_detected_mime, ''),
      sha256 = nullif(p_sha256, ''),
      state = next_state
  WHERE id = p_file_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'complete_file_upload', 'files', p_file_id,
    commands.request_id(), jsonb_build_object('state', next_state)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'files', p_file_id, 1, 'file_upload_completed',
    jsonb_build_object('file_id', p_file_id, 'state', next_state)
  );
  RETURN jsonb_build_object('id', p_file_id, 'state', next_state);
END;
$$;

CREATE OR REPLACE FUNCTION commands.issue_file_download(p_file_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.files%ROWTYPE;
BEGIN
  SELECT * INTO row FROM public.files WHERE id = p_file_id AND state <> 'deleted';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  actor := commands.require_case_scope(row.case_id, 'profile.read');
  IF row.purpose IN ('financial_proof', 'award_evidence')
     AND NOT (
       EXISTS (SELECT 1 FROM public.cases c WHERE c.id = row.case_id AND c.student_account_id = actor)
       OR commands.grant_is_live(row.case_id, actor, 'finance.read')
     )
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF row.state <> 'clean' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'issue_file_download', 'files', p_file_id,
    commands.request_id(), jsonb_build_object('issued', true)
  );
  RETURN jsonb_build_object(
    'id', row.id,
    'objectKey', row.object_key,
    'bucket', 'student-documents',
    'purpose', row.purpose,
    'state', row.state
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_read_case(p_case_id uuid, p_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
  SELECT commands.can_read_case(p_case_id, p_account_id)
$$;

GRANT EXECUTE ON FUNCTION public.can_read_case(uuid, uuid) TO authenticated;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relative_connections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academic_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.education_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.test_results FORCE ROW LEVEL SECURITY;
ALTER TABLE public.student_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.student_awards FORCE ROW LEVEL SECURITY;
ALTER TABLE public.country_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE public.relative_connections FORCE ROW LEVEL SECURITY;

CREATE POLICY files_select_case ON public.files
  FOR SELECT TO authenticated
  USING (public.can_read_case(case_id, auth.uid()));

CREATE POLICY case_grants_select_own ON public.case_grants
  FOR SELECT TO authenticated
  USING (account_id = auth.uid() OR public.can_read_case(case_id, auth.uid()));

CREATE POLICY academic_profiles_select_case ON public.academic_profiles
  FOR SELECT TO authenticated
  USING (public.can_read_case(case_id, auth.uid()));

CREATE POLICY education_records_select_case ON public.education_records
  FOR SELECT TO authenticated
  USING (public.can_read_case(case_id, auth.uid()));

CREATE POLICY test_results_select_case ON public.test_results
  FOR SELECT TO authenticated
  USING (public.can_read_case(case_id, auth.uid()));

CREATE POLICY student_activities_select_case ON public.student_activities
  FOR SELECT TO authenticated
  USING (public.can_read_case(case_id, auth.uid()));

CREATE POLICY student_awards_select_case ON public.student_awards
  FOR SELECT TO authenticated
  USING (public.can_read_case(case_id, auth.uid()));

CREATE POLICY country_preferences_select_case ON public.country_preferences
  FOR SELECT TO authenticated
  USING (public.can_read_case(case_id, auth.uid()));

CREATE POLICY relative_connections_select_case ON public.relative_connections
  FOR SELECT TO authenticated
  USING (public.can_read_case(case_id, auth.uid()));

REVOKE ALL ON public.files FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.case_grants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.academic_profiles FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.education_records FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.test_results FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.student_activities FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.student_awards FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.country_preferences FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.relative_connections FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.files TO authenticated;
GRANT SELECT ON public.case_grants TO authenticated;
GRANT SELECT ON public.academic_profiles TO authenticated;
GRANT SELECT ON public.education_records TO authenticated;
GRANT SELECT ON public.test_results TO authenticated;
GRANT SELECT ON public.student_activities TO authenticated;
GRANT SELECT ON public.student_awards TO authenticated;
GRANT SELECT ON public.country_preferences TO authenticated;
GRANT SELECT ON public.relative_connections TO authenticated;

GRANT ALL ON public.files TO postgres, service_role;
GRANT ALL ON public.case_grants TO postgres, service_role;
GRANT ALL ON public.academic_profiles TO postgres, service_role;
GRANT ALL ON public.education_records TO postgres, service_role;
GRANT ALL ON public.test_results TO postgres, service_role;
GRANT ALL ON public.student_activities TO postgres, service_role;
GRANT ALL ON public.student_awards TO postgres, service_role;
GRANT ALL ON public.country_preferences TO postgres, service_role;
GRANT ALL ON public.relative_connections TO postgres, service_role;

REVOKE INSERT, UPDATE, DELETE ON public.student_profiles
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.test_scores_log
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.activities
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.documents
  FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO public.case_grants (case_id, account_id, scope)
SELECT c.id, c.student_account_id, scope
FROM public.cases c
CROSS JOIN unnest(ARRAY[
  'profile.read', 'profile.write', 'finance.read', 'finance.write',
  'shortlist.read', 'shortlist.write', 'booking.manage', 'report.read',
  'task.read', 'task.write', 'journey.read'
]) AS scope
WHERE c.student_account_id IS NOT NULL
ON CONFLICT (case_id, account_id, scope) DO NOTHING;

INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
SELECT pl.case_id, pl.parent_id, scope, pl.id
FROM public.parent_links pl
JOIN public.parent_invitations pi ON pi.case_id = pl.case_id AND pi.accepted_at IS NOT NULL
CROSS JOIN LATERAL unnest(pi.scopes) AS scope
WHERE pl.status IN ('active', 'accepted_pending_verification')
  AND pl.revoked_at IS NULL
ON CONFLICT (case_id, account_id, scope) DO NOTHING;

INSERT INTO public.academic_profiles (
  case_id, career_goal, tests_taken
)
SELECT
  c.id,
  NULLIF(btrim(sp.target_major), ''),
  CASE WHEN sp.test_scores IS NULL OR sp.test_scores = '{}'::jsonb THEN NULL ELSE true END
FROM public.student_profiles sp
JOIN public.cases c ON c.student_account_id = sp.user_id
ON CONFLICT (case_id) DO NOTHING;

INSERT INTO public.education_records (
  case_id, institution, level, country, city, board,
  completion_year, completion_status, result_status, score_value, score_scale
)
SELECT
  c.id,
  'Not provided',
  'school',
  CASE
    WHEN length(btrim(sp.target_country)) = 2
      AND EXISTS (SELECT 1 FROM public.countries x WHERE x.code = upper(btrim(sp.target_country)))
    THEN upper(btrim(sp.target_country))
    ELSE i.residence_country
  END,
  'Not provided',
  'national',
  sp.graduation_year,
  'completed',
  'available',
  sp.gpa::text,
  'gpa'
FROM public.student_profiles sp
JOIN public.cases c ON c.student_account_id = sp.user_id
LEFT JOIN public.identities i ON i.account_id = sp.user_id
WHERE (
  (
    length(btrim(sp.target_country)) = 2
    AND EXISTS (SELECT 1 FROM public.countries x WHERE x.code = upper(btrim(sp.target_country)))
  )
  OR i.residence_country IS NOT NULL
);

INSERT INTO public.country_preferences (case_id, country_code, priority, cities)
SELECT c.id, upper(btrim(sp.target_country)), 1, '[]'::jsonb
FROM public.student_profiles sp
JOIN public.cases c ON c.student_account_id = sp.user_id
WHERE length(btrim(sp.target_country)) = 2
  AND EXISTS (SELECT 1 FROM public.countries x WHERE x.code = upper(btrim(sp.target_country)))
ON CONFLICT (case_id, country_code) DO NOTHING;

INSERT INTO public.test_results (
  case_id, test_type, test_variant, scale_code, scale_version,
  score, reported_score, subscores, comparable_total, taken_on,
  verification, leftover_id
)
SELECT
  c.id,
  CASE
    WHEN l.test_type IN ('IELTS', 'TOEFL', 'SAT', 'GRE') THEN l.test_type
    ELSE 'OTHER'
  END,
  CASE
    WHEN l.test_type = 'TOEFL' AND l.test_date >= DATE '2026-01-21' THEN 'ibt_band_2026'
    WHEN l.test_type = 'TOEFL' THEN 'ibt_legacy_120'
    ELSE lower(l.test_type)
  END,
  CASE
    WHEN l.test_type = 'IELTS' THEN 'IELTS_09'
    WHEN l.test_type = 'TOEFL' AND l.test_date >= DATE '2026-01-21' THEN 'TOEFL_IBT_BAND_2026'
    WHEN l.test_type = 'TOEFL' THEN 'TOEFL_IBT_LEGACY_120'
    WHEN l.test_type = 'SAT' THEN 'SAT_1600'
    WHEN l.test_type = 'GRE' THEN 'GRE_V_Q_AW'
    ELSE 'OTHER_REPORTED'
  END,
  CASE
    WHEN l.test_type = 'TOEFL' AND l.test_date >= DATE '2026-01-21' THEN '2026.1'
    WHEN l.test_type = 'TOEFL' THEN 'legacy.1'
    ELSE 'leftover.1'
  END,
  CASE WHEN l.test_type = 'GRE' THEN NULL ELSE l.score END,
  l.score::text,
  CASE
    WHEN l.test_type = 'GRE' THEN jsonb_build_array(
      jsonb_build_object('name', 'quantitative', 'score', null, 'reported', l.score::text),
      jsonb_build_object('name', 'verbal', 'score', null, 'reported', l.score::text),
      jsonb_build_object('name', 'analytical_writing', 'score', null, 'reported', '')
    )
    ELSE '[]'::jsonb
  END,
  NULL,
  l.test_date,
  CASE WHEN l.test_type IN ('ACT', 'GMAT', 'GRE') THEN 'counselor_review' ELSE 'unverified' END,
  l.id
FROM public.test_scores_log l
JOIN public.cases c ON c.student_account_id = l.student_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_results t WHERE t.leftover_id = l.id
);

INSERT INTO public.student_activities (
  case_id, ordinal, type, name, role, duration_months, hours_week, achievements, leftover_id
)
SELECT
  ranked.case_id,
  ranked.ordinal,
  'other',
  ranked.title,
  ranked.role,
  NULL,
  ranked.hours_per_week,
  NULLIF(ranked.description, ''),
  ranked.id
FROM (
  SELECT
    c.id AS case_id,
    a.id,
    a.title,
    a.role,
    a.hours_per_week,
    a.description,
    row_number() OVER (PARTITION BY c.id ORDER BY a.created_at, a.id) AS ordinal
  FROM public.activities a
  JOIN public.cases c ON c.student_account_id = a.student_id
) ranked
WHERE ranked.ordinal <= 5
ON CONFLICT (case_id, ordinal) DO NOTHING;

INSERT INTO public.files (
  owner_id, case_id, purpose, object_key, size_bytes, declared_mime, state, original_name
)
SELECT
  d.user_id,
  c.id,
  CASE
    WHEN d.document_type = 'transcript' THEN 'transcript'
    WHEN d.document_type = 'passport' THEN 'passport'
    WHEN d.document_type = 'recommendation_letter' THEN 'recommendation_letter'
    ELSE 'other'
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM public.files f WHERE f.object_key = d.file_url)
    THEN d.user_id::text || '/' || d.id::text
    ELSE d.file_url
  END,
  1,
  'application/octet-stream',
  'pending',
  d.file_name
FROM public.documents d
JOIN public.cases c ON c.student_account_id = d.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.files f WHERE f.object_key = d.file_url OR f.original_name = d.file_name AND f.case_id = c.id AND f.owner_id = d.user_id
);

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION public.is_file_purpose(text) TO authenticated, gsc_api_executor;
GRANT EXECUTE ON FUNCTION commands.can_read_case(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION commands.grant_is_live(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION commands.word_count(text) TO authenticated, gsc_api_executor;
GRANT EXECUTE ON FUNCTION commands.compare_test_requirement(text, text, numeric, text, text, numeric, text)
  TO authenticated, gsc_api_executor;
