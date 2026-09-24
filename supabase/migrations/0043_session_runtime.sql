-- SES-06/07/08 session runtime: bookings, rooms, attendance, recording consent.
-- Recording defaults OFF. Tokens are never stored. Writes go through commands.

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  case_id uuid REFERENCES public.cases (id) ON DELETE RESTRICT,
  mentee_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  host_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  assignment_id uuid,
  mentor_request_id uuid,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  busy_range tstzrange,
  host_timezone text NOT NULL,
  student_timezone text,
  topics text[] NOT NULL DEFAULT '{}',
  reminder_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL,
  session_state text NOT NULL DEFAULT 'scheduled',
  attendance_outcome text,
  schedule_version bigint NOT NULL DEFAULT 1 CHECK (schedule_version > 0),
  roster_version bigint NOT NULL DEFAULT 1 CHECK (roster_version > 0),
  late_cancel boolean NOT NULL DEFAULT false,
  link_status text NOT NULL DEFAULT 'preparing',
  reminder_status text,
  conference_url text,
  recording_state text NOT NULL DEFAULT 'not_requested',
  actual_started_at timestamptz,
  actual_ended_at timestamptz,
  CONSTRAINT bookings_kind_check CHECK (kind IN ('counseling', 'mentoring')),
  CONSTRAINT bookings_status_check CHECK (status IN (
    'selected', 'held', 'confirmed', 'expired', 'rescheduled', 'cancelled'
  )),
  CONSTRAINT bookings_session_state_check CHECK (session_state IN (
    'scheduled',
    'waiting',
    'in_progress',
    'ended',
    'completed',
    'interrupted',
    'rebooking_required'
  )),
  CONSTRAINT bookings_attendance_check CHECK (
    attendance_outcome IS NULL OR attendance_outcome IN (
      'provisional_no_show',
      'student_no_show',
      'counselor_no_show',
      'both_no_show',
      'attendance_disputed'
    )
  ),
  CONSTRAINT bookings_link_status_check CHECK (link_status IN (
    'preparing', 'ready', 'calendar_attention', 'none'
  )),
  CONSTRAINT bookings_recording_state_check CHECK (recording_state IN (
    'not_requested',
    'consent_requested',
    'consented',
    'recording',
    'stopped',
    'declined'
  )),
  CONSTRAINT bookings_duration_check CHECK (ends_at = starts_at + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS bookings_host_state_idx
  ON public.bookings (host_id, session_state);
CREATE INDEX IF NOT EXISTS bookings_case_starts_idx
  ON public.bookings (case_id, starts_at);
CREATE INDEX IF NOT EXISTS bookings_starts_idx
  ON public.bookings (starts_at, id);

CREATE TABLE IF NOT EXISTS public.booking_participants (
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  role text NOT NULL,
  invited_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, account_id),
  CONSTRAINT booking_participants_role_check CHECK (role IN (
    'student', 'counselor', 'mentor', 'parent', 'guardian'
  ))
);

CREATE INDEX IF NOT EXISTS booking_participants_account_idx
  ON public.booking_participants (account_id, booking_id);

CREATE TABLE IF NOT EXISTS public.meeting_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  provider text NOT NULL,
  external_id text,
  room_url text,
  state text NOT NULL DEFAULT 'preparing',
  generation integer NOT NULL DEFAULT 1 CHECK (generation > 0),
  expires_at timestamptz,
  CONSTRAINT meeting_rooms_booking_generation_key UNIQUE (booking_id, generation),
  CONSTRAINT meeting_rooms_state_check CHECK (state IN (
    'preparing', 'ready', 'failed', 'expired'
  ))
);

CREATE TABLE IF NOT EXISTS public.attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  participant_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  external_event_id text NOT NULL,
  event_kind text NOT NULL,
  occurred_at timestamptz NOT NULL,
  evidence_type text NOT NULL,
  CONSTRAINT attendance_events_external_key UNIQUE (external_event_id),
  CONSTRAINT attendance_events_evidence_check CHECK (evidence_type IN (
    'provider_verified', 'manual_reviewed'
  ))
);

