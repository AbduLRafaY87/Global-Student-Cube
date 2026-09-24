-- Saved university+program pairs (0–3, race-proof) and program self-assessment.
-- Recommendations are not saved slots. Review flags live only on saved rows.

CREATE TABLE IF NOT EXISTS public.saved_program_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  university_id uuid NOT NULL REFERENCES public.universities (id) ON DELETE RESTRICT,
  program_id uuid NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  slot smallint NOT NULL,
  review_flagged boolean NOT NULL DEFAULT false,
  CONSTRAINT saved_program_pairs_slot_range CHECK (slot BETWEEN 1 AND 3),
  CONSTRAINT saved_program_pairs_case_slot_key UNIQUE (case_id, slot),
  CONSTRAINT saved_program_pairs_case_pair_key UNIQUE (case_id, university_id, program_id),
  CONSTRAINT saved_program_pairs_program_belongs_fk
    FOREIGN KEY (university_id, program_id)
    REFERENCES public.programs (university_id, id)
);

CREATE TABLE IF NOT EXISTS public.program_self_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  program_id uuid NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  university_id uuid NOT NULL REFERENCES public.universities (id) ON DELETE RESTRICT,
  requirement_version text NOT NULL,
  equal_weights boolean NOT NULL DEFAULT false,
  score numeric(8, 4),
  label text NOT NULL,
  known_coverage numeric(8, 4),
  possible_low numeric(8, 4),
  possible_high numeric(8, 4),
  author_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  CONSTRAINT program_self_assessments_case_program_key UNIQUE (case_id, program_id),
  CONSTRAINT program_self_assessments_label_check CHECK (label IN (
    'likely_eligible',
    'possibly_eligible',
    'requirements_not_met',
    'provisional',
    'unknown'
  )),
  CONSTRAINT program_self_assessments_program_belongs_fk
    FOREIGN KEY (university_id, program_id)
    REFERENCES public.programs (university_id, id)
);

CREATE TABLE IF NOT EXISTS public.program_self_assessment_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.program_self_assessments (id) ON DELETE CASCADE,
  criterion_key text NOT NULL,
  kind text NOT NULL,
  weight numeric(10, 4) NOT NULL,
  mandatory boolean NOT NULL,
  published_threshold text NOT NULL,
  answer text NOT NULL,
  evidence_file_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  explanation text NOT NULL DEFAULT '',
  verification_state text NOT NULL,
  CONSTRAINT program_self_assessment_answers_unique UNIQUE (assessment_id, criterion_key),
  CONSTRAINT program_self_assessment_answers_answer_check CHECK (answer IN (
    'meets',
    'does_not_meet',
    'unknown',
    'not_applicable'
  )),
  CONSTRAINT program_self_assessment_answers_verification_check CHECK (verification_state IN (
    'verified',
    'unverified',
    'unlike_scale',
    'missing_evidence',
    'not_applicable'
  ))
);

CREATE OR REPLACE FUNCTION public.can_read_shortlist(p_case_id uuid, p_account_id uuid)
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
        OR commands.grant_is_live(p_case_id, p_account_id, 'shortlist.read')
        OR commands.grant_is_live(p_case_id, p_account_id, 'shortlist.write')
      )
  )
$$;

CREATE OR REPLACE FUNCTION commands.require_shortlist_write(p_case_id uuid)
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
  IF commands.grant_is_live(p_case_id, actor, 'shortlist.write') THEN
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
    IF scope = 'shortlist.write' THEN
      INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
      VALUES (link.case_id, link.parent_id, 'shortlist.read', p_link_id)
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

