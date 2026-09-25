-- Spec WP-16 journey and roadmap: selected-target tasks, private milestones,
-- chronology flags, independent publication consent.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source_key text;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_case_source_key_uidx
  ON public.tasks (case_id, source_key)
  WHERE source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.roadmap_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  program_id uuid NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  university_id uuid NOT NULL REFERENCES public.universities (id) ON DELETE RESTRICT,
  system_id uuid REFERENCES public.application_systems (id) ON DELETE RESTRICT,
  criteria_revision integer NOT NULL DEFAULT 1,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS roadmap_revisions_case_idx
  ON public.roadmap_revisions (case_id, confirmed_at DESC);

CREATE TABLE IF NOT EXISTS public.journey_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  occurred_on date,
  date_precision text NOT NULL DEFAULT 'day',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  self_reported boolean NOT NULL DEFAULT true,
  verification_state text NOT NULL DEFAULT 'self_reported',
  exception_note text,
  public_consent_id uuid,
  author_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  CONSTRAINT journey_milestones_kind_check CHECK (kind IN (
    'admission_outcome',
    'visa_approved',
    'arrival',
    'university_start',
    'first_semester',
    'internship',
    'graduation',
    'first_job'
  )),
  CONSTRAINT journey_milestones_precision_check CHECK (date_precision IN (
    'day', 'month', 'unknown'
  )),
  CONSTRAINT journey_milestones_verification_check CHECK (verification_state IN (
    'self_reported',
    'evidence_submitted',
    'verified',
    'disputed'
  )),
  CONSTRAINT journey_milestones_case_kind_key UNIQUE (case_id, kind)
);

