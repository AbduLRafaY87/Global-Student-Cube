-- WP-10 / spec Media and AI: consent-gated Daily recording, transcripts,
-- AI jobs, private coaching, retention with deletion evidence.
-- Recording still defaults OFF. Manual advisory remains when the feature is off.

ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS provider_recording_id text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.session_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  recording_id uuid REFERENCES public.recordings (id) ON DELETE RESTRICT,
  state text NOT NULL,
  body text,
  input_hash text,
  delete_after timestamptz,
  deleted_at timestamptz,
  CONSTRAINT session_transcripts_state_check CHECK (state IN (
    'pending', 'ready', 'expired', 'deleted'
  ))
);

CREATE INDEX IF NOT EXISTS session_transcripts_due_idx
  ON public.session_transcripts (delete_after)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  status text NOT NULL,
  model text,
  prompt_version text,
  input_hash text,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  output jsonb,
  cost_cents integer NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  token_count integer NOT NULL DEFAULT 0 CHECK (token_count >= 0),
  error_code text,
  CONSTRAINT ai_jobs_kind_check CHECK (kind IN (
    'transcribe', 'advisory_draft', 'qa_coaching'
  )),
  CONSTRAINT ai_jobs_status_check CHECK (status IN (
    'queued', 'running', 'succeeded', 'failed', 'blocked'
  ))
);

CREATE INDEX IF NOT EXISTS ai_jobs_booking_created_idx
  ON public.ai_jobs (booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_jobs_status_idx
  ON public.ai_jobs (status, created_at);

CREATE TABLE IF NOT EXISTS public.counselor_coaching (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  counselor_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  job_id uuid REFERENCES public.ai_jobs (id) ON DELETE RESTRICT,
  findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  counselor_response text,
  flagged_inaccurate boolean NOT NULL DEFAULT false,
  CONSTRAINT counselor_coaching_booking_key UNIQUE (booking_id)
);

CREATE TABLE IF NOT EXISTS public.media_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  reason text NOT NULL,
  evidence_hash text NOT NULL,
  CONSTRAINT media_deletions_type_check CHECK (resource_type IN ('recording', 'transcript'))
);

ALTER TABLE public.session_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transcripts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_coaching ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_coaching FORCE ROW LEVEL SECURITY;
ALTER TABLE public.media_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_deletions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.session_transcripts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.ai_jobs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.counselor_coaching FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.media_deletions FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION commands.session_current_recording(p_booking uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', r.id,
    'providerRecordingId', r.provider_recording_id,
    'state', r.state,
    'deleteAfter', r.delete_after
  )
  FROM public.recordings r
  WHERE r.booking_id = p_booking
    AND r.deleted_at IS NULL
    AND r.state IN ('pending', 'stopped')
  ORDER BY r.created_at DESC
  LIMIT 1
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
    'currentRecording', commands.session_current_recording(row.id),
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

CREATE OR REPLACE FUNCTION commands.session_roster_consented(p_booking uuid, p_roster bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.booking_participants p
    WHERE p.booking_id = p_booking
      AND p.accepted_at IS NOT NULL
      AND p.revoked_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.recording_consents c
        WHERE c.booking_id = p.booking_id
          AND c.participant_id = p.account_id
          AND c.roster_version = p_roster
          AND c.decision = true
      )
  )
$$;

