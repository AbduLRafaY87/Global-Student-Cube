-- Counseling case loop without AI: assignments, advisories, feedback, tasks.
-- Manual authoring works with recording/AI off. Writes through commands.

CREATE OR REPLACE FUNCTION public.is_file_purpose(p_purpose text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_purpose IN (
    'transcript', 'passport', 'recommendation_letter', 'statement_of_purpose',
    'financial_proof', 'photo', 'visa_form', 'medical', 'insurance', 'offer_letter',
    'portfolio', 'resume', 'profile_image', 'introduction_media', 'advisory_pdf',
    'other', 'apply_personal_statement', 'apply_supplement', 'apply_reference',
    'apply_certified_transcript', 'apply_vpd', 'apply_school_report',
    'apply_system_certification', 'test_result', 'award_evidence', 'task_evidence'
  )
$$;

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  counselor_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  state text NOT NULL,
  handoff_report_id uuid,
  CONSTRAINT assignments_state_check CHECK (state IN (
    'recommended', 'active', 'change_requested', 'handoff_pending', 'reassigned', 'closed'
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS assignments_one_active_idx
  ON public.assignments (case_id)
  WHERE state IN ('active', 'change_requested', 'handoff_pending');

CREATE INDEX IF NOT EXISTS assignments_counselor_state_idx
  ON public.assignments (counselor_id, state);

CREATE TABLE IF NOT EXISTS public.safety_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reporter_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  subject_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  case_id uuid REFERENCES public.cases (id) ON DELETE RESTRICT,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'open',
  CONSTRAINT safety_reports_state_check CHECK (state IN ('open', 'reviewing', 'closed'))
);

CREATE TABLE IF NOT EXISTS public.change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  assignment_id uuid NOT NULL REFERENCES public.assignments (id) ON DELETE RESTRICT,
  requester_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  reason_category text NOT NULL,
  detail text NOT NULL,
  improvement_summary text,
  safety_report_id uuid REFERENCES public.safety_reports (id) ON DELETE RESTRICT,
  status text NOT NULL,
  CONSTRAINT change_requests_category_check CHECK (reason_category IN (
    'Service fit', 'Scheduling', 'Communication', 'Other', 'Safety'
  )),
  CONSTRAINT change_requests_detail_check CHECK (char_length(trim(detail)) BETWEEN 2 AND 2000),
  CONSTRAINT change_requests_status_check CHECK (status IN (
    'pending', 'handoff_pending', 'declined', 'reassigned'
  ))
);

CREATE TABLE IF NOT EXISTS public.advisory_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  status text NOT NULL,
  shareable_body jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_file_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  approved_at timestamptz,
  superseded_by uuid REFERENCES public.advisory_reports (id) ON DELETE RESTRICT,
  quality_flagged boolean NOT NULL DEFAULT false,
  CONSTRAINT advisory_reports_booking_revision_key UNIQUE (booking_id, revision),
  CONSTRAINT advisory_reports_status_check CHECK (status IN (
    'awaiting_summary',
    'draft',
    'counselor_review',
    'admin_review',
    'changes_requested',
    'approved',
    'delivered',
    'withdrawn'
  ))
);

CREATE TABLE IF NOT EXISTS public.private_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  booking_id uuid REFERENCES public.bookings (id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  body_cipher bytea NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  report_id uuid REFERENCES public.advisory_reports (id) ON DELETE RESTRICT,
  booking_id uuid REFERENCES public.bookings (id) ON DELETE RESTRICT,
  program_id uuid,
  owner_role text NOT NULL,
  owner_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  status text NOT NULL,
  due_at timestamptz,
  estimated_delivery_at timestamptz,
  evidence_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  evidence_notified_at timestamptz,
  reviewed_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  completion_note text,
  CONSTRAINT tasks_owner_role_check CHECK (owner_role IN ('Student', 'Parent', 'Counselor')),
  CONSTRAINT tasks_status_check CHECK (status IN (
    'open', 'in_progress', 'submitted', 'changes_requested', 'completed', 'cancelled'
  )),
  CONSTRAINT tasks_description_check CHECK (description IS NULL OR char_length(description) <= 2000)
);