CREATE INDEX IF NOT EXISTS journey_milestones_case_idx
  ON public.journey_milestones (case_id, kind);

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS selected_milestone_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.roadmap_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.journey_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_milestones FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.roadmap_revisions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.journey_milestones
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION commands.get_case_roadmap(p_case uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  counseling_done boolean := false;
  has_target boolean := false;
  revision public.roadmap_revisions%ROWTYPE;
  dest_program uuid;
  dest_university uuid;
  official_url text;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'journey.read')
     AND NOT commands.has_case_scope(p_case, actor, 'task.read') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.case_id = p_case AND b.kind = 'counseling' AND b.session_state = 'completed'
  ) INTO counseling_done;

  SELECT EXISTS (
    SELECT 1 FROM public.saved_program_pairs s WHERE s.case_id = p_case
  ) INTO has_target;

  SELECT s.program_id, s.university_id
  INTO dest_program, dest_university
  FROM public.saved_program_pairs s
  WHERE s.case_id = p_case
  ORDER BY s.slot
  LIMIT 1;

  SELECT r.* INTO revision
  FROM public.roadmap_revisions r
  WHERE r.case_id = p_case AND r.superseded_at IS NULL
  ORDER BY r.confirmed_at DESC
  LIMIT 1;

  IF revision.program_id IS NOT NULL THEN
    dest_program := revision.program_id;
    dest_university := revision.university_id;
  END IF;

  SELECT l.application_url INTO official_url
  FROM public.program_action_links l
  WHERE l.program_id = dest_program;

  RETURN jsonb_build_object(
    'unlocked', counseling_done AND has_target,
    'lockReason', CASE
      WHEN counseling_done AND has_target THEN NULL
      ELSE 'Application actions unlock after completed counseling and an explicit target selection.'
    END,
    'counselingCompleted', counseling_done,
    'hasSelectedTarget', has_target,
    'target', CASE
      WHEN dest_program IS NULL THEN NULL
      ELSE jsonb_build_object(
        'programId', dest_program,
        'universityId', dest_university,
        'officialUrl', official_url,
        'revisionId', revision.id,
        'confirmedAt', revision.confirmed_at
      )
    END,
    'savedTargets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'programId', s.program_id,
        'universityId', s.university_id,
        'slot', s.slot,
        'programName', p.name,
        'universityName', u.name
      ) ORDER BY s.slot)
      FROM public.saved_program_pairs s
      JOIN public.programs p ON p.id = s.program_id
      JOIN public.universities u ON u.id = s.university_id
      WHERE s.case_id = p_case
    ), '[]'::jsonb),
    'tasks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'description', t.description,
        'status', t.status,
        'ownerRole', t.owner_role,
        'dueAt', t.due_at,
        'sourceKey', t.source_key,
        'programId', t.program_id,
        'evidenceId', t.evidence_id
      ) ORDER BY t.created_at)
      FROM public.tasks t
      WHERE t.case_id = p_case
        AND t.source_key IS NOT NULL
        AND t.status <> 'cancelled'
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.confirm_roadmap_target(
  p_case uuid,
  p_program uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  pair public.saved_program_pairs%ROWTYPE;
  counseling_done boolean := false;
  system_row public.application_systems%ROWTYPE;
  criteria_rev integer := 1;
  revision_id uuid;
  task jsonb;
  derived jsonb := '[]'::jsonb;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'task.write')
     AND NOT commands.has_case_scope(p_case, actor, 'journey.read') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.case_id = p_case AND b.kind = 'counseling' AND b.session_state = 'completed'
  ) INTO counseling_done;
  IF NOT counseling_done THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO pair
  FROM public.saved_program_pairs
  WHERE case_id = p_case AND program_id = p_program;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT s.* INTO system_row
  FROM public.applications a
  JOIN public.application_groups g ON g.id = a.group_id
  JOIN public.application_systems s ON s.id = g.system_id
  WHERE g.case_id = p_case AND a.program_id = p_program
  ORDER BY a.created_at DESC
  LIMIT 1;

  SELECT COALESCE(max(e.revision), 1) INTO criteria_rev
  FROM public.entry_criteria e
  WHERE e.program_id = p_program;

  UPDATE public.roadmap_revisions
  SET superseded_at = now()
  WHERE case_id = p_case AND superseded_at IS NULL;

  INSERT INTO public.roadmap_revisions (
    case_id, program_id, university_id, system_id, criteria_revision, created_by
  ) VALUES (
    p_case, pair.program_id, pair.university_id, system_row.id, criteria_rev, actor
  )
  RETURNING id INTO revision_id;

  IF system_row.code = 'ucas' THEN
    derived := derived || jsonb_build_array(jsonb_build_object(
      'sourceKey', 'essay:one_statement:ucas',
      'title', 'UCAS personal statement',
      'ownerRole', 'Student',
      'description', 'One statement covers every course choice in this system.'
    ), jsonb_build_object(
      'sourceKey', 'fee:system:ucas',
      'title', 'UCAS system fee',
      'ownerRole', 'Student',
      'description', 'Pay the system fee once. Do not charge it again per university.'
    ));
  ELSIF system_row.code = 'common_app' THEN
    derived := derived || jsonb_build_array(jsonb_build_object(
      'sourceKey', 'essay:shared_core:common_app',
      'title', 'Common App shared essay',
      'ownerRole', 'Student',
      'description', 'Shared core essay. Supplements are listed separately.'
    ), jsonb_build_object(
      'sourceKey', 'essay:supplement:common_app',
      'title', 'Common App supplement',
      'ownerRole', 'Student',
      'description', 'Institution supplement. This is not the shared core essay.'
    ), jsonb_build_object(
      'sourceKey', 'fee:system:common_app',
      'title', 'Common App system fee',
      'ownerRole', 'Student',
      'description', 'Pay the system fee once. Do not charge it again per university.'
    ), jsonb_build_object(
      'sourceKey', 'fee:choice:common_app',
      'title', 'Common App choice fee',
      'ownerRole', 'Student',
      'description', 'Additional choice-scoped fee after included choices.'
    ));
  ELSIF system_row.id IS NOT NULL THEN
    derived := derived || jsonb_build_array(jsonb_build_object(
      'sourceKey', 'system:' || system_row.code,
      'title', system_row.name || ' application steps',
      'ownerRole', 'Student',
      'description', 'Tasks follow the published application-system model.'
    ));
  END IF;

  FOR task IN
    SELECT jsonb_build_object(
      'sourceKey', 'criterion:' || e.criterion_key || ':' || e.revision,
      'title', 'Requirement: ' || replace(e.criterion_key, '_', ' '),
      'ownerRole', CASE
        WHEN e.kind IN ('test', 'language', 'document') THEN 'Student'
        ELSE 'Counselor'
      END,
      'description', CASE
        WHEN e.mandatory THEN 'Mandatory published criterion. Unknown is not a waiver.'
        ELSE 'Weighted published criterion.'
      END
    )
    FROM public.entry_criteria e
    WHERE e.program_id = p_program
      AND e.revision = criteria_rev
  LOOP
    derived := derived || jsonb_build_array(task);
  END LOOP;

  FOR task IN
    SELECT jsonb_build_object(
      'sourceKey', 'document:' || d.purpose || ':' || COALESCE(system_row.code, 'direct'),
      'title', 'Document: ' || replace(d.purpose, '_', ' '),
      'ownerRole', 'Student',
      'description', CASE
        WHEN d.certify_once THEN 'Shared certification. Track once, not once per university.'
        ELSE 'Institution document requirement.'
      END
    )
    FROM public.application_document_requirements d
    WHERE d.required
      AND (d.program_id = p_program OR d.university_id = pair.university_id OR (
        d.program_id IS NULL AND d.university_id IS NULL AND d.system_id = system_row.id
      ))
      AND (
        system_row.id IS NULL
        OR (d.certify_once AND system_row.document_model IN ('system_certification', 'both'))
        OR (NOT d.certify_once AND system_row.document_model IN ('per_institution', 'both'))
      )
  LOOP
    derived := derived || jsonb_build_array(task);
  END LOOP;

  FOR task IN
    SELECT jsonb_build_object(
      'sourceKey', 'deadline:' || dl.scope || ':' || dl.kind || ':' || COALESCE(system_row.code, 'direct'),
      'title', COALESCE(system_row.name, 'Application') || ' ' || dl.scope || ' deadline',
      'ownerRole', 'Student',
      'description', CASE
        WHEN dl.deadline_precision = 'unknown' THEN 'Deadline is not specified. A last day is not invented.'
        ELSE dl.kind || ' deadline.'
      END,
      'dueAt', CASE WHEN dl.deadline_precision = 'day' THEN dl.deadline_date::timestamptz ELSE NULL END
    )
    FROM public.application_deadlines dl
    WHERE dl.system_id = system_row.id
      AND (
        dl.scope = 'system'
        OR dl.university_id = pair.university_id
        OR dl.program_id = p_program
      )
      AND (
        (dl.scope = 'system' AND system_row.deadline_model IN ('system', 'both'))
        OR (dl.scope IN ('institution', 'program') AND system_row.deadline_model IN ('institution', 'both'))
      )
  LOOP
    derived := derived || jsonb_build_array(task);
  END LOOP;

  derived := derived || jsonb_build_array(jsonb_build_object(
    'sourceKey', 'counselor:review',
    'title', 'Counselor review of the target',
    'ownerRole', 'Counselor',
    'description', 'Counselor action on the confirmed target. This is not an official submission.'
  ));

  FOR task IN SELECT value FROM jsonb_array_elements(derived) AS value
  LOOP
    INSERT INTO public.tasks (
      case_id, program_id, owner_role, created_by, title, description, status, source_key, due_at
    ) VALUES (
      p_case,
      p_program,
      COALESCE(task->>'ownerRole', 'Student'),
      actor,
      task->>'title',
      task->>'description',
      'open',
      task->>'sourceKey',
      NULLIF(task->>'dueAt', '')::timestamptz
    )
    ON CONFLICT (case_id, source_key) WHERE source_key IS NOT NULL DO NOTHING;
  END LOOP;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'confirm_roadmap_target',
    'roadmap_revisions',
    revision_id,
    commands.request_id(),
    jsonb_build_object('programId', p_program, 'system', system_row.code)
  );

  RETURN commands.get_case_roadmap(p_case) || jsonb_build_object('revisionId', revision_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_journey_milestones(p_case uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'journey.read')
     AND NOT commands.has_case_scope(p_case, actor, 'report.read') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'kind', m.kind,
        'occurredOn', m.occurred_on,
        'datePrecision', m.date_precision,
        'details', m.details,
        'selfReported', m.self_reported,
        'verificationState', m.verification_state,
        'exceptionNote', m.exception_note,
        'evidenceId', m.evidence_id,
        'updatedAt', m.updated_at
      ) ORDER BY m.occurred_on NULLS LAST, m.kind)
      FROM public.journey_milestones m
      WHERE m.case_id = p_case
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_journey_milestone(
  p_case uuid,
  p_kind text,
  p_occurred_on date,
  p_details jsonb,
  p_exception_note text,
  p_evidence uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row_id uuid;
  verification text := 'self_reported';
BEGIN
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'journey.read') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN (
    'admission_outcome', 'visa_approved', 'arrival', 'university_start',
    'first_semester', 'internship', 'graduation', 'first_job'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_occurred_on IS NOT NULL AND p_occurred_on > CURRENT_DATE THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_evidence IS NOT NULL THEN
    verification := 'evidence_submitted';
  END IF;

  INSERT INTO public.journey_milestones (
    case_id, kind, occurred_on, details, exception_note, evidence_id,
    self_reported, verification_state, author_id
  ) VALUES (
    p_case, p_kind, p_occurred_on, COALESCE(p_details, '{}'::jsonb),
    nullif(p_exception_note, ''), p_evidence, true, verification, actor
  )
  ON CONFLICT (case_id, kind) DO UPDATE
    SET occurred_on = EXCLUDED.occurred_on,
        details = EXCLUDED.details,
        exception_note = EXCLUDED.exception_note,
        evidence_id = EXCLUDED.evidence_id,
        verification_state = CASE
          WHEN EXCLUDED.evidence_id IS NOT NULL THEN 'evidence_submitted'
          ELSE journey_milestones.verification_state
        END,
        version = journey_milestones.version + 1,
        updated_at = now()
  RETURNING id INTO row_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'upsert_journey_milestone',
    'journey_milestones',
    row_id,
    commands.request_id(),
    jsonb_build_object('kind', p_kind, 'selfReported', true)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'journey_milestones', row_id, 1, 'journey_milestone_saved',
    jsonb_build_object('id', row_id, 'kind', p_kind, 'notifyMentor', false)
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('id', row_id, 'kind', p_kind, 'verificationState', verification);
END;
$$;

CREATE OR REPLACE FUNCTION commands.attach_story_milestones(
  p_story uuid,
  p_milestone_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_learning_member();
  UPDATE public.content_items
  SET selected_milestone_ids = COALESCE(p_milestone_ids, '{}'),
      version = version + 1,
      updated_at = now()
  WHERE id = p_story
    AND kind IN ('story', 'spotlight')
    AND (subject_account_id = actor OR created_by = actor);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN jsonb_build_object('id', p_story, 'selected', COALESCE(p_milestone_ids, '{}'));
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commands
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