CREATE INDEX IF NOT EXISTS attendance_events_booking_idx
  ON public.attendance_events (booking_id, occurred_at);

CREATE TABLE IF NOT EXISTS public.recording_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  participant_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  roster_version bigint NOT NULL,
  decision boolean NOT NULL,
  guardian_consent_event_id uuid REFERENCES public.consent_events (id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recording_consents_roster_idx
  ON public.recording_consents (
    booking_id, roster_version, participant_id, occurred_at
  );

CREATE TABLE IF NOT EXISTS public.recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  file_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  roster_version bigint NOT NULL,
  state text NOT NULL,
  started_at timestamptz,
  stopped_at timestamptz,
  delete_after timestamptz,
  CONSTRAINT recordings_state_check CHECK (state IN (
    'not_requested', 'disabled', 'pending', 'stopped', 'expired'
  ))
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_rooms FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recording_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recording_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.bookings FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.booking_participants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.meeting_rooms FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.attendance_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.recording_consents FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.recordings FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION commands.session_participant_role(
  p_booking uuid,
  p_account uuid
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p.role
  FROM public.booking_participants p
  WHERE p.booking_id = p_booking
    AND p.account_id = p_account
    AND p.revoked_at IS NULL
$$;

CREATE OR REPLACE FUNCTION commands.require_session_participant(p_booking uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  IF commands.session_participant_role(p_booking, actor) IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.bookings b
       WHERE b.id = p_booking
         AND (b.host_id = actor OR b.mentee_id = actor)
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.bookings b
       JOIN public.cases c ON c.id = b.case_id
       JOIN public.parent_links l ON l.case_id = c.id
       WHERE b.id = p_booking
         AND l.parent_id = actor
         AND l.kind = 'verified_guardian'
         AND l.status = 'active'
         AND l.revoked_at IS NULL
     )
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN actor;
END;
$$;

CREATE OR REPLACE FUNCTION commands.session_is_minor(p_case uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (c.student_dob + interval '18 years') > now()
      FROM public.cases c
      WHERE c.id = p_case
    ),
    false
  )
$$;

CREATE OR REPLACE FUNCTION commands.session_guardian_consented(
  p_booking uuid,
  p_roster bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recording_consents r
    JOIN public.booking_participants p
      ON p.booking_id = r.booking_id
     AND p.account_id = r.participant_id
    WHERE r.booking_id = p_booking
      AND r.roster_version = p_roster
      AND r.decision = true
      AND p.role IN ('guardian', 'parent')
      AND p.revoked_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION commands.session_workspace(p_booking uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.bookings%ROWTYPE;
  payload jsonb;
BEGIN
  actor := commands.require_session_participant(p_booking);
  SELECT * INTO row FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  payload := jsonb_build_object(
    'id', row.id,
    'caseId', row.case_id,
    'hostId', row.host_id,
    'menteeId', row.mentee_id,
    'kind', row.kind,
    'startsAt', row.starts_at,
    'endsAt', row.ends_at,
    'hostTimezone', row.host_timezone,
    'studentTimezone', row.student_timezone,
    'topics', to_jsonb(row.topics),
    'status', row.status,
    'sessionState', row.session_state,
    'attendanceOutcome', row.attendance_outcome,
    'scheduleVersion', row.schedule_version,
    'rosterVersion', row.roster_version,
    'linkStatus', row.link_status,
    'recordingState', row.recording_state,
    'isMinor', commands.session_is_minor(row.case_id),
    'guardianConsented', commands.session_guardian_consented(row.id, row.roster_version),
    'actorRole', COALESCE(
      commands.session_participant_role(row.id, actor),
      CASE WHEN row.host_id = actor THEN 'counselor' ELSE 'student' END
    ),
    'joinOpensAt', row.starts_at - interval '10 minutes',
    'noShowDueAt', row.starts_at + interval '10 minutes',
    'room', (
      SELECT jsonb_build_object(
        'provider', m.provider,
        'state', m.state,
        'generation', m.generation,
        'roomUrl', CASE WHEN m.state = 'ready' THEN m.room_url ELSE NULL END
      )
      FROM public.meeting_rooms m
      WHERE m.booking_id = row.id
      ORDER BY m.generation DESC
      LIMIT 1
    ),
    'participants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'accountId', p.account_id,
        'role', p.role,
        'acceptedAt', p.accepted_at,
        'consent', COALESCE((
          SELECT CASE WHEN c.decision THEN 'yes' ELSE 'no' END
          FROM public.recording_consents c
          WHERE c.booking_id = row.id
            AND c.participant_id = p.account_id
            AND c.roster_version = row.roster_version
          ORDER BY c.occurred_at DESC
          LIMIT 1
        ), 'pending')
      ) ORDER BY p.role)
      FROM public.booking_participants p
      WHERE p.booking_id = row.id AND p.revoked_at IS NULL
    ), '[]'::jsonb)
  );

  RETURN payload;
