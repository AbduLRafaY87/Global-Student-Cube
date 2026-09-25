-- MEN-01–07 alumni/parent mentorship. Folds leftover alumni_profiles.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'alumni_profiles'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'leftover_alumni_profiles'
  ) THEN
    ALTER TABLE public.alumni_profiles RENAME TO leftover_alumni_profiles;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.leftover_alumni_profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS alumni_profiles_select_authenticated ON public.leftover_alumni_profiles';
    EXECUTE 'DROP POLICY IF EXISTS alumni_profiles_insert_admin ON public.leftover_alumni_profiles';
    EXECUTE 'DROP POLICY IF EXISTS alumni_profiles_update_admin ON public.leftover_alumni_profiles';
    EXECUTE 'DROP POLICY IF EXISTS alumni_profiles_delete_admin ON public.leftover_alumni_profiles';
    REVOKE ALL ON TABLE public.leftover_alumni_profiles
      FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  account_id uuid NOT NULL UNIQUE REFERENCES public.accounts (id) ON DELETE RESTRICT,
  study_status text NOT NULL,
  university_attended text NOT NULL DEFAULT '',
  course text NOT NULL DEFAULT '',
  graduation_year integer,
  graduation_is_anticipated boolean NOT NULL DEFAULT false,
  topics text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  industries_other text NOT NULL DEFAULT '',
  current_organization text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  employer_business_url text NOT NULL DEFAULT '',
  professional_link text NOT NULL DEFAULT '',
  monthly_availability_hours numeric(5, 1),
  experience_years numeric(4, 1),
  reflection text NOT NULL DEFAULT '',
  evidence_file_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  verification_state text NOT NULL DEFAULT 'draft',
  published boolean NOT NULL DEFAULT false,
  CONSTRAINT mentor_profiles_study_check CHECK (
    study_status IN ('currently_studying', 'graduated')
  ),
  CONSTRAINT mentor_profiles_state_check CHECK (
    verification_state IN ('draft', 'pending', 'approved', 'rejected', 'needs_information')
  ),
  CONSTRAINT mentor_profiles_topics_len CHECK (
    cardinality(topics) BETWEEN 0 AND 3
  ),
  CONSTRAINT mentor_profiles_industries_len CHECK (
    cardinality(industries) BETWEEN 0 AND 10
  )
);

CREATE TABLE IF NOT EXISTS public.parent_mentor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  account_id uuid NOT NULL UNIQUE REFERENCES public.accounts (id) ON DELETE RESTRICT,
  education_level text NOT NULL,
  topics text[] NOT NULL DEFAULT '{}',
  monthly_availability_hours numeric(5, 1),
  experience_years numeric(4, 1),
  reflection text NOT NULL DEFAULT '',
  verification_state text NOT NULL DEFAULT 'draft',
  published boolean NOT NULL DEFAULT false,
  CONSTRAINT parent_mentor_education_check CHECK (
    education_level IN ('high_school', 'diploma', 'undergraduate', 'postgraduate')
  ),
  CONSTRAINT parent_mentor_state_check CHECK (
    verification_state IN ('draft', 'pending', 'approved', 'rejected', 'needs_information')
  ),
  CONSTRAINT parent_mentor_topics_len CHECK (
    cardinality(topics) BETWEEN 0 AND 3
  )
);

CREATE TABLE IF NOT EXISTS public.mentoring_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  mentee_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  mentor_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  mentor_kind text NOT NULL,
  case_id uuid REFERENCES public.cases (id) ON DELETE RESTRICT,
  topics text[] NOT NULL,
  purpose text NOT NULL,
  consented_brief boolean NOT NULL DEFAULT false,
  preference text NOT NULL DEFAULT 'either',
  state text NOT NULL DEFAULT 'requested',
  expires_at timestamptz NOT NULL,
  CONSTRAINT mentoring_requests_kind_check CHECK (mentor_kind IN ('alumni', 'parent')),
  CONSTRAINT mentoring_requests_pref_check CHECK (preference IN ('chat', 'session', 'either')),
  CONSTRAINT mentoring_requests_state_check CHECK (state IN (
    'draft', 'requested', 'accepted', 'declined', 'withdrawn', 'expired'
  )),
  CONSTRAINT mentoring_requests_purpose_len CHECK (char_length(purpose) BETWEEN 1 AND 600),
  CONSTRAINT mentoring_requests_topics_len CHECK (cardinality(topics) >= 1),
  CONSTRAINT mentoring_requests_not_self CHECK (mentee_account_id <> mentor_account_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS mentoring_requests_one_pending
  ON public.mentoring_requests (mentee_account_id, mentor_account_id)
  WHERE state IN ('draft', 'requested');

CREATE INDEX IF NOT EXISTS mentoring_requests_mentor_state_idx
  ON public.mentoring_requests (mentor_account_id, state, created_at DESC);
CREATE INDEX IF NOT EXISTS mentoring_requests_mentee_state_idx
  ON public.mentoring_requests (mentee_account_id, state, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mentoring_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.mentoring_requests (id) ON DELETE RESTRICT,
  mentee_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  mentor_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  mentor_kind text NOT NULL,
  conversation_id uuid REFERENCES public.conversations (id) ON DELETE RESTRICT,
  CONSTRAINT mentoring_connections_kind_check CHECK (mentor_kind IN ('alumni', 'parent')),
  CONSTRAINT mentoring_connections_pair UNIQUE (mentee_account_id, mentor_account_id)
);

CREATE TABLE IF NOT EXISTS public.mentor_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  author_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  session_type text NOT NULL,
  good_point text NOT NULL DEFAULT '',
  improvement_point text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT 'completed',
  CONSTRAINT mentor_reports_type_check CHECK (
    session_type IN ('career', 'admission', 'finance', 'accommodation')
  ),
  CONSTRAINT mentor_reports_state_check CHECK (state IN ('pending', 'completed')),
  CONSTRAINT mentor_reports_author_key UNIQUE (booking_id, author_account_id)
);