CREATE OR REPLACE FUNCTION commands.save_program_pair(
  p_case_id uuid,
  p_university_id uuid,
  p_program_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  case_row public.cases%ROWTYPE;
  existing public.saved_program_pairs%ROWTYPE;
  next_slot smallint;
  inserted public.saved_program_pairs%ROWTYPE;
BEGIN
  actor := commands.require_shortlist_write(p_case_id);

  SELECT * INTO case_row
  FROM public.cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF case_row.module3_completed_at IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.programs p
    JOIN public.universities u ON u.id = p.university_id
    WHERE p.id = p_program_id
      AND p.university_id = p_university_id
      AND p.publication_state = 'published'
      AND u.publication_state = 'published'
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT * INTO existing
  FROM public.saved_program_pairs
  WHERE case_id = p_case_id
    AND university_id = p_university_id
    AND program_id = p_program_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', existing.id,
      'caseId', p_case_id,
      'universityId', existing.university_id,
      'programId', existing.program_id,
      'slot', existing.slot,
      'reviewFlagged', existing.review_flagged,
      'created', false
    );
  END IF;

  FOR next_slot IN
    SELECT slot_num
    FROM generate_series(1, 3) AS slot_num
    WHERE slot_num NOT IN (
      SELECT slot FROM public.saved_program_pairs WHERE case_id = p_case_id
    )
    ORDER BY slot_num
  LOOP
    BEGIN
      INSERT INTO public.saved_program_pairs (
        case_id, university_id, program_id, slot
      ) VALUES (
        p_case_id, p_university_id, p_program_id, next_slot
      )
      RETURNING * INTO inserted;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT * INTO existing
        FROM public.saved_program_pairs
        WHERE case_id = p_case_id
          AND university_id = p_university_id
          AND program_id = p_program_id;
        IF FOUND THEN
          RETURN jsonb_build_object(
            'id', existing.id,
            'caseId', p_case_id,
            'universityId', existing.university_id,
            'programId', existing.program_id,
            'slot', existing.slot,
            'reviewFlagged', existing.review_flagged,
            'created', false
          );
        END IF;
        inserted := NULL;
    END;
  END LOOP;

  IF inserted.id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'save_program_pair', 'saved_program_pairs', inserted.id,
    commands.request_id(),
    jsonb_build_object(
      'case_id', p_case_id,
      'university_id', p_university_id,
      'program_id', p_program_id,
      'slot', inserted.slot
    )
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'program_pair_saved',
    jsonb_build_object('case_id', p_case_id, 'saved_id', inserted.id)
  );

  RETURN jsonb_build_object(
    'id', inserted.id,
    'caseId', p_case_id,
    'universityId', inserted.university_id,
    'programId', inserted.program_id,
    'slot', inserted.slot,
    'reviewFlagged', inserted.review_flagged,
    'created', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.remove_saved_program(p_case_id uuid, p_saved_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  existing public.saved_program_pairs%ROWTYPE;
BEGIN
  actor := commands.require_shortlist_write(p_case_id);

  PERFORM 1 FROM public.cases WHERE id = p_case_id FOR UPDATE;

  SELECT * INTO existing
  FROM public.saved_program_pairs
  WHERE id = p_saved_id AND case_id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  DELETE FROM public.saved_program_pairs WHERE id = existing.id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'remove_saved_program', 'saved_program_pairs', existing.id,
    commands.request_id(),
    jsonb_build_object(
      'case_id', p_case_id,
      'university_id', existing.university_id,
      'program_id', existing.program_id,
      'was_flagged', existing.review_flagged
    )
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'program_pair_removed',
    jsonb_build_object('case_id', p_case_id, 'saved_id', existing.id)
  );

  RETURN jsonb_build_object(
    'caseId', p_case_id,
    'id', existing.id,
    'removed', true,
    'flagCleared', existing.review_flagged
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.set_review_flag(
  p_case_id uuid,
  p_saved_id uuid,
  p_flagged boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  existing public.saved_program_pairs%ROWTYPE;
BEGIN
  actor := commands.require_shortlist_write(p_case_id);

  PERFORM 1 FROM public.cases WHERE id = p_case_id FOR UPDATE;

  SELECT * INTO existing
  FROM public.saved_program_pairs
  WHERE id = p_saved_id AND case_id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.saved_program_pairs
  SET review_flagged = p_flagged
  WHERE id = existing.id
  RETURNING * INTO existing;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'set_review_flag', 'saved_program_pairs', existing.id,
    commands.request_id(),
    jsonb_build_object('case_id', p_case_id, 'flagged', p_flagged)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'review_flag_set',
    jsonb_build_object('case_id', p_case_id, 'saved_id', existing.id, 'flagged', p_flagged)
  );

  RETURN jsonb_build_object(
    'id', existing.id,
    'caseId', p_case_id,
    'reviewFlagged', existing.review_flagged
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_program_assessment(p_case_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  program_id uuid;
  university_id uuid;
  assessment_id uuid;
  answer jsonb;
BEGIN
  actor := commands.require_shortlist_write(p_case_id);
  program_id := (p_payload ->> 'programId')::uuid;
  university_id := (p_payload ->> 'universityId')::uuid;

  IF program_id IS NULL OR university_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_id AND p.university_id = university_id
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF coalesce(p_payload ->> 'requirementVersion', '') = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF coalesce(p_payload ->> 'label', '') NOT IN (
    'likely_eligible', 'possibly_eligible', 'requirements_not_met', 'provisional', 'unknown'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.program_self_assessments (
    case_id, program_id, university_id, requirement_version, equal_weights,
    score, label, known_coverage, possible_low, possible_high, author_id
  ) VALUES (
    p_case_id,
    program_id,
    university_id,
    p_payload ->> 'requirementVersion',
    coalesce((p_payload ->> 'equalWeights')::boolean, false),
    CASE
      WHEN p_payload ->> 'score' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (p_payload ->> 'score')::numeric
      ELSE NULL
    END,
    p_payload ->> 'label',
    CASE
      WHEN p_payload ->> 'knownCoverage' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (p_payload ->> 'knownCoverage')::numeric
      ELSE NULL
    END,
    CASE
      WHEN p_payload ->> 'possibleLow' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (p_payload ->> 'possibleLow')::numeric
      ELSE NULL
    END,
    CASE
      WHEN p_payload ->> 'possibleHigh' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (p_payload ->> 'possibleHigh')::numeric
      ELSE NULL
    END,
    actor
  )
  ON CONFLICT (case_id, program_id) DO UPDATE SET
    university_id = EXCLUDED.university_id,
    requirement_version = EXCLUDED.requirement_version,
    equal_weights = EXCLUDED.equal_weights,
    score = EXCLUDED.score,
    label = EXCLUDED.label,
    known_coverage = EXCLUDED.known_coverage,
    possible_low = EXCLUDED.possible_low,
    possible_high = EXCLUDED.possible_high,
    author_id = EXCLUDED.author_id,
    updated_at = now()
  RETURNING id INTO assessment_id;

  DELETE FROM public.program_self_assessment_answers WHERE assessment_id = assessment_id;

  FOR answer IN SELECT value FROM jsonb_array_elements(coalesce(p_payload -> 'answers', '[]'::jsonb))
  LOOP
    IF coalesce(answer ->> 'criterionKey', '') = ''
      OR coalesce(answer ->> 'answer', '') NOT IN (
        'meets', 'does_not_meet', 'unknown', 'not_applicable'
      )
      OR coalesce(answer ->> 'verificationState', '') NOT IN (
        'verified', 'unverified', 'unlike_scale', 'missing_evidence', 'not_applicable'
      )
    THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;

    INSERT INTO public.program_self_assessment_answers (
      assessment_id, criterion_key, kind, weight, mandatory, published_threshold,
      answer, evidence_file_id, explanation, verification_state
    ) VALUES (
      assessment_id,
      answer ->> 'criterionKey',
      coalesce(nullif(answer ->> 'kind', ''), 'academic'),
      coalesce(nullif(answer ->> 'weight', '')::numeric, 1),
      coalesce((answer ->> 'mandatory')::boolean, true),
      coalesce(nullif(answer ->> 'publishedThreshold', ''), 'Not provided'),
      answer ->> 'answer',
      NULLIF(answer ->> 'evidenceFileId', '')::uuid,
      coalesce(answer ->> 'explanation', ''),
      answer ->> 'verificationState'
    );
  END LOOP;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'save_program_assessment', 'program_self_assessments', assessment_id,
    commands.request_id(), jsonb_build_object('case_id', p_case_id, 'program_id', program_id)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'program_assessment_saved',
    jsonb_build_object('case_id', p_case_id, 'assessment_id', assessment_id)
  );

  RETURN jsonb_build_object(
    'id', assessment_id,
    'caseId', p_case_id,
    'programId', program_id,
    'label', p_payload ->> 'label'
  );
END;
$$;

ALTER TABLE public.saved_program_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_program_pairs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.saved_program_pairs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.saved_program_pairs TO authenticated;
GRANT ALL ON public.saved_program_pairs TO postgres, service_role;

CREATE POLICY saved_program_pairs_select_scope
  ON public.saved_program_pairs
  FOR SELECT TO authenticated
  USING (public.can_read_shortlist(case_id, auth.uid()));

ALTER TABLE public.program_self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_self_assessments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.program_self_assessments FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.program_self_assessments TO authenticated;
GRANT ALL ON public.program_self_assessments TO postgres, service_role;

CREATE POLICY program_self_assessments_select_scope
  ON public.program_self_assessments
  FOR SELECT TO authenticated
  USING (public.can_read_shortlist(case_id, auth.uid()));

ALTER TABLE public.program_self_assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_self_assessment_answers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.program_self_assessment_answers FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.program_self_assessment_answers TO authenticated;
GRANT ALL ON public.program_self_assessment_answers TO postgres, service_role;

CREATE POLICY program_self_assessment_answers_select_scope
  ON public.program_self_assessment_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.program_self_assessments a
      WHERE a.id = assessment_id
        AND public.can_read_shortlist(a.case_id, auth.uid())
    )
  );

GRANT EXECUTE ON FUNCTION public.can_read_shortlist(uuid, uuid) TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