END;
$$;

CREATE OR REPLACE FUNCTION commands.record_session_event(
  p_booking uuid,
  p_kind text,
  p_evidence text,
  p_external text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_session_participant(p_booking);
  INSERT INTO public.attendance_events (
    booking_id, participant_id, external_event_id, event_kind, occurred_at, evidence_type
  ) VALUES (
    p_booking,
    actor,
    p_external,
    p_kind,
    clock_timestamp(),
    p_evidence
  )
  ON CONFLICT (external_event_id) DO NOTHING;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION commands.transition_session(
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
  row public.bookings%ROWTYPE;
  next_state text;
BEGIN
  actor := commands.require_session_participant(p_booking);
  SELECT * INTO row FROM public.bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.status <> 'confirmed' AND p_event <> 'interrupt' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  next_state := CASE
    WHEN p_event = 'open_join_window' AND row.session_state = 'scheduled' THEN 'waiting'
    WHEN p_event = 'start_session' AND row.session_state = 'waiting' THEN 'in_progress'
    WHEN p_event = 'end_session' AND row.session_state IN ('waiting', 'in_progress') THEN 'ended'
    WHEN p_event = 'complete_session' AND row.session_state = 'ended' THEN 'completed'
    WHEN p_event = 'interrupt' AND row.session_state IN ('scheduled', 'waiting', 'in_progress') THEN 'interrupted'
    WHEN p_event = 'require_rebooking' AND row.session_state = 'interrupted' THEN 'rebooking_required'
    ELSE NULL
  END;

  IF next_state IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_event = 'end_session'
     AND commands.session_participant_role(p_booking, actor) NOT IN ('counselor', 'mentor')
     AND row.host_id <> actor
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.bookings
  SET session_state = next_state,
      actual_started_at = CASE
        WHEN next_state = 'in_progress' THEN COALESCE(actual_started_at, clock_timestamp())
        ELSE actual_started_at
      END,
      actual_ended_at = CASE
        WHEN next_state = 'ended' THEN clock_timestamp()
        ELSE actual_ended_at
      END,
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'session_' || p_event,
    'bookings',
    p_booking,
    commands.request_id(),
    jsonb_build_object('from', row.session_state, 'to', next_state)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'bookings',
    p_booking,
    row.version + 1,
    'session_' || p_event,
    jsonb_build_object('booking_id', p_booking, 'state', next_state)
  )
  ON CONFLICT DO NOTHING;

  RETURN commands.session_workspace(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_recording_consent(
  p_booking uuid,
  p_decision boolean,
  p_as_guardian boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.bookings%ROWTYPE;
  consent_id uuid;
  next_state text;
  guardian_event uuid;
BEGIN
  actor := commands.require_session_participant(p_booking);
  SELECT * INTO row FROM public.bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF p_as_guardian THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.parent_links l
      WHERE l.case_id = row.case_id
        AND l.parent_id = actor
        AND l.kind = 'verified_guardian'
        AND l.status = 'active'
        AND l.revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  INSERT INTO public.consent_events (
    subject_id, case_id, actor_id, purpose, policy_version, decision, evidence_hash, occurred_at
  ) VALUES (
    actor,
    row.case_id,
    actor,
    'session_recording',
    'ses-08-v1',
    p_decision,
    encode(digest(p_booking::text || actor::text || clock_timestamp()::text, 'sha256'), 'hex'),
    clock_timestamp()
  )
  RETURNING id INTO guardian_event;

  INSERT INTO public.recording_consents (
    booking_id, participant_id, roster_version, decision, guardian_consent_event_id, occurred_at
  ) VALUES (
    p_booking,
    actor,
    row.roster_version,
    p_decision,
    CASE WHEN p_as_guardian THEN guardian_event ELSE NULL END,
    clock_timestamp()
  )
  RETURNING id INTO consent_id;

  IF NOT p_decision THEN
    next_state := CASE
      WHEN row.recording_state IN ('recording', 'consented') THEN 'stopped'
      ELSE 'declined'
    END;
  ELSIF row.recording_state = 'not_requested' THEN
    next_state := 'consent_requested';
  ELSIF commands.session_is_minor(row.case_id)
    AND NOT commands.session_guardian_consented(p_booking, row.roster_version)
    AND NOT p_as_guardian
  THEN
    next_state := 'consent_requested';
  ELSE
    next_state := 'consented';
  END IF;

  UPDATE public.bookings
  SET recording_state = next_state,
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'recording_consent_saved',
    'bookings',
    p_booking,
    commands.request_id(),
    jsonb_build_object('decision', p_decision, 'state', next_state, 'consentId', consent_id)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'bookings',
    p_booking,
    row.version + 1,
    'recording_consent_saved',
    jsonb_build_object('booking_id', p_booking, 'decision', p_decision)
  )
  ON CONFLICT DO NOTHING;

  RETURN commands.session_workspace(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.bump_session_roster(p_booking uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.bookings%ROWTYPE;
BEGIN
  actor := commands.require_session_participant(p_booking);
  SELECT * INTO row FROM public.bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  UPDATE public.bookings
  SET roster_version = roster_version + 1,
      recording_state = CASE
        WHEN recording_state IN ('consented', 'recording') THEN 'consent_requested'
        ELSE recording_state
      END,
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'session_roster_changed',
    'bookings',
    p_booking,
    commands.request_id(),
    jsonb_build_object('from', row.roster_version, 'to', row.roster_version + 1)
  );

  RETURN commands.session_workspace(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_meeting_room(
  p_booking uuid,
  p_provider text,
  p_external text,
  p_url text,
  p_generation integer,
  p_state text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_session_participant(p_booking);
  INSERT INTO public.meeting_rooms (
    booking_id, provider, external_id, room_url, state, generation
  ) VALUES (
    p_booking, p_provider, p_external, p_url, p_state, p_generation
  )
  ON CONFLICT (booking_id, generation) DO UPDATE
    SET external_id = EXCLUDED.external_id,
        room_url = EXCLUDED.room_url,
        state = EXCLUDED.state;

  UPDATE public.bookings
  SET link_status = CASE WHEN p_state = 'ready' THEN 'ready' ELSE 'preparing' END,
      conference_url = CASE WHEN p_state = 'ready' THEN p_url ELSE conference_url END,
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking;

  RETURN commands.session_workspace(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.reconcile_session_attendance(p_booking uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  row public.bookings%ROWTYPE;
  student_ok boolean;
  host_ok boolean;
  outcome text;
BEGIN
  PERFORM commands.require_session_participant(p_booking);
  SELECT * INTO row FROM public.bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  student_ok := EXISTS (
    SELECT 1 FROM public.attendance_events e
    JOIN public.booking_participants p
      ON p.booking_id = e.booking_id AND p.account_id = e.participant_id
    WHERE e.booking_id = p_booking
      AND e.evidence_type = 'provider_verified'
      AND p.role = 'student'
  );
  host_ok := EXISTS (
    SELECT 1 FROM public.attendance_events e
    WHERE e.booking_id = p_booking
      AND e.evidence_type = 'provider_verified'
      AND e.participant_id = row.host_id
  );

  IF now() < row.starts_at + interval '10 minutes' THEN
    outcome := row.attendance_outcome;
  ELSIF student_ok AND host_ok THEN
    outcome := NULL;
  ELSIF now() >= row.starts_at + interval '10 minutes'
    AND NOT student_ok AND NOT host_ok
    AND row.attendance_outcome IS DISTINCT FROM 'both_no_show'
  THEN
    outcome := CASE
      WHEN row.attendance_outcome IS NULL THEN 'provisional_no_show'
      ELSE 'both_no_show'
    END;
  ELSIF NOT student_ok THEN
    outcome := 'student_no_show';
  ELSE
    outcome := 'counselor_no_show';
  END IF;

  UPDATE public.bookings
  SET attendance_outcome = outcome,
      session_state = CASE
        WHEN outcome IN ('student_no_show', 'counselor_no_show', 'both_no_show')
          AND session_state IN ('scheduled', 'waiting') THEN 'ended'
        ELSE session_state
      END,
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking;

  IF outcome IN ('counselor_no_show', 'both_no_show') THEN
    INSERT INTO public.audit_events (
      actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
    ) VALUES (
      NULL,
      'counselor_absence_escalated',
      'bookings',
      p_booking,
      'Counselor absence requires admin review and student rebooking.',
      commands.request_id(),
      jsonb_build_object('outcome', outcome)
    );
    INSERT INTO public.outbox_events (
      aggregate_type, aggregate_id, aggregate_version, event_type, payload
    ) VALUES (
      'bookings',
      p_booking,
      row.version + 1,
      'counselor_absence_escalated',
      jsonb_build_object('booking_id', p_booking, 'outcome', outcome)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN commands.session_workspace(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.resolve_attendance_dispute(
  p_booking uuid,
  p_outcome text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.bookings%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('case_oversight');
  IF p_outcome NOT IN (
    'student_no_show', 'counselor_no_show', 'both_no_show', 'attendance_disputed'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF length(trim(p_reason)) < 2 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO row FROM public.bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  UPDATE public.bookings
  SET attendance_outcome = p_outcome,
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'attendance_dispute_resolved',
    'bookings',
    p_booking,
    p_reason,
    commands.request_id(),
    jsonb_build_object('outcome', p_outcome)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'bookings',
    p_booking,
    row.version + 1,
    'attendance_dispute_resolved',
    jsonb_build_object('booking_id', p_booking, 'outcome', p_outcome)
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('id', p_booking, 'attendanceOutcome', p_outcome);
END;
$$;

CREATE OR REPLACE FUNCTION commands.worker_tick_session_no_shows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  updated integer := 0;
BEGIN
  UPDATE public.bookings
  SET attendance_outcome = 'provisional_no_show',
      version = version + 1,
      updated_at = now()
  WHERE status = 'confirmed'
    AND session_state IN ('scheduled', 'waiting', 'in_progress')
    AND attendance_outcome IS NULL
    AND now() >= starts_at + interval '10 minutes'
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.attendance_events e
        JOIN public.booking_participants p
          ON p.booking_id = e.booking_id AND p.account_id = e.participant_id
        WHERE e.booking_id = bookings.id
          AND e.evidence_type = 'provider_verified'
          AND p.role = 'student'
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.attendance_events e
        WHERE e.booking_id = bookings.id
          AND e.evidence_type = 'provider_verified'
          AND e.participant_id = bookings.host_id
      )
    );

  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION commands.worker_tick_session_no_shows() TO gsc_worker;