CREATE TABLE IF NOT EXISTS public.mentoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings (id) ON DELETE RESTRICT,
  mentor_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  session_type text NOT NULL,
  good_point text NOT NULL,
  improvement_point text NOT NULL,
  state text NOT NULL DEFAULT 'submitted',
  CONSTRAINT mentoring_logs_type_check CHECK (
    session_type IN ('career', 'admission', 'finance', 'accommodation')
  ),
  CONSTRAINT mentoring_logs_state_check CHECK (state IN (
    'draft',
    'submitted',
    'changes_requested',
    'rejected',
    'approved',
    'approved_awaiting_rating',
    'reward_eligible',
    'credited'
  ))
);

CREATE TABLE IF NOT EXISTS public.mentoring_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  author_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  questionnaire text NOT NULL,
  answers jsonb NOT NULL,
  state text NOT NULL DEFAULT 'submitted',
  CONSTRAINT mentoring_feedback_q_check CHECK (
    questionnaire IN ('alumni_mentee', 'mentor', 'parent_mentee')
  ),
  CONSTRAINT mentoring_feedback_state_check CHECK (state IN ('draft', 'submitted')),
  CONSTRAINT mentoring_feedback_author_key UNIQUE (booking_id, author_account_id)
);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'mentor_profiles',
    'parent_mentor_profiles',
    'mentoring_requests',
    'mentoring_connections',
    'mentor_reports',
    'mentoring_logs',
    'mentoring_feedback'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role',
      tbl
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE ON TABLE public.%I TO gsc_api_executor',
      tbl
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION commands.display_name(p_account uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(btrim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '')
  FROM public.user_profiles p
  WHERE p.id = p_account
$$;

CREATE OR REPLACE FUNCTION commands.is_parent_account(p_account uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles u
    WHERE u.id = p_account AND u.role = 'parent'
  ) OR EXISTS (
    SELECT 1 FROM public.account_roles r
    WHERE r.account_id = p_account
      AND r.role = 'parent'
      AND r.revoked_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION commands.accounts_blocked(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = p_a AND b.blocked_id = p_b)
       OR (b.blocker_id = p_b AND b.blocked_id = p_a)
  )
$$;

CREATE OR REPLACE FUNCTION commands.mentee_is_minor_unguarded(p_account uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, commands
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.student_account_id = p_account
      AND (c.student_dob + interval '18 years') > now()
      AND NOT EXISTS (
        SELECT 1 FROM public.parent_links l
        WHERE l.case_id = c.id
          AND l.kind = 'verified_guardian'
          AND l.status = 'active'
      )
  )
$$;

CREATE OR REPLACE FUNCTION commands.mentorship_can_read_case(p_case uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN commands.can_read_case(p_case, actor);
END;
$$;

CREATE OR REPLACE FUNCTION commands.sync_mentor_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  kind text;
  subtype text;
  next_state text;
BEGIN
  kind := commands.verification_kind(NEW.professional_evidence);
  IF kind IS DISTINCT FROM 'mentor' THEN
    RETURN NEW;
  END IF;
  subtype := COALESCE(NEW.professional_evidence ->> 'subtype', 'alumni');
  next_state := NEW.state;
  IF subtype = 'parent' THEN
    UPDATE public.parent_mentor_profiles
    SET verification_state = next_state,
        published = CASE WHEN next_state = 'approved' THEN true ELSE false END,
        updated_at = now(),
        version = version + 1
    WHERE account_id = NEW.account_id;
  ELSE
    UPDATE public.mentor_profiles
    SET verification_state = next_state,
        published = CASE WHEN next_state = 'approved' THEN true ELSE false END,
        updated_at = now(),
        version = version + 1
    WHERE account_id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verification_cases_sync_mentor ON public.verification_cases;
CREATE TRIGGER verification_cases_sync_mentor
  AFTER UPDATE OF state ON public.verification_cases
  FOR EACH ROW
  EXECUTE FUNCTION commands.sync_mentor_verification();

CREATE OR REPLACE FUNCTION commands.alumni_contribution(p_account uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'uniqueMentees', COALESCE((
      SELECT count(DISTINCT b.mentee_id)
      FROM public.bookings b
      JOIN public.mentoring_logs l ON l.booking_id = b.id
      JOIN public.mentoring_feedback f ON f.booking_id = b.id
        AND f.author_account_id = b.mentee_id
        AND f.state = 'submitted'
      WHERE b.host_id = p_account
        AND b.kind = 'mentoring'
        AND l.state IN ('approved', 'approved_awaiting_rating', 'reward_eligible', 'credited')
    ), 0),
    'verifiedSessions', COALESCE((
      SELECT count(*)
      FROM public.bookings b
      JOIN public.mentoring_logs l ON l.booking_id = b.id
      JOIN public.mentoring_feedback f ON f.booking_id = b.id
        AND f.author_account_id = b.mentee_id
        AND f.state = 'submitted'
      WHERE b.host_id = p_account
        AND b.kind = 'mentoring'
        AND l.state IN ('approved', 'approved_awaiting_rating', 'reward_eligible', 'credited')
    ), 0),
    'verifiedMinutes', COALESCE((
      SELECT COALESCE(sum(
        GREATEST(
          EXTRACT(EPOCH FROM (COALESCE(b.actual_ended_at, b.ends_at) - COALESCE(b.actual_started_at, b.starts_at))) / 60,
          0
        )
      ), 0)
      FROM public.bookings b
      JOIN public.mentoring_logs l ON l.booking_id = b.id
      JOIN public.mentoring_feedback f ON f.booking_id = b.id
        AND f.author_account_id = b.mentee_id
        AND f.state = 'submitted'
      WHERE b.host_id = p_account
        AND b.kind = 'mentoring'
        AND l.state IN ('approved', 'approved_awaiting_rating', 'reward_eligible', 'credited')
    ), 0),
    'spendablePoints', COALESCE((
      SELECT count(*) * 25
      FROM public.mentoring_logs l
      JOIN public.bookings b ON b.id = l.booking_id
      WHERE b.host_id = p_account AND l.state = 'credited'
    ), 0),
    'pendingPoints', COALESCE((
      SELECT count(*) * 25
      FROM public.mentoring_logs l
      JOIN public.bookings b ON b.id = l.booking_id
      WHERE b.host_id = p_account
        AND l.state IN ('submitted', 'approved', 'approved_awaiting_rating', 'reward_eligible')
    ), 0)
  )
$$;

CREATE OR REPLACE FUNCTION commands.upsert_alumni_mentor_profile(p_payload jsonb, p_submit boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.mentor_profiles%ROWTYPE;
  topics text[];
  industries text[];
  hours numeric;
BEGIN
  actor := commands.actor_id();
  IF commands.is_parent_account(actor) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  topics := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload -> 'topics', '[]'::jsonb)));
  industries := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload -> 'industries', '[]'::jsonb)));
  hours := NULLIF(p_payload ->> 'monthlyAvailabilityHours', '')::numeric;

  IF p_submit THEN
    IF cardinality(topics) <> 3 THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
    IF cardinality(industries) < 1 OR cardinality(industries) > 10 THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
    IF hours IS NULL OR hours < 2 OR hours > 160 OR (hours * 2) <> floor(hours * 2) THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END IF;

  INSERT INTO public.mentor_profiles (
    account_id,
    study_status,
    university_attended,
    course,
    graduation_year,
    graduation_is_anticipated,
    topics,
    industries,
    industries_other,
    current_organization,
    role,
    employer_business_url,
    professional_link,
    monthly_availability_hours,
    experience_years,
    reflection,
    verification_state,
    published
  ) VALUES (
    actor,
    COALESCE(p_payload ->> 'studyStatus', 'graduated'),
    COALESCE(p_payload ->> 'universityAttended', ''),
    COALESCE(p_payload ->> 'course', ''),
    NULLIF(p_payload ->> 'graduationYear', '')::integer,
    COALESCE((p_payload ->> 'graduationIsAnticipated')::boolean, false),
    topics,
    industries,
    COALESCE(p_payload ->> 'industriesOther', ''),
    COALESCE(p_payload ->> 'currentOrganization', ''),
    COALESCE(p_payload ->> 'role', ''),
    COALESCE(p_payload ->> 'employerBusinessUrl', ''),
    COALESCE(p_payload ->> 'professionalLink', ''),
    hours,
    NULLIF(p_payload ->> 'experienceYears', '')::numeric,
    COALESCE(p_payload ->> 'reflection', ''),
    CASE WHEN p_submit THEN 'pending' ELSE 'draft' END,
    false
  )
  ON CONFLICT (account_id) DO UPDATE
    SET study_status = EXCLUDED.study_status,
        university_attended = EXCLUDED.university_attended,
        course = EXCLUDED.course,
        graduation_year = EXCLUDED.graduation_year,
        graduation_is_anticipated = EXCLUDED.graduation_is_anticipated,
        topics = EXCLUDED.topics,
        industries = EXCLUDED.industries,
        industries_other = EXCLUDED.industries_other,
        current_organization = EXCLUDED.current_organization,
        role = EXCLUDED.role,
        employer_business_url = EXCLUDED.employer_business_url,
        professional_link = EXCLUDED.professional_link,
        monthly_availability_hours = EXCLUDED.monthly_availability_hours,
        experience_years = EXCLUDED.experience_years,
        reflection = EXCLUDED.reflection,
        verification_state = CASE
          WHEN mentor_profiles.verification_state = 'approved' AND NOT p_submit
            THEN mentor_profiles.verification_state
          WHEN p_submit THEN 'pending'
          ELSE 'draft'
        END,
        published = CASE
          WHEN p_submit THEN false
          ELSE mentor_profiles.published
        END,
        updated_at = now(),
        version = mentor_profiles.version + 1
  RETURNING * INTO row;

  IF p_submit THEN
    PERFORM commands.open_verification_case(
      actor,
      'mentor',
      jsonb_build_object('subtype', 'alumni', 'profileId', row.id)
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'upsert_alumni_mentor_profile',
    'mentor_profiles',
    row.id,
    commands.request_id(),
    jsonb_build_object('submitted', p_submit, 'version', row.version)
  );

  RETURN jsonb_build_object(
    'id', row.id,
    'verificationState', row.verification_state,
    'version', row.version
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_parent_mentor_profile(p_payload jsonb, p_submit boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.parent_mentor_profiles%ROWTYPE;
  topics text[];
  hours numeric;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.is_parent_account(actor) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  topics := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload -> 'topics', '[]'::jsonb)));
  hours := NULLIF(p_payload ->> 'monthlyAvailabilityHours', '')::numeric;

  IF p_submit THEN
    IF cardinality(topics) < 1 OR cardinality(topics) > 3 THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
    IF hours IS NULL OR hours < 2 OR hours > 160 THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END IF;

  INSERT INTO public.parent_mentor_profiles (
    account_id,
    education_level,
    topics,
    monthly_availability_hours,
    experience_years,
    reflection,
    verification_state,
    published
  ) VALUES (
    actor,
    COALESCE(p_payload ->> 'educationLevel', 'undergraduate'),
    topics,
    hours,
    NULLIF(p_payload ->> 'experienceYears', '')::numeric,
    COALESCE(p_payload ->> 'reflection', ''),
    CASE WHEN p_submit THEN 'pending' ELSE 'draft' END,
    false
  )
  ON CONFLICT (account_id) DO UPDATE
    SET education_level = EXCLUDED.education_level,
        topics = EXCLUDED.topics,
        monthly_availability_hours = EXCLUDED.monthly_availability_hours,
        experience_years = EXCLUDED.experience_years,
        reflection = EXCLUDED.reflection,
        verification_state = CASE
          WHEN parent_mentor_profiles.verification_state = 'approved' AND NOT p_submit
            THEN parent_mentor_profiles.verification_state
          WHEN p_submit THEN 'pending'
          ELSE 'draft'
        END,
        published = CASE
          WHEN p_submit THEN false
          ELSE parent_mentor_profiles.published
        END,
        updated_at = now(),
        version = parent_mentor_profiles.version + 1
  RETURNING * INTO row;

  IF p_submit THEN
    PERFORM commands.open_verification_case(
      actor,
      'mentor',
      jsonb_build_object('subtype', 'parent', 'profileId', row.id)
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'upsert_parent_mentor_profile',
    'parent_mentor_profiles',
    row.id,
    commands.request_id(),
    jsonb_build_object('submitted', p_submit, 'version', row.version)
  );

  RETURN jsonb_build_object(
    'id', row.id,
    'verificationState', row.verification_state,
    'version', row.version
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_published_mentors(p_filters jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  kind text := COALESCE(p_filters ->> 'kind', 'alumni');
  topic text := NULLIF(p_filters ->> 'topic', '');
  university text := NULLIF(p_filters ->> 'university', '');
  sector text := NULLIF(p_filters ->> 'sector', '');
  experience numeric := NULLIF(p_filters ->> 'experienceYears', '')::numeric;
  result jsonb;
BEGIN
  IF kind = 'parent' THEN
    SELECT COALESCE(jsonb_agg(item ORDER BY item ->> 'id'), '[]'::jsonb)
    INTO result
    FROM (
      SELECT jsonb_build_object(
        'id', p.id,
        'accountId', p.account_id,
        'kind', 'parent',
        'displayName', COALESCE(commands.display_name(p.account_id), 'Mentor'),
        'topics', to_jsonb(p.topics),
        'educationLevel', p.education_level,
        'experienceYears', p.experience_years,
        'verificationBadge', 'verified',
        'contributionTier', 'unverified_separate',
        'supportedUniqueMentees', (commands.alumni_contribution(p.account_id) ->> 'uniqueMentees')::int,
        'publishedRating', NULL,
        'ratingLabel', 'Not yet rated'
      ) AS item
      FROM public.parent_mentor_profiles p
      WHERE p.verification_state = 'approved'
        AND p.published
        AND (topic IS NULL OR topic = ANY (p.topics))
        AND (experience IS NULL OR p.experience_years >= experience)
    ) listed;
    RETURN COALESCE(result, '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(item ORDER BY item ->> 'id'), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'accountId', p.account_id,
      'kind', 'alumni',
      'displayName', COALESCE(commands.display_name(p.account_id), 'Mentor'),
      'universityAttended', p.university_attended,
      'course', p.course,
      'graduationYear', p.graduation_year,
      'graduationIsAnticipated', p.graduation_is_anticipated,
      'studyStatus', p.study_status,
      'topics', to_jsonb(p.topics),
      'industries', to_jsonb(p.industries),
      'experienceYears', p.experience_years,
      'verificationBadge', 'verified',
      'contributionTier', 'unverified_separate',
      'supportedUniqueMentees', (commands.alumni_contribution(p.account_id) ->> 'uniqueMentees')::int,
      'publishedRating', NULL,
      'ratingLabel', 'Not yet rated'
    ) AS item
    FROM public.mentor_profiles p
    WHERE p.verification_state = 'approved'
      AND p.published
      AND (topic IS NULL OR topic = ANY (p.topics))
      AND (university IS NULL OR p.university_attended ILIKE '%' || university || '%')
      AND (sector IS NULL OR sector = ANY (p.industries))
      AND (experience IS NULL OR p.experience_years >= experience)
  ) listed;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.mentorship_leaderboard(p_period text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  since timestamptz;
  result jsonb;
BEGIN
  since := CASE
    WHEN p_period = 'annual' THEN now() - interval '365 days'
    ELSE date_trunc('month', now())
  END;

  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'mentorId', host_id,
      'kind', kind,
      'displayName', COALESCE(commands.display_name(host_id), 'Mentor'),
      'uniqueMentees', unique_mentees,
      'verifiedMinutes', verified_minutes,
      'ratingLabel', 'Not yet rated'
    ) AS item
    FROM (
      SELECT
        b.host_id,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM public.parent_mentor_profiles pp
            WHERE pp.account_id = b.host_id AND pp.verification_state = 'approved'
          ) THEN 'parent'
          ELSE 'alumni'
        END AS kind,
        count(DISTINCT b.mentee_id) AS unique_mentees,
        COALESCE(sum(
          GREATEST(
            EXTRACT(EPOCH FROM (COALESCE(b.actual_ended_at, b.ends_at) - COALESCE(b.actual_started_at, b.starts_at))) / 60,
            0
          )
        ), 0) AS verified_minutes
      FROM public.bookings b
      JOIN public.mentoring_logs l ON l.booking_id = b.id
      JOIN public.mentoring_feedback f ON f.booking_id = b.id
        AND f.author_account_id = b.mentee_id
        AND f.state = 'submitted'
      WHERE b.kind = 'mentoring'
        AND b.starts_at >= since
        AND l.state IN ('approved', 'approved_awaiting_rating', 'reward_eligible', 'credited')
        AND (
          EXISTS (
            SELECT 1 FROM public.mentor_profiles mp
            WHERE mp.account_id = b.host_id
              AND mp.verification_state = 'approved'
              AND mp.published
          )
          OR EXISTS (
            SELECT 1 FROM public.parent_mentor_profiles pp
            WHERE pp.account_id = b.host_id
              AND pp.verification_state = 'approved'
              AND pp.published
          )
        )
      GROUP BY b.host_id
      ORDER BY unique_mentees DESC, verified_minutes DESC, b.host_id
      LIMIT 10
    ) ranked
  ) listed;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_published_mentor(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  alumni public.mentor_profiles%ROWTYPE;
  parent_row public.parent_mentor_profiles%ROWTYPE;
BEGIN
  SELECT * INTO alumni FROM public.mentor_profiles WHERE id = p_id;
  IF FOUND THEN
    IF alumni.verification_state IS DISTINCT FROM 'approved' OR NOT alumni.published THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;
    RETURN jsonb_build_object(
      'id', alumni.id,
      'accountId', alumni.account_id,
      'kind', 'alumni',
      'displayName', COALESCE(commands.display_name(alumni.account_id), 'Mentor'),
      'studyStatus', alumni.study_status,
      'universityAttended', alumni.university_attended,
      'course', alumni.course,
      'graduationYear', alumni.graduation_year,
      'graduationIsAnticipated', alumni.graduation_is_anticipated,
      'topics', to_jsonb(alumni.topics),
      'industries', to_jsonb(alumni.industries),
      'currentOrganization', alumni.current_organization,
      'role', alumni.role,
      'experienceYears', alumni.experience_years,
      'monthlyAvailabilityHours', alumni.monthly_availability_hours,
      'reflection', alumni.reflection,
      'verificationBadge', 'verified',
      'supportedUniqueMentees', (commands.alumni_contribution(alumni.account_id) ->> 'uniqueMentees')::int,
      'ratingLabel', 'Not yet rated'
    );
  END IF;

  SELECT * INTO parent_row FROM public.parent_mentor_profiles WHERE id = p_id;
  IF NOT FOUND OR parent_row.verification_state IS DISTINCT FROM 'approved' OR NOT parent_row.published THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  RETURN jsonb_build_object(
    'id', parent_row.id,
    'accountId', parent_row.account_id,
    'kind', 'parent',
    'displayName', COALESCE(commands.display_name(parent_row.account_id), 'Mentor'),
    'educationLevel', parent_row.education_level,
    'topics', to_jsonb(parent_row.topics),
    'experienceYears', parent_row.experience_years,
    'monthlyAvailabilityHours', parent_row.monthly_availability_hours,
    'reflection', parent_row.reflection,
    'verificationBadge', 'verified',
    'supportedUniqueMentees', (commands.alumni_contribution(parent_row.account_id) ->> 'uniqueMentees')::int,
    'ratingLabel', 'Not yet rated'
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.my_alumni_mentor_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.mentor_profiles%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  IF commands.is_parent_account(actor) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO row FROM public.mentor_profiles WHERE account_id = actor;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false);
  END IF;
  RETURN jsonb_build_object(
    'exists', true,
    'id', row.id,
    'studyStatus', row.study_status,
    'universityAttended', row.university_attended,
    'course', row.course,
    'graduationYear', row.graduation_year,
    'graduationIsAnticipated', row.graduation_is_anticipated,
    'topics', to_jsonb(row.topics),
    'industries', to_jsonb(row.industries),
    'industriesOther', row.industries_other,
    'currentOrganization', row.current_organization,
    'role', row.role,
    'employerBusinessUrl', row.employer_business_url,
    'professionalLink', row.professional_link,
    'monthlyAvailabilityHours', row.monthly_availability_hours,
    'experienceYears', row.experience_years,
    'reflection', row.reflection,
    'verificationState', row.verification_state,
    'published', row.published,
    'version', row.version
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.my_parent_mentor_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.parent_mentor_profiles%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.is_parent_account(actor) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO row FROM public.parent_mentor_profiles WHERE account_id = actor;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false);
  END IF;
  RETURN jsonb_build_object(
    'exists', true,
    'id', row.id,
    'educationLevel', row.education_level,
    'topics', to_jsonb(row.topics),
    'monthlyAvailabilityHours', row.monthly_availability_hours,
    'experienceYears', row.experience_years,
    'reflection', row.reflection,
    'verificationState', row.verification_state,
    'published', row.published,
    'version', row.version
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.mentor_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  alumni public.mentor_profiles%ROWTYPE;
  parent_row public.parent_mentor_profiles%ROWTYPE;
  kind text;
  verification text := 'none';
  next_request jsonb;
  next_session jsonb;
  due jsonb;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO alumni FROM public.mentor_profiles WHERE account_id = actor;
  SELECT * INTO parent_row FROM public.parent_mentor_profiles WHERE account_id = actor;
  IF parent_row.account_id IS NOT NULL AND commands.is_parent_account(actor) THEN
    kind := 'parent';
    verification := parent_row.verification_state;
  ELSIF alumni.account_id IS NOT NULL THEN
    kind := 'alumni';
    verification := alumni.verification_state;
  ELSE
    kind := CASE WHEN commands.is_parent_account(actor) THEN 'parent' ELSE 'alumni' END;
  END IF;

  SELECT jsonb_build_object(
    'id', r.id,
    'topic', r.topics[1],
    'state', r.state,
    'createdAt', r.created_at
  )
  INTO next_request
  FROM public.mentoring_requests r
  WHERE r.mentor_account_id = actor AND r.state = 'requested'
  ORDER BY r.created_at
  LIMIT 1;

  SELECT jsonb_build_object(
    'id', b.id,
    'startsAt', b.starts_at,
    'state', b.session_state
  )
  INTO next_session
  FROM public.bookings b
  WHERE b.host_id = actor
    AND b.kind = 'mentoring'
    AND b.status IN ('selected', 'held', 'confirmed')
    AND b.session_state IN ('scheduled', 'waiting', 'in_progress')
  ORDER BY b.starts_at
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'bookingId', b.id,
    'startsAt', b.starts_at
  )), '[]'::jsonb)
  INTO due
  FROM public.bookings b
  WHERE b.host_id = actor
    AND b.kind = 'mentoring'
    AND b.session_state = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.mentoring_logs l WHERE l.booking_id = b.id
    );

  RETURN jsonb_build_object(
    'kind', kind,
    'verificationState', verification,
    'nextRequest', next_request,
    'nextSession', next_session,
    'feedbackDue', COALESCE(due, '[]'::jsonb),
    'contributions', commands.alumni_contribution(actor)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_mentor_request(
  p_mentor_id uuid,
  p_case_id uuid,
  p_topics text[],
  p_purpose text,
  p_consented boolean,
  p_preference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  alumni public.mentor_profiles%ROWTYPE;
  parent_row public.parent_mentor_profiles%ROWTYPE;
  mentor_account uuid;
  kind text;
  existing public.mentoring_requests%ROWTYPE;
  row public.mentoring_requests%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  IF NOT COALESCE(p_consented, false) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_purpose IS NULL OR char_length(btrim(p_purpose)) = 0 OR char_length(p_purpose) > 600 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_topics IS NULL OR cardinality(p_topics) < 1 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF COALESCE(p_preference, 'either') NOT IN ('chat', 'session', 'either') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO alumni FROM public.mentor_profiles WHERE id = p_mentor_id;
  IF FOUND THEN
    IF alumni.verification_state IS DISTINCT FROM 'approved' OR NOT alumni.published THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;
    mentor_account := alumni.account_id;
    kind := 'alumni';
    IF commands.is_parent_account(actor) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  ELSE
    SELECT * INTO parent_row FROM public.parent_mentor_profiles WHERE id = p_mentor_id;
    IF NOT FOUND OR parent_row.verification_state IS DISTINCT FROM 'approved' OR NOT parent_row.published THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;
    mentor_account := parent_row.account_id;
    kind := 'parent';
    IF NOT commands.is_parent_account(actor) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  IF actor = mentor_account THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF commands.accounts_blocked(actor, mentor_account) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF commands.mentee_is_minor_unguarded(actor) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_case_id IS NOT NULL AND NOT commands.can_read_case(p_case_id, actor) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO existing
  FROM public.mentoring_requests
  WHERE mentee_account_id = actor
    AND mentor_account_id = mentor_account
    AND state IN ('draft', 'requested', 'accepted')
  ORDER BY created_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', existing.id,
      'state', existing.state,
      'duplicate', true
    );
  END IF;

  INSERT INTO public.mentoring_requests (
    mentee_account_id,
    mentor_account_id,
    mentor_kind,
    case_id,
    topics,
    purpose,
    consented_brief,
    preference,
    state,
    expires_at
  ) VALUES (
    actor,
    mentor_account,
    kind,
    p_case_id,
    p_topics,
    btrim(p_purpose),
    true,
    COALESCE(p_preference, 'either'),
    'requested',
    now() + interval '7 days'
  )
  RETURNING * INTO row;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'create_mentor_request',
    'mentoring_requests',
    row.id,
    commands.request_id(),
    jsonb_build_object('mentorKind', kind)
  );

  RETURN jsonb_build_object('id', row.id, 'state', row.state, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION commands.open_mentor_conversation(p_request uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  req public.mentoring_requests%ROWTYPE;
  conv public.conversations%ROWTYPE;
BEGIN
  SELECT * INTO req FROM public.mentoring_requests WHERE id = p_request;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT * INTO conv
  FROM public.conversations
  WHERE mentor_request_id = p_request AND kind = 'mentor' AND closed_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.conversations (kind, mentor_request_id)
    VALUES ('mentor', p_request)
    RETURNING * INTO conv;
  END IF;

  INSERT INTO public.conversation_members (conversation_id, account_id, can_send)
  VALUES (conv.id, req.mentee_account_id, true)
  ON CONFLICT (conversation_id, account_id) DO UPDATE
    SET left_at = NULL, can_send = true;
  INSERT INTO public.conversation_members (conversation_id, account_id, can_send)
  VALUES (conv.id, req.mentor_account_id, true)
  ON CONFLICT (conversation_id, account_id) DO UPDATE
    SET left_at = NULL, can_send = true;

  RETURN conv.id;
END;
$$;

CREATE OR REPLACE FUNCTION commands.decide_mentor_request(p_id uuid, p_decision text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.mentoring_requests%ROWTYPE;
  conv_id uuid;
  conn public.mentoring_connections%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  IF p_decision NOT IN ('accept', 'decline') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO row FROM public.mentoring_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.mentor_account_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF row.state = 'accepted' AND p_decision = 'accept' THEN
    SELECT * INTO conn FROM public.mentoring_connections WHERE request_id = row.id;
    RETURN jsonb_build_object(
      'id', row.id,
      'state', row.state,
      'connectionId', conn.id,
      'conversationId', conn.conversation_id
    );
  END IF;
  IF row.state IS DISTINCT FROM 'requested' THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;
  IF p_decision = 'accept' THEN
    IF commands.accounts_blocked(row.mentee_account_id, actor)
      OR commands.mentee_is_minor_unguarded(row.mentee_account_id)
    THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  UPDATE public.mentoring_requests
  SET state = CASE WHEN p_decision = 'accept' THEN 'accepted' ELSE 'declined' END,
      updated_at = now(),
      version = version + 1
  WHERE id = p_id
  RETURNING * INTO row;

  IF p_decision = 'accept' THEN
    conv_id := commands.open_mentor_conversation(row.id);
    INSERT INTO public.mentoring_connections (
      request_id, mentee_account_id, mentor_account_id, mentor_kind, conversation_id
    ) VALUES (
      row.id, row.mentee_account_id, row.mentor_account_id, row.mentor_kind, conv_id
    )
    ON CONFLICT (request_id) DO UPDATE
      SET conversation_id = EXCLUDED.conversation_id
    RETURNING * INTO conn;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'decide_mentor_request',
    'mentoring_requests',
    row.id,
    commands.request_id(),
    jsonb_build_object('decision', p_decision)
  );

  RETURN jsonb_build_object(
    'id', row.id,
    'state', row.state,
    'connectionId', conn.id,
    'conversationId', conv_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.withdraw_mentor_request(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.mentoring_requests%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.mentoring_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.mentee_account_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF row.state IS DISTINCT FROM 'requested' THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  UPDATE public.mentoring_requests
  SET state = 'withdrawn',
      updated_at = now(),
      version = version + 1
  WHERE id = p_id
  RETURNING * INTO row;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'withdraw_mentor_request',
    'mentoring_requests',
    row.id,
    commands.request_id(),
    '{}'::jsonb
  );

  RETURN jsonb_build_object('id', row.id, 'state', row.state);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_mentor_requests(p_tab text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  result jsonb;
BEGIN
  actor := commands.actor_id();
  SELECT COALESCE(jsonb_agg(item ORDER BY item ->> 'createdAt' DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', r.id,
      'state', r.state,
      'mentorKind', r.mentor_kind,
      'topics', to_jsonb(r.topics),
      'purpose', r.purpose,
      'preference', r.preference,
      'createdAt', r.created_at,
      'counterpartyName', COALESCE(
        commands.display_name(
          CASE WHEN r.mentor_account_id = actor THEN r.mentee_account_id ELSE r.mentor_account_id END
        ),
        'Member'
      ),
      'direction', CASE WHEN r.mentor_account_id = actor THEN 'incoming' ELSE 'outgoing' END,
      'conversationId', c.conversation_id,
      'connectionId', c.id
    ) AS item
    FROM public.mentoring_requests r
    LEFT JOIN public.mentoring_connections c ON c.request_id = r.id
    WHERE (
      (COALESCE(p_tab, 'incoming') = 'incoming' AND r.mentor_account_id = actor)
      OR (p_tab = 'outgoing' AND r.mentee_account_id = actor)
      OR (p_tab = 'accepted' AND r.state = 'accepted' AND (r.mentor_account_id = actor OR r.mentee_account_id = actor))
    )
      AND (
        p_tab IS DISTINCT FROM 'accepted' OR r.state = 'accepted'
      )
  ) listed;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_mentor_request(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  r public.mentoring_requests%ROWTYPE;
  conn public.mentoring_connections%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO r FROM public.mentoring_requests WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF r.mentee_account_id <> actor AND r.mentor_account_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO conn FROM public.mentoring_connections WHERE request_id = r.id;
  RETURN jsonb_build_object(
    'id', r.id,
    'state', r.state,
    'mentorKind', r.mentor_kind,
    'topics', to_jsonb(r.topics),
    'purpose', r.purpose,
    'preference', r.preference,
    'createdAt', r.created_at,
    'expiresAt', r.expires_at,
    'isMentor', r.mentor_account_id = actor,
    'counterpartyName', COALESCE(
      commands.display_name(
        CASE WHEN r.mentor_account_id = actor THEN r.mentee_account_id ELSE r.mentor_account_id END
      ),
      'Member'
    ),
    'conversationId', conn.conversation_id,
    'connectionId', conn.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_mentoring_booking(
  p_request_id uuid,
  p_starts_at timestamptz,
  p_timezone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  req public.mentoring_requests%ROWTYPE;
  conn public.mentoring_connections%ROWTYPE;
  host uuid;
  mentee uuid;
  booking public.bookings%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO req FROM public.mentoring_requests WHERE id = p_request_id;
  IF NOT FOUND OR req.state IS DISTINCT FROM 'accepted' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  SELECT * INTO conn FROM public.mentoring_connections WHERE request_id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF actor <> req.mentee_account_id AND actor <> req.mentor_account_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF commands.accounts_blocked(req.mentee_account_id, req.mentor_account_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  host := req.mentor_account_id;
  mentee := req.mentee_account_id;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.mentee_id = mentee
      AND b.kind = 'mentoring'
      AND b.status IN ('selected', 'held', 'confirmed')
      AND b.session_state IN ('scheduled', 'waiting', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  INSERT INTO public.bookings (
    mentee_id,
    host_id,
    kind,
    mentor_request_id,
    starts_at,
    ends_at,
    host_timezone,
    student_timezone,
    topics,
    status,
    session_state,
    link_status
  ) VALUES (
    mentee,
    host,
    'mentoring',
    p_request_id,
    p_starts_at,
    p_starts_at + interval '30 minutes',
    COALESCE(NULLIF(p_timezone, ''), 'UTC'),
    COALESCE(NULLIF(p_timezone, ''), 'UTC'),
    req.topics,
    'confirmed',
    'scheduled',
    'preparing'
  )
  RETURNING * INTO booking;

  INSERT INTO public.booking_participants (booking_id, account_id, role)
  VALUES
    (booking.id, host, 'mentor'),
    (
      booking.id,
      mentee,
      CASE WHEN commands.is_parent_account(mentee) THEN 'parent' ELSE 'student' END
    )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'create_mentoring_booking',
    'bookings',
    booking.id,
    commands.request_id(),
    jsonb_build_object('requestId', p_request_id)
  );

  RETURN jsonb_build_object(
    'id', booking.id,
    'startsAt', booking.starts_at,
    'status', booking.status
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.submit_mentor_log(
  p_booking uuid,
  p_session_type text,
  p_good text,
  p_improvement text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  booking public.bookings%ROWTYPE;
  rated boolean;
  next_state text;
  row public.mentoring_logs%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  IF p_session_type NOT IN ('career', 'admission', 'finance', 'accommodation') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_good IS NULL OR char_length(btrim(p_good)) = 0 OR char_length(p_good) > 600 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_improvement IS NULL OR char_length(btrim(p_improvement)) = 0 OR char_length(p_improvement) > 600 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND OR booking.kind IS DISTINCT FROM 'mentoring' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF booking.host_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF booking.session_state IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  rated := EXISTS (
    SELECT 1 FROM public.mentoring_feedback f
    WHERE f.booking_id = p_booking
      AND f.author_account_id = booking.mentee_id
      AND f.state = 'submitted'
  );
  next_state := CASE WHEN rated THEN 'submitted' ELSE 'submitted' END;

  INSERT INTO public.mentoring_logs (
    booking_id, mentor_account_id, session_type, good_point, improvement_point, state
  ) VALUES (
    p_booking, actor, p_session_type, btrim(p_good), btrim(p_improvement), next_state
  )
  ON CONFLICT (booking_id) DO UPDATE
    SET session_type = EXCLUDED.session_type,
        good_point = EXCLUDED.good_point,
        improvement_point = EXCLUDED.improvement_point,
        updated_at = now()
  RETURNING * INTO row;

  INSERT INTO public.mentor_reports (
    booking_id, author_account_id, session_type, good_point, improvement_point, state
  ) VALUES (
    p_booking, actor, p_session_type, btrim(p_good), btrim(p_improvement), 'completed'
  )
  ON CONFLICT (booking_id, author_account_id) DO UPDATE
    SET session_type = EXCLUDED.session_type,
        good_point = EXCLUDED.good_point,
        improvement_point = EXCLUDED.improvement_point,
        state = 'completed',
        updated_at = now();

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'submit_mentor_log',
    'mentoring_logs',
    row.id,
    commands.request_id(),
    jsonb_build_object('bookingId', p_booking)
  );

  RETURN jsonb_build_object('id', row.id, 'state', row.state);
END;
$$;

CREATE OR REPLACE FUNCTION commands.submit_mentoring_feedback(
  p_booking uuid,
  p_questionnaire text,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  booking public.bookings%ROWTYPE;
  row public.mentoring_feedback%ROWTYPE;
  log_row public.mentoring_logs%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  IF p_questionnaire NOT IN ('alumni_mentee', 'mentor', 'parent_mentee') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND OR booking.kind IS DISTINCT FROM 'mentoring' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF actor <> booking.host_id AND actor <> booking.mentee_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF booking.session_state IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_questionnaire = 'mentor' AND actor <> booking.host_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_questionnaire IN ('alumni_mentee', 'parent_mentee') AND actor <> booking.mentee_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.mentoring_feedback (
    booking_id, author_account_id, questionnaire, answers, state
  ) VALUES (
    p_booking, actor, p_questionnaire, p_answers, 'submitted'
  )
  ON CONFLICT (booking_id, author_account_id) DO UPDATE
    SET answers = EXCLUDED.answers,
        questionnaire = EXCLUDED.questionnaire,
        updated_at = now()
  RETURNING * INTO row;

  SELECT * INTO log_row FROM public.mentoring_logs WHERE booking_id = p_booking;
  IF FOUND AND log_row.state = 'approved_awaiting_rating' AND p_questionnaire IN ('alumni_mentee', 'parent_mentee') THEN
    UPDATE public.mentoring_logs
    SET state = 'reward_eligible', updated_at = now()
    WHERE id = log_row.id AND state = 'approved_awaiting_rating';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'submit_mentoring_feedback',
    'mentoring_feedback',
    row.id,
    commands.request_id(),
    jsonb_build_object('bookingId', p_booking, 'questionnaire', p_questionnaire)
  );

  RETURN jsonb_build_object('id', row.id, 'state', row.state);
END;
$$;

CREATE OR REPLACE FUNCTION commands.session_mentoring_summary(p_booking uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  booking public.bookings%ROWTYPE;
  log_row public.mentoring_logs%ROWTYPE;
  report public.mentor_reports%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO booking FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND OR booking.kind IS DISTINCT FROM 'mentoring' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF actor <> booking.host_id AND actor <> booking.mentee_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO log_row FROM public.mentoring_logs WHERE booking_id = p_booking;
  SELECT * INTO report
  FROM public.mentor_reports
  WHERE booking_id = p_booking AND author_account_id = actor;

  RETURN jsonb_build_object(
    'bookingId', booking.id,
    'startsAt', booking.starts_at,
    'endsAt', booking.ends_at,
    'actualStartedAt', booking.actual_started_at,
    'actualEndedAt', booking.actual_ended_at,
    'sessionState', booking.session_state,
    'isMentor', booking.host_id = actor,
    'isParentMentee', commands.is_parent_account(booking.mentee_id),
    'mentorName', COALESCE(commands.display_name(booking.host_id), 'Mentor'),
    'menteeName', COALESCE(commands.display_name(booking.mentee_id), 'Mentee'),
    'logState', log_row.state,
    'sessionType', COALESCE(log_row.session_type, report.session_type),
    'goodPoint', COALESCE(report.good_point, log_row.good_point, ''),
    'improvementPoint', COALESCE(report.improvement_point, log_row.improvement_point, ''),
    'verified', log_row.state IN ('approved', 'approved_awaiting_rating', 'reward_eligible', 'credited')
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.worker_expire_mentor_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  updated integer;
BEGIN
  UPDATE public.mentoring_requests
  SET state = 'expired',
      updated_at = now(),
      version = version + 1
  WHERE state = 'requested'
    AND expires_at <= now();
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.bookings TO gsc_api_executor;
GRANT SELECT, INSERT, UPDATE ON public.booking_participants TO gsc_api_executor;
GRANT SELECT, INSERT ON public.conversations TO gsc_api_executor;
GRANT SELECT, INSERT, UPDATE ON public.conversation_members TO gsc_api_executor;
GRANT SELECT, INSERT ON public.audit_events TO gsc_api_executor;
GRANT SELECT, INSERT ON public.verification_cases TO gsc_api_executor;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION commands.worker_expire_mentor_requests() TO gsc_worker;
GRANT EXECUTE ON FUNCTION commands.list_published_mentors(jsonb) TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION commands.mentorship_leaderboard(text) TO gsc_api_executor;