CREATE INDEX IF NOT EXISTS tasks_case_status_due_idx
  ON public.tasks (case_id, status, due_at);

CREATE TABLE IF NOT EXISTS public.task_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE RESTRICT,
  previous_due_at timestamptz,
  next_due_at timestamptz NOT NULL,
  reason text NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  direction text NOT NULL,
  questionnaire_version text NOT NULL DEFAULT 'ses-10-v1',
  answers jsonb NOT NULL,
  comment text,
  overall numeric(3, 2),
  publication_state text NOT NULL,
  CONSTRAINT feedback_responses_once UNIQUE (booking_id, author_id, direction),
  CONSTRAINT feedback_responses_direction_check CHECK (direction IN (
    'student_to_counselor', 'counselor_to_student'
  )),
  CONSTRAINT feedback_responses_state_check CHECK (publication_state IN (
    'draft', 'submitted', 'published_aggregate_eligible', 'held', 'eligible', 'excluded'
  )),
  CONSTRAINT feedback_responses_comment_check CHECK (comment IS NULL OR char_length(comment) <= 2000)
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.advisory_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisory_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.private_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.task_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_extensions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.assignments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.change_requests FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.safety_reports FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.advisory_reports FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.private_notes FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.tasks FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.task_extensions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.feedback_responses FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION commands.has_case_scope(
  p_case uuid,
  p_account uuid,
  p_scope text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.case_grants g
    WHERE g.case_id = p_case
      AND g.account_id = p_account
      AND g.scope = p_scope
      AND g.revoked_at IS NULL
      AND (g.expires_at IS NULL OR g.expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION commands.active_assignment(p_case uuid)
RETURNS public.assignments
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT a.*
  FROM public.assignments a
  WHERE a.case_id = p_case
    AND a.state IN ('active', 'change_requested', 'handoff_pending')
  ORDER BY a.started_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION commands.sync_assignment_grants(p_assignment uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  row public.assignments%ROWTYPE;
  scope text;
BEGIN
  SELECT * INTO row FROM public.assignments WHERE id = p_assignment;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF row.state = 'active' THEN
    FOREACH scope IN ARRAY ARRAY[
      'profile.read', 'finance.read', 'shortlist.read',
      'booking.manage', 'report.read', 'task.read', 'task.write'
    ]
    LOOP
      INSERT INTO public.case_grants (case_id, account_id, scope, assignment_id)
      VALUES (row.case_id, row.counselor_id, scope, row.id)
      ON CONFLICT (case_id, account_id, scope) DO UPDATE
        SET revoked_at = NULL,
            assignment_id = row.id;
    END LOOP;
  ELSE
    UPDATE public.case_grants
    SET revoked_at = now()
    WHERE assignment_id = row.id
      AND revoked_at IS NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION commands.ensure_advisory(p_booking uuid)
RETURNS public.advisory_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  booking public.bookings%ROWTYPE;
  report public.advisory_reports%ROWTYPE;
  actor uuid;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND OR booking.case_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF booking.host_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO report
  FROM public.advisory_reports
  WHERE booking_id = p_booking
    AND status <> 'withdrawn'
  ORDER BY revision DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN report;
  END IF;

  INSERT INTO public.advisory_reports (
    case_id, booking_id, author_id, revision, status, shareable_body
  ) VALUES (
    booking.case_id, p_booking, actor, 1, 'awaiting_summary', '{}'::jsonb
  )
  RETURNING * INTO report;
  RETURN report;
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_advisory_draft(
  p_booking uuid,
  p_body jsonb,
  p_private_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  report public.advisory_reports%ROWTYPE;
  notes text := coalesce(p_private_notes, '');
BEGIN
  actor := commands.actor_id();
  report := commands.ensure_advisory(p_booking);
  IF report.status NOT IN ('awaiting_summary', 'draft', 'changes_requested', 'counselor_review') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF char_length(notes) > 4000 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_body ? 'privateNotes' OR p_body ? 'aiCoaching' OR p_body ? 'transcript' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.advisory_reports
  SET shareable_body = p_body,
      status = CASE WHEN status = 'awaiting_summary' THEN 'draft' ELSE status END,
      version = version + 1,
      updated_at = now()
  WHERE id = report.id;

  IF notes <> '' THEN
    INSERT INTO public.private_notes (case_id, booking_id, author_id, body_cipher)
    VALUES (report.case_id, p_booking, actor, convert_to(notes, 'utf8'));
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'advisory_draft_saved',
    'advisory_reports',
    report.id,
    commands.request_id(),
    jsonb_build_object('status', 'draft')
  );

  RETURN commands.counselor_advisory(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.transition_advisory(
  p_booking uuid,
  p_event text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  report public.advisory_reports%ROWTYPE;
  next_status text;
BEGIN
  actor := commands.actor_id();
  report := commands.ensure_advisory(p_booking);

  next_status := CASE
    WHEN p_event = 'submit_review' AND report.status = 'draft' THEN 'counselor_review'
    WHEN p_event = 'flag_quality' AND report.status = 'counselor_review' THEN 'admin_review'
    WHEN p_event = 'request_changes' AND report.status = 'admin_review' THEN 'changes_requested'
    WHEN p_event = 'approve' AND report.status = 'counselor_review' AND NOT report.quality_flagged THEN 'approved'
    WHEN p_event = 'approve' AND report.status = 'admin_review' THEN 'approved'
    WHEN p_event = 'deliver' AND report.status = 'approved' THEN 'delivered'
    ELSE NULL
  END;

  IF next_status IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_event = 'approve' AND report.author_id <> actor AND report.status = 'counselor_review' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_event IN ('flag_quality', 'request_changes') THEN
    PERFORM commands.require_admin_scope('case_oversight');
  END IF;

  UPDATE public.advisory_reports
  SET status = next_status,
      approved_by = CASE WHEN next_status = 'approved' THEN actor ELSE approved_by END,
      approved_at = CASE WHEN next_status = 'approved' THEN now() ELSE approved_at END,
      version = version + 1,
      updated_at = now()
  WHERE id = report.id;

  IF next_status IN ('approved', 'delivered') THEN
    INSERT INTO public.outbox_events (
      aggregate_type, aggregate_id, aggregate_version, event_type, payload
    ) VALUES (
      'advisory_reports',
      report.id,
      report.version + 1,
      'advisory_' || next_status,
      jsonb_build_object('booking_id', p_booking, 'case_id', report.case_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'advisory_' || p_event,
    'advisory_reports',
    report.id,
    commands.request_id(),
    jsonb_build_object('from', report.status, 'to', next_status)
  );

  RETURN commands.counselor_advisory(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.supersede_advisory(p_booking uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  current public.advisory_reports%ROWTYPE;
  created public.advisory_reports%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO current
  FROM public.advisory_reports
  WHERE booking_id = p_booking AND status IN ('approved', 'delivered')
  ORDER BY revision DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF current.author_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.advisory_reports (
    case_id, booking_id, author_id, revision, status, shareable_body
  ) VALUES (
    current.case_id, p_booking, actor, current.revision + 1, 'draft', current.shareable_body
  )
  RETURNING * INTO created;

  UPDATE public.advisory_reports
  SET status = 'withdrawn',
      superseded_by = created.id,
      version = version + 1,
      updated_at = now()
  WHERE id = current.id;

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'advisory_reports',
    current.id,
    current.version + 1,
    'advisory_superseded',
    jsonb_build_object('booking_id', p_booking, 'superseded_by', created.id)
  )
  ON CONFLICT DO NOTHING;

  RETURN commands.counselor_advisory(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.counselor_advisory(p_booking uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  booking public.bookings%ROWTYPE;
  report public.advisory_reports%ROWTYPE;
  notes text;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF booking.host_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  report := commands.ensure_advisory(p_booking);
  SELECT convert_from(n.body_cipher, 'utf8')
    INTO notes
  FROM public.private_notes n
  WHERE n.booking_id = p_booking AND n.author_id = actor
  ORDER BY n.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'id', report.id,
    'bookingId', report.booking_id,
    'caseId', report.case_id,
    'revision', report.revision,
    'status', report.status,
    'shareableBody', report.shareable_body,
    'privateNotes', notes,
    'qualityFlagged', report.quality_flagged,
    'approvedAt', report.approved_at,
    'sessionState', booking.session_state,
    'attendanceOutcome', booking.attendance_outcome,
    'completedAt', booking.actual_ended_at,
    'dueAt', COALESCE(booking.actual_ended_at, booking.ends_at) + interval '24 hours',
    'escalateAt', COALESCE(booking.actual_ended_at, booking.ends_at) + interval '48 hours'
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.student_advisory(p_booking uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  booking public.bookings%ROWTYPE;
  report public.advisory_reports%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF booking.case_id IS NULL
     OR NOT commands.has_case_scope(booking.case_id, actor, 'report.read')
  THEN
    IF booking.host_id <> actor THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  SELECT * INTO report
  FROM public.advisory_reports
  WHERE booking_id = p_booking
    AND status IN ('approved', 'delivered')
  ORDER BY revision DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'counselor_review',
      'label', 'Counselor reviewing',
      'shareableBody', NULL,
      'privateNotes', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'id', report.id,
    'revision', report.revision,
    'status', report.status,
    'approvedAt', report.approved_at,
    'authorId', report.author_id,
    'shareableBody', report.shareable_body,
    'disclaimer', 'This guidance is indicative, not an admission or visa guarantee.',
    'privateNotes', NULL,
    'aiCoaching', NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.submit_feedback(
  p_booking uuid,
  p_direction text,
  p_answers jsonb,
  p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  booking public.bookings%ROWTYPE;
  required text[];
  field text;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF booking.session_state <> 'completed' OR booking.attendance_outcome IS NOT NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_direction = 'student_to_counselor' THEN
    required := ARRAY['clarity', 'helpfulness', 'knowledge', 'relevance', 'overall'];
  ELSIF p_direction = 'counselor_to_student' THEN
    required := ARRAY['preparation', 'document_readiness', 'engagement', 'goal_clarity'];
    IF booking.host_id <> actor THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  ELSE
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  FOREACH field IN ARRAY required LOOP
    IF coalesce((p_answers ->> field)::int, 0) NOT BETWEEN 1 AND 5 THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END LOOP;
  IF p_comment IS NOT NULL AND char_length(p_comment) > 2000 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.feedback_responses (
    booking_id, author_id, direction, answers, comment, overall, publication_state
  ) VALUES (
    p_booking,
    actor,
    p_direction,
    p_answers,
    nullif(p_comment, ''),
    CASE WHEN p_direction = 'student_to_counselor' THEN (p_answers ->> 'overall')::numeric ELSE NULL END,
    'submitted'
  );

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'feedback_submitted',
    'bookings',
    p_booking,
    commands.request_id(),
    jsonb_build_object('direction', p_direction)
  );

  RETURN jsonb_build_object('status', 'submitted', 'bookingId', p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.request_counselor_change(
  p_case uuid,
  p_category text,
  p_detail text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  assignment public.assignments%ROWTYPE;
  existing public.change_requests%ROWTYPE;
  safety uuid;
  req uuid;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'booking.manage')
     AND NOT EXISTS (
       SELECT 1 FROM public.cases c
       WHERE c.id = p_case AND (c.student_account_id = actor OR c.operating_guardian_id = actor)
     )
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_category NOT IN ('Service fit', 'Scheduling', 'Communication', 'Other', 'Safety') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF char_length(trim(p_detail)) NOT BETWEEN 2 AND 2000 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO assignment FROM commands.active_assignment(p_case);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.case_id = p_case
      AND b.session_state IN ('waiting', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO existing
  FROM public.change_requests
  WHERE assignment_id = assignment.id AND status IN ('pending', 'handoff_pending')
  ORDER BY created_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', existing.id,
      'status', existing.status,
      'duplicate', true
    );
  END IF;

  IF p_category = 'Safety' THEN
    INSERT INTO public.safety_reports (reporter_id, subject_id, case_id, evidence, state)
    VALUES (
      actor,
      assignment.counselor_id,
      p_case,
      jsonb_build_object('detail', 'protected'),
      'open'
    )
    RETURNING id INTO safety;
  END IF;

  INSERT INTO public.change_requests (
    case_id, assignment_id, requester_id, reason_category, detail,
    improvement_summary, safety_report_id, status
  ) VALUES (
    p_case,
    assignment.id,
    actor,
    p_category,
    trim(p_detail),
    CASE WHEN p_category = 'Safety' THEN NULL ELSE trim(p_detail) END,
    safety,
    'pending'
  )
  RETURNING id INTO req;

  UPDATE public.assignments
  SET state = 'change_requested', version = version + 1, updated_at = now()
  WHERE id = assignment.id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'counselor_change_requested',
    'assignments',
    assignment.id,
    CASE WHEN p_category = 'Safety' THEN NULL ELSE p_category END,
    commands.request_id(),
    jsonb_build_object('category', p_category, 'safety', safety IS NOT NULL)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'assignments',
    assignment.id,
    assignment.version + 1,
    'counselor_change_requested',
    jsonb_build_object('case_id', p_case, 'category', p_category)
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('id', req, 'status', 'pending', 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION commands.reassign_counselor(
  p_assignment uuid,
  p_next_counselor uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  current public.assignments%ROWTYPE;
  created public.assignments%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('case_oversight');
  SELECT * INTO current FROM public.assignments WHERE id = p_assignment FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF current.state NOT IN ('change_requested', 'handoff_pending') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.case_id = current.case_id
      AND b.session_state IN ('waiting', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.assignments
  SET state = 'reassigned',
      ended_at = now(),
      version = version + 1,
      updated_at = now()
  WHERE id = current.id;
  PERFORM commands.sync_assignment_grants(current.id);

  INSERT INTO public.assignments (case_id, counselor_id, state)
  VALUES (current.case_id, p_next_counselor, 'active')
  RETURNING * INTO created;
  PERFORM commands.sync_assignment_grants(created.id);

  UPDATE public.change_requests
  SET status = 'reassigned'
  WHERE assignment_id = current.id AND status IN ('pending', 'handoff_pending');

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'counselor_reassigned',
    'assignments',
    created.id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('from', current.counselor_id, 'to', p_next_counselor)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'assignments',
    created.id,
    1,
    'counselor_reassigned',
    jsonb_build_object('case_id', current.case_id, 'previous', current.counselor_id)
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'previousId', current.id,
    'nextId', created.id,
    'state', 'reassigned'
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_followup_task(
  p_case uuid,
  p_title text,
  p_owner_role text,
  p_description text,
  p_due_at timestamptz,
  p_booking uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  created public.tasks%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'task.write') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_owner_role NOT IN ('Student', 'Parent', 'Counselor') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF length(trim(p_title)) < 2 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.tasks (
    case_id, booking_id, owner_role, created_by, title, description, status, due_at
  ) VALUES (
    p_case, p_booking, p_owner_role, actor, trim(p_title), nullif(p_description, ''),
    'open', p_due_at
  )
  RETURNING * INTO created;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'task_created',
    'tasks',
    created.id,
    commands.request_id(),
    jsonb_build_object('ownerRole', p_owner_role)
  );

  RETURN jsonb_build_object('id', created.id, 'status', created.status);
END;
$$;

CREATE OR REPLACE FUNCTION commands.transition_task(
  p_task uuid,
  p_event text,
  p_note text,
  p_evidence uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.tasks%ROWTYPE;
  next_status text;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.tasks WHERE id = p_task FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF NOT commands.has_case_scope(row.case_id, actor, 'task.write')
     AND NOT commands.has_case_scope(row.case_id, actor, 'task.read')
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  next_status := CASE
    WHEN p_event = 'start' AND row.status = 'open' THEN 'in_progress'
    WHEN p_event = 'submit' AND row.status IN ('open', 'in_progress', 'changes_requested') THEN 'submitted'
    WHEN p_event = 'request_changes' AND row.status = 'submitted' THEN 'changes_requested'
    WHEN p_event = 'complete' AND row.status = 'submitted' THEN 'completed'
    WHEN p_event = 'cancel' AND row.status <> 'completed' THEN 'cancelled'
    ELSE NULL
  END;
  IF next_status IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_event IN ('complete', 'request_changes', 'cancel')
     AND NOT commands.has_case_scope(row.case_id, actor, 'task.write')
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.tasks
  SET status = next_status,
      evidence_id = COALESCE(p_evidence, evidence_id),
      evidence_notified_at = CASE
        WHEN p_event = 'submit' AND evidence_notified_at IS NULL THEN now()
        ELSE evidence_notified_at
      END,
      completion_note = COALESCE(nullif(p_note, ''), completion_note),
      reviewed_by = CASE WHEN p_event = 'complete' THEN actor ELSE reviewed_by END,
      version = version + 1,
      updated_at = now()
  WHERE id = p_task;

  IF p_event = 'submit' AND row.evidence_notified_at IS NULL THEN
    INSERT INTO public.outbox_events (
      aggregate_type, aggregate_id, aggregate_version, event_type, payload
    ) VALUES (
      'tasks',
      p_task,
      row.version + 1,
      'task_evidence_submitted',
      jsonb_build_object('case_id', row.case_id, 'task_id', p_task)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF next_status = 'completed' THEN
    INSERT INTO public.outbox_events (
      aggregate_type, aggregate_id, aggregate_version, event_type, payload
    ) VALUES (
      'tasks',
      p_task,
      row.version + 1,
      'task_completed_cancel_reminders',
      jsonb_build_object('task_id', p_task)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('id', p_task, 'status', next_status);
END;
$$;

CREATE OR REPLACE FUNCTION commands.extend_task(
  p_task uuid,
  p_next_due timestamptz,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.tasks%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.tasks WHERE id = p_task FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF NOT commands.has_case_scope(row.case_id, actor, 'task.write') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF length(trim(p_reason)) < 2 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.task_extensions (task_id, previous_due_at, next_due_at, reason, actor_id)
  VALUES (p_task, row.due_at, p_next_due, trim(p_reason), actor);

  UPDATE public.tasks
  SET due_at = p_next_due,
      estimated_delivery_at = p_next_due,
      version = version + 1,
      updated_at = now()
  WHERE id = p_task;

  RETURN jsonb_build_object(
    'id', p_task,
    'previousDueAt', row.due_at,
    'nextDueAt', p_next_due
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.case_tasks(p_case uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'task.read') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN jsonb_build_object(
    'caseId', p_case,
    'counts', jsonb_build_object(
      'open', (SELECT count(*) FROM public.tasks WHERE case_id = p_case AND status IN ('open', 'in_progress', 'changes_requested')),
      'overdue', (SELECT count(*) FROM public.tasks WHERE case_id = p_case AND due_at IS NOT NULL AND due_at < now() AND status NOT IN ('completed', 'cancelled')),
      'completed', (SELECT count(*) FROM public.tasks WHERE case_id = p_case AND status = 'completed')
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'description', t.description,
        'ownerRole', t.owner_role,
        'status', t.status,
        'dueAt', t.due_at,
        'awaitingDate', t.due_at IS NULL,
        'evidenceId', t.evidence_id,
        'extensions', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'previousDueAt', e.previous_due_at,
            'nextDueAt', e.next_due_at,
            'reason', e.reason
          ) ORDER BY e.created_at)
          FROM public.task_extensions e
          WHERE e.task_id = t.id
        ), '[]'::jsonb)
      ) ORDER BY t.created_at)
      FROM public.tasks t
      WHERE t.case_id = p_case
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.counselor_home()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  IF NOT EXISTS (
    SELECT 1 FROM public.account_roles r
    WHERE r.account_id = actor AND r.role = 'counselor' AND r.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN jsonb_build_object(
    'activeCases', (
      SELECT count(*) FROM public.assignments a
      WHERE a.counselor_id = actor AND a.state = 'active'
    ),
    'overdueTasks', (
      SELECT count(*) FROM public.tasks t
      JOIN public.assignments a ON a.case_id = t.case_id AND a.counselor_id = actor AND a.state = 'active'
      WHERE t.due_at IS NOT NULL AND t.due_at < now() AND t.status NOT IN ('completed', 'cancelled')
    ),
    'reportsDue', (
      SELECT count(*) FROM public.bookings b
      WHERE b.host_id = actor
        AND b.session_state = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM public.advisory_reports r
          WHERE r.booking_id = b.id AND r.status IN ('approved', 'delivered')
        )
        AND now() >= COALESCE(b.actual_ended_at, b.ends_at) + interval '24 hours'
    ),
    'feedbackDue', (
      SELECT count(*) FROM public.bookings b
      WHERE b.host_id = actor
        AND b.session_state = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM public.feedback_responses f
          WHERE f.booking_id = b.id AND f.author_id = actor
        )
    ),
    'nextAppointment', (
      SELECT jsonb_build_object(
        'id', b.id,
        'startsAt', b.starts_at,
        'caseId', b.case_id
      )
      FROM public.bookings b
      WHERE b.host_id = actor
        AND b.status = 'confirmed'
        AND b.starts_at > now()
      ORDER BY b.starts_at
      LIMIT 1
    ),
    'followUps', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'caseId', c.id,
        'gscId', a.gsc_id,
        'studentName', c.student_name
      ))
      FROM public.assignments asg
      JOIN public.cases c ON c.id = asg.case_id
      JOIN public.accounts a ON a.id = c.student_account_id
      WHERE asg.counselor_id = actor AND asg.state = 'active'
    ), '[]'::jsonb),
    'calendarStatus', 'disconnected'
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.counselor_caseload(p_case uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  assignment public.assignments%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  IF p_case IS NULL THEN
    RETURN jsonb_build_object(
      'cases', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'caseId', c.id,
          'gscId', acc.gsc_id,
          'studentName', c.student_name,
          'state', asg.state
        ) ORDER BY c.updated_at DESC)
        FROM public.assignments asg
        JOIN public.cases c ON c.id = asg.case_id
        LEFT JOIN public.accounts acc ON acc.id = c.student_account_id
        WHERE asg.counselor_id = actor AND asg.state = 'active'
      ), '[]'::jsonb)
    );
  END IF;

  IF NOT commands.has_case_scope(p_case, actor, 'profile.read') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO assignment FROM commands.active_assignment(p_case);
  IF NOT FOUND OR assignment.counselor_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN jsonb_build_object(
    'caseId', p_case,
    'assignmentId', assignment.id,
    'sessions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', b.id,
        'startsAt', b.starts_at,
        'sessionState', b.session_state,
        'advisoryStatus', (
          SELECT r.status FROM public.advisory_reports r
          WHERE r.booking_id = b.id
          ORDER BY r.revision DESC LIMIT 1
        )
      ) ORDER BY b.starts_at DESC)
      FROM public.bookings b
      WHERE b.case_id = p_case
    ), '[]'::jsonb),
    'tasks', (commands.case_tasks(p_case) -> 'items')
  );
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION public.is_file_purpose(text) TO authenticated, gsc_api_executor;