CREATE OR REPLACE FUNCTION commands.start_session_recording(
  p_booking uuid,
  p_provider_recording text
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
  actor := commands.require_session_participant(p_booking);
  SELECT * INTO row FROM public.bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.host_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF row.recording_state <> 'consented' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF commands.session_is_minor(row.case_id)
     AND NOT commands.session_guardian_consented(p_booking, row.roster_version)
  THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF NOT commands.session_roster_consented(p_booking, row.roster_version) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.recordings (
    booking_id, roster_version, state, started_at, provider_recording_id
  ) VALUES (
    p_booking, row.roster_version, 'pending', now(), p_provider_recording
  );

  UPDATE public.bookings
  SET recording_state = 'recording',
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'session_recording_started',
    'bookings',
    p_booking,
    commands.request_id(),
    jsonb_build_object('rosterVersion', row.roster_version)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'bookings', p_booking, row.version + 1, 'session_recording_started',
    jsonb_build_object('booking_id', p_booking)
  )
  ON CONFLICT DO NOTHING;

  RETURN commands.session_workspace(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.stop_session_recording(
  p_booking uuid,
  p_enqueue_transcript boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.bookings%ROWTYPE;
  rec public.recordings%ROWTYPE;
BEGIN
  actor := commands.require_session_participant(p_booking);
  SELECT * INTO row FROM public.bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  UPDATE public.recordings
  SET state = 'stopped',
      stopped_at = now(),
      delete_after = now() + interval '30 days'
  WHERE booking_id = p_booking
    AND state = 'pending'
    AND deleted_at IS NULL
  RETURNING * INTO rec;

  UPDATE public.bookings
  SET recording_state = CASE
        WHEN recording_state IN ('recording', 'consented') THEN 'stopped'
        ELSE recording_state
      END,
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking;

  IF p_enqueue_transcript AND rec.id IS NOT NULL THEN
    INSERT INTO public.ai_jobs (
      booking_id, kind, status, prompt_version, source_refs
    ) VALUES (
      p_booking,
      'transcribe',
      'queued',
      'wp10-v1',
      jsonb_build_array(jsonb_build_object('recordingId', rec.id))
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'session_recording_stopped',
    'bookings',
    p_booking,
    commands.request_id(),
    jsonb_build_object('enqueueTranscript', p_enqueue_transcript)
  );

  RETURN commands.session_workspace(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.enqueue_ai_job(
  p_booking uuid,
  p_kind text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  booking public.bookings%ROWTYPE;
  recent integer;
  job public.ai_jobs%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF booking.host_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_kind NOT IN ('transcribe', 'advisory_draft', 'qa_coaching') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT count(*) INTO recent
  FROM public.ai_jobs
  WHERE booking_id = p_booking
    AND created_at > now() - interval '1 hour';
  IF recent >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;

  INSERT INTO public.ai_jobs (booking_id, kind, status, prompt_version)
  VALUES (p_booking, p_kind, 'queued', 'wp10-v1')
  RETURNING * INTO job;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'ai_job_enqueued',
    'ai_jobs',
    job.id,
    commands.request_id(),
    jsonb_build_object('kind', p_kind)
  );

  RETURN jsonb_build_object('id', job.id, 'kind', job.kind, 'status', job.status);
END;
$$;

CREATE OR REPLACE FUNCTION commands.worker_claim_ai_jobs(p_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  claimed jsonb;
BEGIN
  WITH next AS (
    SELECT id
    FROM public.ai_jobs
    WHERE status = 'queued'
    ORDER BY created_at
    LIMIT GREATEST(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.ai_jobs j
  SET status = 'running'
  FROM next
  WHERE j.id = next.id
  RETURNING jsonb_agg(jsonb_build_object(
    'id', j.id,
    'bookingId', j.booking_id,
    'kind', j.kind,
    'sourceRefs', j.source_refs
  )) INTO claimed;

  RETURN COALESCE(claimed, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.complete_ai_job(
  p_job uuid,
  p_status text,
  p_model text,
  p_input_hash text,
  p_flags jsonb,
  p_output jsonb,
  p_cost integer,
  p_tokens integer,
  p_error text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  job public.ai_jobs%ROWTYPE;
  booking public.bookings%ROWTYPE;
  report public.advisory_reports%ROWTYPE;
BEGIN
  IF p_status NOT IN ('succeeded', 'failed', 'blocked') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_cost > 50 OR p_tokens > 8000 THEN
    p_status := 'blocked';
    p_error := 'COST_CAP';
  END IF;

  UPDATE public.ai_jobs
  SET status = p_status,
      model = p_model,
      input_hash = p_input_hash,
      validation_flags = COALESCE(p_flags, '[]'::jsonb),
      output = p_output,
      cost_cents = p_cost,
      token_count = p_tokens,
      error_code = p_error,
      finished_at = now()
  WHERE id = p_job
  RETURNING * INTO job;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT * INTO booking FROM public.bookings WHERE id = job.booking_id;

  IF job.kind = 'transcribe' AND p_status = 'succeeded' THEN
    INSERT INTO public.session_transcripts (
      booking_id, state, body, input_hash, delete_after
    ) VALUES (
      job.booking_id,
      'ready',
      COALESCE(p_output ->> 'text', ''),
      p_input_hash,
      now() + interval '90 days'
    );
  END IF;

  IF job.kind = 'advisory_draft' AND p_status = 'succeeded' AND booking.case_id IS NOT NULL THEN
    SELECT * INTO report
    FROM public.advisory_reports
    WHERE booking_id = job.booking_id
      AND status <> 'withdrawn'
    ORDER BY revision DESC
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.advisory_reports (
        case_id, booking_id, author_id, revision, status, shareable_body
      ) VALUES (
        booking.case_id,
        job.booking_id,
        booking.host_id,
        1,
        'draft',
        jsonb_build_object(
          'guidance', COALESCE(p_output ->> 'guidance', ''),
          'profileSummary', COALESCE(p_output ->> 'profileSummary', ''),
          'actionItems', COALESCE(p_output -> 'actionItems', '[]'::jsonb),
          'scholarshipSuggestions', COALESCE(p_output -> 'scholarshipSuggestions', '[]'::jsonb),
          'disclaimer', 'This guidance is indicative, not an admission or visa guarantee.'
        )
      );
    ELSIF report.status IN ('awaiting_summary', 'draft')
      AND coalesce(report.shareable_body ->> 'guidance', '') = ''
    THEN
      UPDATE public.advisory_reports
      SET shareable_body = jsonb_build_object(
            'guidance', COALESCE(p_output ->> 'guidance', ''),
            'profileSummary', COALESCE(p_output ->> 'profileSummary', ''),
            'actionItems', COALESCE(p_output -> 'actionItems', '[]'::jsonb),
            'scholarshipSuggestions', COALESCE(p_output -> 'scholarshipSuggestions', '[]'::jsonb),
            'disclaimer', 'This guidance is indicative, not an admission or visa guarantee.'
          ),
          status = 'draft',
          version = version + 1,
          updated_at = now()
      WHERE id = report.id;
    END IF;
  END IF;

  IF job.kind = 'qa_coaching' AND p_status = 'succeeded' AND booking.host_id IS NOT NULL THEN
    INSERT INTO public.counselor_coaching (
      booking_id, counselor_id, job_id, findings
    ) VALUES (
      job.booking_id, booking.host_id, job.id, COALESCE(p_output, '{}'::jsonb)
    )
    ON CONFLICT (booking_id) DO UPDATE
      SET findings = EXCLUDED.findings,
          job_id = EXCLUDED.job_id,
          updated_at = now();
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    NULL,
    'ai_job_completed',
    'ai_jobs',
    job.id,
    'worker',
    jsonb_build_object('status', p_status, 'kind', job.kind)
  );

  RETURN jsonb_build_object('id', job.id, 'status', p_status, 'kind', job.kind);
END;
$$;

CREATE OR REPLACE FUNCTION commands.counselor_qa(p_booking uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  booking public.bookings%ROWTYPE;
  coaching public.counselor_coaching%ROWTYPE;
  transcript_state text;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF booking.host_id <> actor
     AND NOT commands.has_staff_permission(actor, 'case_oversight')
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO coaching
  FROM public.counselor_coaching
  WHERE booking_id = p_booking;

  SELECT t.state INTO transcript_state
  FROM public.session_transcripts t
  WHERE t.booking_id = p_booking
    AND t.deleted_at IS NULL
  ORDER BY t.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'bookingId', p_booking,
    'sessionState', booking.session_state,
    'transcriptState', transcript_state,
    'findings', coaching.findings,
    'counselorResponse', coaching.counselor_response,
    'flaggedInaccurate', coaching.flagged_inaccurate,
    'updatedAt', coaching.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.counselor_qa_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'bookingId', b.id,
      'startsAt', b.starts_at,
      'sessionState', b.session_state,
      'hasCoaching', c.id IS NOT NULL,
      'flaggedInaccurate', COALESCE(c.flagged_inaccurate, false)
    ) ORDER BY b.starts_at DESC)
    FROM public.bookings b
    LEFT JOIN public.counselor_coaching c ON c.booking_id = b.id
    WHERE b.host_id = actor
      AND b.kind = 'counseling'
      AND b.session_state IN ('ended', 'completed')
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_coaching_response(
  p_booking uuid,
  p_response text,
  p_flag boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  booking public.bookings%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND OR booking.host_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.counselor_coaching (
    booking_id, counselor_id, counselor_response, flagged_inaccurate
  ) VALUES (
    p_booking, actor, p_response, p_flag
  )
  ON CONFLICT (booking_id) DO UPDATE
    SET counselor_response = EXCLUDED.counselor_response,
        flagged_inaccurate = EXCLUDED.flagged_inaccurate,
        updated_at = now();

  IF p_flag THEN
    INSERT INTO public.outbox_events (
      aggregate_type, aggregate_id, aggregate_version, event_type, payload
    ) VALUES (
      'counselor_coaching',
      p_booking,
      1,
      'coaching_flagged_inaccurate',
      jsonb_build_object('booking_id', p_booking)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN commands.counselor_qa(p_booking);
END;
$$;

CREATE OR REPLACE FUNCTION commands.worker_expire_media()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  rec_count integer := 0;
  tr_count integer := 0;
BEGIN
  WITH expired AS (
    UPDATE public.recordings
    SET state = 'expired',
        deleted_at = now()
    WHERE deleted_at IS NULL
      AND delete_after IS NOT NULL
      AND delete_after <= now()
    RETURNING id, booking_id
  )
  INSERT INTO public.media_deletions (booking_id, resource_type, resource_id, reason, evidence_hash)
  SELECT booking_id, 'recording', id, 'retention_30d',
         encode(digest(id::text || clock_timestamp()::text, 'sha256'), 'hex')
  FROM expired;
  GET DIAGNOSTICS rec_count = ROW_COUNT;

  WITH expired AS (
    UPDATE public.session_transcripts
    SET state = 'expired',
        body = NULL,
        deleted_at = now()
    WHERE deleted_at IS NULL
      AND delete_after IS NOT NULL
      AND delete_after <= now()
    RETURNING id, booking_id
  )
  INSERT INTO public.media_deletions (booking_id, resource_type, resource_id, reason, evidence_hash)
  SELECT booking_id, 'transcript', id, 'retention_90d',
         encode(digest(id::text || clock_timestamp()::text, 'sha256'), 'hex')
  FROM expired;
  GET DIAGNOSTICS tr_count = ROW_COUNT;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    NULL,
    'media_retention_ran',
    'media_deletions',
    NULL,
    'worker',
    jsonb_build_object('recordings', rec_count, 'transcripts', tr_count)
  );

  RETURN jsonb_build_object('recordings', rec_count, 'transcripts', tr_count);
END;
$$;

CREATE OR REPLACE FUNCTION commands.worker_pending_advisory_notices()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'bookingId', e.payload ->> 'booking_id',
    'caseId', e.payload ->> 'case_id',
    'eventType', e.event_type
  )), '[]'::jsonb)
  FROM public.outbox_events e
  WHERE e.event_type IN ('advisory_approved', 'advisory_delivered')
    AND e.dispatched_at IS NULL
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION commands.worker_claim_ai_jobs(integer) TO gsc_worker;
GRANT EXECUTE ON FUNCTION commands.complete_ai_job(uuid, text, text, text, jsonb, jsonb, integer, integer, text) TO gsc_worker;
GRANT EXECUTE ON FUNCTION commands.worker_expire_media() TO gsc_worker;
GRANT EXECUTE ON FUNCTION commands.worker_pending_advisory_notices() TO gsc_worker;
