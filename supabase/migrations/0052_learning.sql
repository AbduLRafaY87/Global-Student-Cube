-- LRN-01–03 learning catalog and ADM-15 content authoring.

CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  kind text NOT NULL,
  title text NOT NULL,
  topic text NOT NULL DEFAULT '',
  category text,
  audience text NOT NULL,
  summary text NOT NULL,
  body text NOT NULL DEFAULT '',
  author_attribution text NOT NULL DEFAULT 'Global Student Cube',
  instructor text,
  duration_minutes integer,
  thumbnail_url text,
  source_urls text[] NOT NULL DEFAULT '{}',
  captions text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  media_url text,
  media_state text NOT NULL DEFAULT 'none',
  library_type text,
  file_format text,
  file_size_label text,
  event_information text NOT NULL DEFAULT '',
  named_people_consent boolean NOT NULL DEFAULT false,
  consent_evidence text NOT NULL DEFAULT '',
  provenance_verified boolean NOT NULL DEFAULT false,
  university_supplied boolean NOT NULL DEFAULT false,
  publication_state text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  CONSTRAINT content_kind_check CHECK (kind IN (
    'course', 'lesson', 'resource', 'news', 'tour', 'announcement',
    'gold_plus_invitation', 'spotlight'
  )),
  CONSTRAINT content_audience_check CHECK (audience IN (
    'students_parents', 'alumni_mentors', 'counselors', 'overall', 'marketing'
  )),
  CONSTRAINT content_category_check CHECK (
    category IS NULL OR category IN (
      'interactive_tutorials', 'career_university', 'counselor_lessons',
      'micro_learning', 'skill_development', 'parent_guidance', 'resource_library'
    )
  ),
  CONSTRAINT content_state_check CHECK (publication_state IN (
    'draft', 'submitted', 'review', 'published', 'archived', 'changes_requested', 'rejected'
  )),
  CONSTRAINT content_media_check CHECK (media_state IN ('none', 'processing', 'ready', 'failed')),
  CONSTRAINT content_library_check CHECK (
    library_type IS NULL OR library_type IN ('pdf', 'template', 'guide')
  ),
  CONSTRAINT content_title_len CHECK (char_length(title) BETWEEN 1 AND 160),
  CONSTRAINT content_summary_len CHECK (char_length(summary) BETWEEN 1 AND 600)
);

CREATE TABLE IF NOT EXISTS public.learning_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  course_id uuid NOT NULL REFERENCES public.content_items (id) ON DELETE RESTRICT,
  sort_order integer NOT NULL CHECK (sort_order > 0),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  format text NOT NULL,
  duration_minutes integer,
  captions text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  media_url text,
  media_state text NOT NULL DEFAULT 'none',
  prerequisite_lesson_id uuid REFERENCES public.learning_lessons (id) ON DELETE RESTRICT,
  required boolean NOT NULL DEFAULT true,
  CONSTRAINT lesson_format_check CHECK (format IN ('video', 'reading')),
  CONSTRAINT lesson_media_check CHECK (media_state IN ('none', 'processing', 'ready', 'failed')),
  UNIQUE (course_id, sort_order)
);

CREATE TABLE IF NOT EXISTS public.learning_progress (
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  course_id uuid NOT NULL REFERENCES public.content_items (id) ON DELETE RESTRICT,
  item_version bigint NOT NULL DEFAULT 1,
  completed_lesson_ids uuid[] NOT NULL DEFAULT '{}',
  resume_lesson_id uuid REFERENCES public.learning_lessons (id) ON DELETE RESTRICT,
  resume_position_seconds integer NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'not_started',
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, course_id),
  CONSTRAINT learning_progress_state_check CHECK (state IN ('not_started', 'in_progress', 'completed'))
);

CREATE TABLE IF NOT EXISTS public.library_saves (
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  resource_id uuid NOT NULL REFERENCES public.content_items (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, resource_id)
);

CREATE INDEX IF NOT EXISTS content_items_state_idx
  ON public.content_items (publication_state, kind, category);
CREATE INDEX IF NOT EXISTS learning_lessons_course_idx
  ON public.learning_lessons (course_id, sort_order);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'content_items', 'learning_lessons', 'learning_progress', 'library_saves'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO gsc_api_executor', tbl);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION commands.require_learning_member()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = actor) THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN actor;
END;
$$;

CREATE OR REPLACE FUNCTION commands.learning_author_kind()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  IF commands.has_staff_permission(actor, 'catalog_editorial') THEN
    RETURN 'publisher';
  END IF;
  IF commands.projected_home_role(actor) = 'counselor' THEN
    RETURN 'counselor';
  END IF;
  RAISE EXCEPTION 'FORBIDDEN';
END;
$$;

CREATE OR REPLACE FUNCTION commands.learning_audience_visible(
  p_audience text,
  p_category text,
  p_role text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT
    p_audience IN ('overall', 'marketing')
    OR (p_audience = 'students_parents' AND p_role IN ('student', 'parent'))
    OR (p_audience = 'alumni_mentors' AND p_role IN ('student', 'parent'))
    OR (p_audience = 'counselors' AND p_role IN ('counselor', 'admin'))
    OR (p_category = 'parent_guidance' AND p_role = 'parent')
$$;

CREATE OR REPLACE FUNCTION commands.learning_home(
  p_category text,
  p_audience text,
  p_search text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  role text;
  continue_row jsonb;
  courses jsonb;
  recent jsonb;
BEGIN
  actor := commands.require_learning_member();
  role := commands.projected_home_role(actor);

  SELECT jsonb_build_object(
    'courseId', c.id,
    'title', c.title,
    'lessonId', p.resume_lesson_id,
    'position', p.resume_position_seconds
  )
  INTO continue_row
  FROM public.learning_progress p
  JOIN public.content_items c ON c.id = p.course_id
  WHERE p.account_id = actor
    AND p.state = 'in_progress'
    AND c.publication_state = 'published'
  ORDER BY p.updated_at DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(item ORDER BY item ->> 'title'), '[]'::jsonb)
  INTO courses
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'author', c.author_attribution,
      'category', c.category,
      'audience', c.audience,
      'lessonCount', (SELECT count(*) FROM public.learning_lessons l WHERE l.course_id = c.id),
      'durationMinutes', c.duration_minutes,
      'progressState', COALESCE(p.state, 'not_started'),
      'completedCount', COALESCE(cardinality(p.completed_lesson_ids), 0),
      'withdrawn', false,
      'summary', c.summary
    ) AS item
    FROM public.content_items c
    LEFT JOIN public.learning_progress p
      ON p.course_id = c.id AND p.account_id = actor
    WHERE c.kind = 'course'
      AND c.publication_state = 'published'
      AND commands.learning_audience_visible(c.audience, c.category, role)
      AND (p_category IS NULL OR p_category = '' OR c.category = p_category)
      AND (p_audience IS NULL OR p_audience = '' OR c.audience = p_audience)
      AND (
        p_search IS NULL OR p_search = ''
        OR c.title ILIKE '%' || p_search || '%'
        OR c.summary ILIKE '%' || p_search || '%'
      )
  ) listed;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'kind', c.kind
  ) ORDER BY c.published_at DESC), '[]'::jsonb)
  INTO recent
  FROM (
    SELECT id, title, kind, published_at
    FROM public.content_items
    WHERE publication_state = 'published'
      AND kind IN ('course', 'resource')
      AND commands.learning_audience_visible(audience, category, role)
    ORDER BY published_at DESC NULLS LAST
    LIMIT 5
  ) c;

  RETURN jsonb_build_object(
    'continue', continue_row,
    'courses', COALESCE(courses, '[]'::jsonb),
    'recent', COALESCE(recent, '[]'::jsonb),
    'role', role
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_learning_course(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  role text;
  course public.content_items%ROWTYPE;
  lessons jsonb;
  progress public.learning_progress%ROWTYPE;
  updated boolean := false;
BEGIN
  actor := commands.require_learning_member();
  role := commands.projected_home_role(actor);
  SELECT * INTO course FROM public.content_items WHERE id = p_id AND kind = 'course';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF course.publication_state <> 'published'
     OR NOT commands.learning_audience_visible(course.audience, course.category, role) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  SELECT * INTO progress
  FROM public.learning_progress
  WHERE account_id = actor AND course_id = course.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'title', l.title,
    'sortOrder', l.sort_order,
    'format', l.format,
    'durationMinutes', l.duration_minutes,
    'body', l.body,
    'captions', l.captions,
    'transcript', l.transcript,
    'mediaUrl', l.media_url,
    'mediaState', l.media_state,
    'prerequisiteId', l.prerequisite_lesson_id,
    'required', l.required,
    'completed', COALESCE(progress.completed_lesson_ids, '{}') @> ARRAY[l.id]
  ) ORDER BY l.sort_order), '[]'::jsonb)
  INTO lessons
  FROM public.learning_lessons l
  WHERE l.course_id = course.id;

  IF progress.item_version IS NOT NULL AND course.version > progress.item_version THEN
    updated := EXISTS (
      SELECT 1 FROM public.learning_lessons l
      WHERE l.course_id = course.id
        AND l.required
        AND NOT (COALESCE(progress.completed_lesson_ids, '{}') @> ARRAY[l.id])
    );
  END IF;

  RETURN jsonb_build_object(
    'id', course.id,
    'title', course.title,
    'author', course.author_attribution,
    'summary', course.summary,
    'category', course.category,
    'audience', course.audience,
    'durationMinutes', course.duration_minutes,
    'version', course.version,
    'lessons', lessons,
    'progress', jsonb_build_object(
      'state', COALESCE(progress.state, 'not_started'),
      'resumeLessonId', progress.resume_lesson_id,
      'resumePositionSeconds', COALESCE(progress.resume_position_seconds, 0),
      'completedLessonIds', COALESCE(to_jsonb(progress.completed_lesson_ids), '[]'::jsonb)
    ),
    'updatedContentAvailable', updated,
    'accreditedClaim', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_learning_progress(
  p_course_id uuid,
  p_lesson_id uuid,
  p_position integer,
  p_complete boolean,
  p_reset boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  course public.content_items%ROWTYPE;
  lesson public.learning_lessons%ROWTYPE;
  progress public.learning_progress%ROWTYPE;
  completed uuid[];
  total integer;
  next_state text;
BEGIN
  actor := commands.require_learning_member();
  SELECT * INTO course FROM public.content_items WHERE id = p_course_id AND kind = 'course';
  IF NOT FOUND OR course.publication_state <> 'published' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF p_reset THEN
    INSERT INTO public.learning_progress (
      account_id, course_id, item_version, completed_lesson_ids, resume_lesson_id,
      resume_position_seconds, state, completed_at, updated_at
    ) VALUES (actor, course.id, course.version, '{}', NULL, 0, 'not_started', NULL, now())
    ON CONFLICT (account_id, course_id) DO UPDATE
      SET completed_lesson_ids = '{}',
          resume_lesson_id = NULL,
          resume_position_seconds = 0,
          state = 'not_started',
          completed_at = NULL,
          item_version = course.version,
          updated_at = now();
    RETURN jsonb_build_object('state', 'not_started', 'completedLessonIds', '[]'::jsonb);
  END IF;

  SELECT * INTO lesson FROM public.learning_lessons WHERE id = p_lesson_id AND course_id = course.id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF lesson.prerequisite_lesson_id IS NOT NULL THEN
    SELECT * INTO progress FROM public.learning_progress WHERE account_id = actor AND course_id = course.id;
    IF progress.account_id IS NULL
       OR NOT (progress.completed_lesson_ids @> ARRAY[lesson.prerequisite_lesson_id]) THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END IF;

  INSERT INTO public.learning_progress (
    account_id, course_id, item_version, resume_lesson_id, resume_position_seconds, state, updated_at
  ) VALUES (
    actor, course.id, course.version, lesson.id, GREATEST(p_position, 0), 'in_progress', now()
  )
  ON CONFLICT (account_id, course_id) DO UPDATE
    SET resume_lesson_id = lesson.id,
        resume_position_seconds = GREATEST(p_position, 0),
        item_version = course.version,
        updated_at = now();

  SELECT * INTO progress FROM public.learning_progress WHERE account_id = actor AND course_id = course.id;
  completed := COALESCE(progress.completed_lesson_ids, '{}');
  IF p_complete AND NOT (completed @> ARRAY[lesson.id]) THEN
    completed := completed || lesson.id;
  END IF;
  SELECT count(*)::int INTO total FROM public.learning_lessons WHERE course_id = course.id;
  IF cardinality(completed) >= total AND total > 0 THEN
    next_state := 'completed';
  ELSE
    next_state := 'in_progress';
  END IF;

  UPDATE public.learning_progress
  SET completed_lesson_ids = completed,
      state = next_state,
      completed_at = CASE WHEN next_state = 'completed' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE account_id = actor AND course_id = course.id;

  RETURN jsonb_build_object(
    'state', next_state,
    'completedLessonIds', to_jsonb(completed),
    'resumeLessonId', lesson.id,
    'resumePositionSeconds', GREATEST(p_position, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_learning_library(
  p_search text,
  p_category text,
  p_type text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  role text;
  result jsonb;
BEGIN
  actor := commands.require_learning_member();
  role := commands.projected_home_role(actor);
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'libraryType', c.library_type,
    'fileFormat', c.file_format,
    'fileSizeLabel', c.file_size_label,
    'author', c.author_attribution,
    'version', c.version,
    'saved', EXISTS (
      SELECT 1 FROM public.library_saves s
      WHERE s.account_id = actor AND s.resource_id = c.id
    )
  ) ORDER BY c.title), '[]'::jsonb)
  INTO result
  FROM public.content_items c
  WHERE c.kind = 'resource'
    AND c.publication_state = 'published'
    AND commands.learning_audience_visible(c.audience, c.category, role)
    AND (p_search IS NULL OR p_search = '' OR c.title ILIKE '%' || p_search || '%')
    AND (p_category IS NULL OR p_category = '' OR c.category = p_category)
    AND (p_type IS NULL OR p_type = '' OR c.library_type = p_type);
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_learning_resource(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  role text;
  row public.content_items%ROWTYPE;
BEGIN
  actor := commands.require_learning_member();
  role := commands.projected_home_role(actor);
  SELECT * INTO row FROM public.content_items WHERE id = p_id AND kind = 'resource';
  IF NOT FOUND OR row.publication_state <> 'published'
     OR NOT commands.learning_audience_visible(row.audience, row.category, role) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  RETURN jsonb_build_object(
    'id', row.id,
    'title', row.title,
    'summary', row.summary,
    'body', row.body,
    'author', row.author_attribution,
    'version', row.version,
    'libraryType', row.library_type,
    'fileFormat', row.file_format,
    'fileSizeLabel', row.file_size_label,
    'saved', EXISTS (
      SELECT 1 FROM public.library_saves s
      WHERE s.account_id = actor AND s.resource_id = row.id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_learning_resource(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_learning_member();
  PERFORM commands.get_learning_resource(p_id);
  INSERT INTO public.library_saves (account_id, resource_id)
  VALUES (actor, p_id)
  ON CONFLICT (account_id, resource_id) DO NOTHING;
  RETURN jsonb_build_object('saved', true);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_admin_content(p_kind text, p_state text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  kind text;
  result jsonb;
BEGIN
  kind := commands.learning_author_kind();
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'kind', c.kind,
    'title', c.title,
    'state', c.publication_state,
    'audience', c.audience,
    'category', c.category,
    'updatedAt', c.updated_at
  ) ORDER BY c.updated_at DESC), '[]'::jsonb)
  INTO result
  FROM public.content_items c
  WHERE (p_kind IS NULL OR p_kind = '' OR c.kind = p_kind)
    AND (p_state IS NULL OR p_state = '' OR c.publication_state = p_state)
    AND (
      kind = 'publisher'
      OR c.created_by = commands.actor_id()
      OR c.publication_state IN ('submitted', 'review')
    );
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_admin_content(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  kind text;
  row public.content_items%ROWTYPE;
  lessons jsonb;
BEGIN
  kind := commands.learning_author_kind();
  SELECT * INTO row FROM public.content_items WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF kind <> 'publisher' AND row.created_by <> commands.actor_id()
     AND row.publication_state NOT IN ('submitted', 'review') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'title', l.title,
    'sortOrder', l.sort_order,
    'format', l.format,
    'body', l.body,
    'transcript', l.transcript,
    'captions', l.captions
  ) ORDER BY l.sort_order), '[]'::jsonb)
  INTO lessons
  FROM public.learning_lessons l
  WHERE l.course_id = row.id;
  RETURN jsonb_build_object(
    'id', row.id,
    'kind', row.kind,
    'title', row.title,
    'topic', row.topic,
    'category', row.category,
    'audience', row.audience,
    'summary', row.summary,
    'body', row.body,
    'authorAttribution', row.author_attribution,
    'instructor', row.instructor,
    'durationMinutes', row.duration_minutes,
    'sourceUrls', to_jsonb(row.source_urls),
    'captions', row.captions,
    'transcript', row.transcript,
    'mediaUrl', row.media_url,
    'mediaState', row.media_state,
    'libraryType', row.library_type,
    'eventInformation', row.event_information,
    'namedPeopleConsent', row.named_people_consent,
    'consentEvidence', row.consent_evidence,
    'provenanceVerified', row.provenance_verified,
    'universitySupplied', row.university_supplied,
    'publicationState', row.publication_state,
    'scheduledAt', row.scheduled_at,
    'version', row.version,
    'lessons', COALESCE(lessons, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_content_item(
  p_id uuid,
  p_kind text,
  p_title text,
  p_topic text,
  p_category text,
  p_audience text,
  p_summary text,
  p_body text,
  p_author text,
  p_instructor text,
  p_duration integer,
  p_source_urls text[],
  p_captions text,
  p_transcript text,
  p_media_url text,
  p_library_type text,
  p_event_information text,
  p_named_consent boolean,
  p_consent_evidence text,
  p_university_supplied boolean,
  p_provenance_verified boolean,
  p_scheduled_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  kind text;
  row public.content_items%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  kind := commands.learning_author_kind();
  IF p_title IS NULL OR char_length(p_title) NOT BETWEEN 1 AND 160
     OR p_summary IS NULL OR char_length(p_summary) NOT BETWEEN 1 AND 600 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_title ~* '(accredited|accreditation|diploma|degree awarded|professional qualification|certificate of completion)'
     OR p_summary ~* '(accredited|accreditation|diploma|degree awarded|professional qualification|certificate of completion)' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_kind = 'gold_plus_invitation'
     AND p_body ~* '(buy tickets?|ticket sale|purchase a seat)' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.content_items (
      kind, title, topic, category, audience, summary, body, author_attribution,
      instructor, duration_minutes, source_urls, captions, transcript, media_url,
      library_type, event_information, named_people_consent, consent_evidence,
      university_supplied, provenance_verified, scheduled_at, created_by, publication_state
    ) VALUES (
      p_kind, p_title, COALESCE(p_topic, ''), NULLIF(p_category, ''), p_audience, p_summary,
      COALESCE(p_body, ''), COALESCE(p_author, 'Global Student Cube'), p_instructor,
      p_duration, COALESCE(p_source_urls, '{}'), COALESCE(p_captions, ''),
      COALESCE(p_transcript, ''), NULLIF(p_media_url, ''), NULLIF(p_library_type, ''),
      COALESCE(p_event_information, ''), COALESCE(p_named_consent, false),
      COALESCE(p_consent_evidence, ''), COALESCE(p_university_supplied, false),
      COALESCE(p_provenance_verified, false), p_scheduled_at, actor, 'draft'
    ) RETURNING * INTO row;
  ELSE
    SELECT * INTO row FROM public.content_items WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;
    IF kind <> 'publisher' AND row.created_by <> actor THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF row.publication_state = 'published' THEN
      INSERT INTO public.content_items (
        kind, title, topic, category, audience, summary, body, author_attribution,
        instructor, duration_minutes, source_urls, captions, transcript, media_url,
        library_type, event_information, named_people_consent, consent_evidence,
        university_supplied, provenance_verified, scheduled_at, created_by, publication_state
      ) VALUES (
        p_kind, p_title, COALESCE(p_topic, ''), NULLIF(p_category, ''), p_audience, p_summary,
        COALESCE(p_body, ''), COALESCE(p_author, row.author_attribution), p_instructor,
        p_duration, COALESCE(p_source_urls, '{}'), COALESCE(p_captions, ''),
        COALESCE(p_transcript, ''), NULLIF(p_media_url, ''), NULLIF(p_library_type, ''),
        COALESCE(p_event_information, ''), COALESCE(p_named_consent, false),
        COALESCE(p_consent_evidence, ''), COALESCE(p_university_supplied, false),
        COALESCE(p_provenance_verified, false), p_scheduled_at, actor, 'draft'
      ) RETURNING * INTO row;
    ELSE
      UPDATE public.content_items SET
        title = p_title,
        topic = COALESCE(p_topic, topic),
        category = COALESCE(NULLIF(p_category, ''), category),
        audience = p_audience,
        summary = p_summary,
        body = COALESCE(p_body, body),
        author_attribution = COALESCE(p_author, author_attribution),
        instructor = p_instructor,
        duration_minutes = p_duration,
        source_urls = COALESCE(p_source_urls, source_urls),
        captions = COALESCE(p_captions, captions),
        transcript = COALESCE(p_transcript, transcript),
        media_url = COALESCE(NULLIF(p_media_url, ''), media_url),
        library_type = COALESCE(NULLIF(p_library_type, ''), library_type),
        event_information = COALESCE(p_event_information, event_information),
        named_people_consent = COALESCE(p_named_consent, named_people_consent),
        consent_evidence = COALESCE(p_consent_evidence, consent_evidence),
        university_supplied = COALESCE(p_university_supplied, university_supplied),
        provenance_verified = COALESCE(p_provenance_verified, provenance_verified),
        scheduled_at = p_scheduled_at,
        version = version + 1,
        updated_at = now()
      WHERE id = row.id
      RETURNING * INTO row;
    END IF;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'upsert_content_item', 'content_items', row.id,
    commands.request_id(), jsonb_build_object('kind', row.kind, 'state', row.publication_state)
  );
  RETURN jsonb_build_object('id', row.id, 'state', row.publication_state, 'version', row.version);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_learning_lesson(
  p_id uuid,
  p_course_id uuid,
  p_sort integer,
  p_title text,
  p_body text,
  p_format text,
  p_duration integer,
  p_captions text,
  p_transcript text,
  p_media_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  course public.content_items%ROWTYPE;
  row public.learning_lessons%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  PERFORM commands.learning_author_kind();
  SELECT * INTO course FROM public.content_items WHERE id = p_course_id AND kind = 'course';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF p_format = 'video'
     AND COALESCE(p_captions, '') = ''
     AND COALESCE(p_transcript, '') = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.learning_lessons (
      course_id, sort_order, title, body, format, duration_minutes,
      captions, transcript, media_url
    ) VALUES (
      p_course_id, p_sort, p_title, COALESCE(p_body, ''), p_format, p_duration,
      COALESCE(p_captions, ''), COALESCE(p_transcript, ''), NULLIF(p_media_url, '')
    ) RETURNING * INTO row;
  ELSE
    UPDATE public.learning_lessons SET
      title = p_title,
      body = COALESCE(p_body, body),
      format = p_format,
      duration_minutes = p_duration,
      captions = COALESCE(p_captions, captions),
      transcript = COALESCE(p_transcript, transcript),
      media_url = COALESCE(NULLIF(p_media_url, ''), media_url),
      sort_order = p_sort
    WHERE id = p_id
    RETURNING * INTO row;
  END IF;
  RETURN jsonb_build_object('id', row.id, 'courseId', row.course_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.decide_content_item(
  p_id uuid,
  p_next text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  kind text;
  row public.content_items%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  kind := commands.learning_author_kind();
  IF length(trim(COALESCE(p_reason, ''))) < 1 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT * INTO row FROM public.content_items WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF p_next = 'submitted' THEN
    IF kind NOT IN ('publisher', 'counselor') OR row.publication_state NOT IN ('draft', 'changes_requested') THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF kind = 'counselor' AND row.created_by <> actor THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  ELSIF p_next IN ('review', 'published', 'changes_requested', 'rejected', 'archived') THEN
    IF kind <> 'publisher' THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  ELSE
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_next = 'published' THEN
    IF row.media_state = 'processing' THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
    IF row.university_supplied AND NOT row.provenance_verified THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
    IF row.kind = 'course' AND EXISTS (
      SELECT 1 FROM public.learning_lessons l
      WHERE l.course_id = row.id
        AND l.format = 'video'
        AND l.captions = ''
        AND l.transcript = ''
    ) THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END IF;

  UPDATE public.content_items
  SET publication_state = p_next,
      published_at = CASE WHEN p_next = 'published' THEN now() ELSE published_at END,
      version = version + 1,
      updated_at = now()
  WHERE id = row.id
  RETURNING * INTO row;

  IF p_next = 'published' AND row.kind = 'gold_plus_invitation' THEN
    INSERT INTO public.gold_plus_invitations (title, body, event_information, published)
    VALUES (row.title, row.body, row.event_information, true);
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, reason, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'decide_content_item', 'content_items', row.id,
    commands.request_id(), p_reason, jsonb_build_object('state', p_next)
  );
  RETURN jsonb_build_object('id', row.id, 'state', row.publication_state);
END;
$$;

-- SYNTHETIC launch catalog so every Module 11 category is reachable. Not reviewed rights-cleared media.
INSERT INTO public.accounts (id, auth_user_id, email_normalized, status, gsc_id)
SELECT 'aaaa1100-0001-4000-8000-0000000000ed', NULL,
       'synthetic-learning@example.invalid', 'approved', 'GSC-LRN'
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = 'aaaa1100-0001-4000-8000-0000000000ed');

INSERT INTO public.content_items (
  id, kind, title, topic, category, audience, summary, body, author_attribution,
  duration_minutes, transcript, publication_state, published_at, created_by, library_type,
  file_format, file_size_label
) VALUES
(
  'aaaa1101-0001-4000-8000-0000000000c1', 'course',
  'SYNTHETIC — Student and parent walk-through',
  'register_profile', 'interactive_tutorials', 'students_parents',
  'SYNTHETIC role tutorial: register, countries, explore, book, and track. Not an accredited award.',
  'Editorial text only. No third-party video, music, or font is bundled.',
  'SYNTHETIC editorial', 25, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  NULL, NULL, NULL
),
(
  'aaaa1101-0001-4000-8000-0000000000c2', 'course',
  'SYNTHETIC — Alumni and mentor walk-through',
  'accept_requests', 'interactive_tutorials', 'alumni_mentors',
  'SYNTHETIC role tutorial: accept requests, sessions, summaries, availability, and feedback.',
  'Editorial text only.',
  'SYNTHETIC editorial', 20, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  NULL, NULL, NULL
),
(
  'aaaa1101-0001-4000-8000-0000000000c3', 'course',
  'SYNTHETIC — Counselor walk-through',
  'view_profiles', 'interactive_tutorials', 'counselors',
  'SYNTHETIC role tutorial: profiles, assigning universities, scheduling, and tasks.',
  'Editorial text only.',
  'SYNTHETIC editorial', 20, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  NULL, NULL, NULL
),
(
  'aaaa1101-0001-4000-8000-0000000000c4', 'course',
  'SYNTHETIC — Career and university selection',
  'application_processes', 'career_university', 'students_parents',
  'SYNTHETIC course on informed academic and career decisions. Completion is not a qualification.',
  'Editorial text only.',
  'SYNTHETIC editorial', 30, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  NULL, NULL, NULL
),
(
  'aaaa1101-0001-4000-8000-0000000000c5', 'course',
  'SYNTHETIC — Counselor-led application lessons',
  'sop', 'counselor_lessons', 'students_parents',
  'SYNTHETIC counselor-led lessons on processes, SOP, and interviews. Video is transcript-first.',
  'Editorial text only.',
  'SYNTHETIC editorial', 35, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  NULL, NULL, NULL
),
(
  'aaaa1101-0001-4000-8000-0000000000c6', 'course',
  'SYNTHETIC — Micro-learning shorts',
  'scholarships', 'micro_learning', 'overall',
  'SYNTHETIC shorts on scholarships, visa preparation, budgeting, and cultural adaptation.',
  'Editorial text only.',
  'SYNTHETIC editorial', 16, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  NULL, NULL, NULL
),
(
  'aaaa1101-0001-4000-8000-0000000000c7', 'course',
  'SYNTHETIC — Skill development track',
  'communication', 'skill_development', 'students_parents',
  'SYNTHETIC track for communication, critical thinking, note taking, and time management.',
  'Editorial text only.',
  'SYNTHETIC editorial', 24, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  NULL, NULL, NULL
),
(
  'aaaa1101-0001-4000-8000-0000000000c8', 'course',
  'SYNTHETIC — Parent guidance',
  'university_selection', 'parent_guidance', 'students_parents',
  'SYNTHETIC parent guidance on selection, finances, safety, and expectations.',
  'Editorial text only. Discoverable independently from student courses.',
  'SYNTHETIC editorial', 20, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  NULL, NULL, NULL
),
(
  'aaaa1101-0001-4000-8000-0000000000d1', 'course',
  'SYNTHETIC — Unpublished counselor draft',
  'sop', 'counselor_lessons', 'students_parents',
  'SYNTHETIC draft used to prove unpublished items stay invisible.',
  'Must never appear on /learning.',
  'SYNTHETIC editorial', 10, '', 'draft', NULL, 'aaaa1100-0001-4000-8000-0000000000ed',
  NULL, NULL, NULL
),
(
  'aaaa1101-0001-4000-8000-0000000000a1', 'resource',
  'SYNTHETIC — SOP template',
  'sop', 'resource_library', 'students_parents',
  'SYNTHETIC statement-of-purpose outline. Not a university form.',
  'Heading, purpose, evidence, close. Replace with rights-cleared copy before launch.',
  'SYNTHETIC editorial', NULL, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  'template', 'txt', '2 KB'
),
(
  'aaaa1101-0001-4000-8000-0000000000a2', 'resource',
  'SYNTHETIC — Resume sample',
  'communication', 'resource_library', 'students_parents',
  'SYNTHETIC resume headings only. Not a real CV.',
  'Name, education, activities, skills. Launch copy needs rights review.',
  'SYNTHETIC editorial', NULL, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  'guide', 'txt', '2 KB'
),
(
  'aaaa1101-0001-4000-8000-0000000000a3', 'resource',
  'SYNTHETIC — Application timeline',
  'application_processes', 'resource_library', 'overall',
  'SYNTHETIC month-by-month checklist. Month-only dates stay month names.',
  'Research, tests, essays, submit. Not legal advice.',
  'SYNTHETIC editorial', NULL, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  'guide', 'txt', '2 KB'
),
(
  'aaaa1101-0001-4000-8000-0000000000a4', 'resource',
  'SYNTHETIC — Budgeting sheet',
  'budgeting', 'resource_library', 'students_parents',
  'SYNTHETIC budgeting headings. Amounts are not quotes.',
  'Tuition, housing, food, travel. Unknown costs stay Not provided.',
  'SYNTHETIC editorial', NULL, '', 'published', now(), 'aaaa1100-0001-4000-8000-0000000000ed',
  'pdf', 'txt', '2 KB'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.learning_lessons (
  id, course_id, sort_order, title, body, format, duration_minutes, transcript, media_state
) VALUES
('aaaa1102-0001-4000-8000-000000000101', 'aaaa1101-0001-4000-8000-0000000000c1', 1, 'How to register and complete a profile', 'SYNTHETIC steps for signup, email verification, and Module 2 fields.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-000000000102', 'aaaa1101-0001-4000-8000-0000000000c1', 2, 'How to select preferred countries', 'SYNTHETIC: three ordered countries or the available catalog count.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-000000000103', 'aaaa1101-0001-4000-8000-0000000000c1', 3, 'How to explore university matches', 'SYNTHETIC: recommendations wait for a complete academic profile.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-000000000104', 'aaaa1101-0001-4000-8000-0000000000c1', 4, 'How to book mentoring or counselor sessions', 'SYNTHETIC: 30-minute virtual sessions. Booking UI may still be incomplete.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-000000000105', 'aaaa1101-0001-4000-8000-0000000000c1', 5, 'How to track applications', 'SYNTHETIC: groups belong to an application system. Not a submission portal.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-000000000106', 'aaaa1101-0001-4000-8000-0000000000c2', 1, 'How to accept mentoring requests', 'SYNTHETIC: accept grants no finance access.', 'reading', 4, '', 'none'),
('aaaa1102-0001-4000-8000-000000000107', 'aaaa1101-0001-4000-8000-0000000000c2', 2, 'How to conduct sessions', 'SYNTHETIC: one active mentoring booking, separate from counseling.', 'reading', 4, '', 'none'),
('aaaa1102-0001-4000-8000-000000000108', 'aaaa1101-0001-4000-8000-0000000000c2', 3, 'How to submit a session summary', 'SYNTHETIC: mutual questionnaires after the session.', 'reading', 4, '', 'none'),
('aaaa1102-0001-4000-8000-000000000109', 'aaaa1101-0001-4000-8000-0000000000c2', 4, 'How to update availability', 'SYNTHETIC: availability is authored, not inferred.', 'reading', 4, '', 'none'),
('aaaa1102-0001-4000-8000-00000000010a', 'aaaa1101-0001-4000-8000-0000000000c2', 5, 'How to rate work', 'SYNTHETIC: ratings stay on completed attended sessions.', 'reading', 4, '', 'none'),
('aaaa1102-0001-4000-8000-00000000010b', 'aaaa1101-0001-4000-8000-0000000000c3', 1, 'How to view student profiles', 'SYNTHETIC: grant-scoped only.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-00000000010c', 'aaaa1101-0001-4000-8000-0000000000c3', 2, 'How to assign universities', 'SYNTHETIC: assignment is a task, not an admission decision.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-00000000010d', 'aaaa1101-0001-4000-8000-0000000000c3', 3, 'How to schedule appointments', 'SYNTHETIC: 30 minutes plus a 15-minute buffer.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-00000000010e', 'aaaa1101-0001-4000-8000-0000000000c3', 4, 'How to manage tasks', 'SYNTHETIC: awaiting date when no due date is stored.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-00000000010f', 'aaaa1101-0001-4000-8000-0000000000c4', 1, 'Choosing a field and destination', 'SYNTHETIC decision prompts. Not an admission probability.', 'reading', 15, '', 'none'),
('aaaa1102-0001-4000-8000-000000000110', 'aaaa1101-0001-4000-8000-0000000000c4', 2, 'Comparing published costs', 'SYNTHETIC: annual comparison is never total cost of attendance.', 'reading', 15, '', 'none'),
('aaaa1102-0001-4000-8000-000000000111', 'aaaa1101-0001-4000-8000-0000000000c5', 1, 'Application processes and timelines', 'Use the transcript if video is unavailable.', 'video', 12, 'SYNTHETIC transcript: map system deadlines. A month-only deadline stays a month name.', 'failed'),
('aaaa1102-0001-4000-8000-000000000112', 'aaaa1101-0001-4000-8000-0000000000c5', 2, 'Statement of purpose', 'Transcript-first SOP lesson.', 'video', 12, 'SYNTHETIC transcript: purpose, evidence, close. Watching this cannot award points.', 'failed'),
('aaaa1102-0001-4000-8000-000000000113', 'aaaa1101-0001-4000-8000-0000000000c5', 3, 'Interview skills', 'Transcript-first interview lesson.', 'video', 11, 'SYNTHETIC transcript: practise answers. This is not a professional qualification.', 'failed'),
('aaaa1102-0001-4000-8000-000000000114', 'aaaa1101-0001-4000-8000-0000000000c6', 1, 'Scholarships', 'SYNTHETIC short. Bookmarks are not funding.', 'reading', 4, '', 'none'),
('aaaa1102-0001-4000-8000-000000000115', 'aaaa1101-0001-4000-8000-0000000000c6', 2, 'Visa preparation', 'SYNTHETIC editorial visa notes, not a filing service.', 'reading', 4, '', 'none'),
('aaaa1102-0001-4000-8000-000000000116', 'aaaa1101-0001-4000-8000-0000000000c6', 3, 'Budgeting', 'SYNTHETIC: unknown costs stay Not provided.', 'reading', 4, '', 'none'),
('aaaa1102-0001-4000-8000-000000000117', 'aaaa1101-0001-4000-8000-0000000000c6', 4, 'Cultural adaptation', 'SYNTHETIC settling-in notes.', 'reading', 4, '', 'none'),
('aaaa1102-0001-4000-8000-000000000118', 'aaaa1101-0001-4000-8000-0000000000c7', 1, 'Communication', 'SYNTHETIC practice prompts.', 'reading', 6, '', 'none'),
('aaaa1102-0001-4000-8000-000000000119', 'aaaa1101-0001-4000-8000-0000000000c7', 2, 'Critical thinking', 'SYNTHETIC prompts. No exam.', 'reading', 6, '', 'none'),
('aaaa1102-0001-4000-8000-00000000011a', 'aaaa1101-0001-4000-8000-0000000000c7', 3, 'Note taking', 'SYNTHETIC method outline.', 'reading', 6, '', 'none'),
('aaaa1102-0001-4000-8000-00000000011b', 'aaaa1101-0001-4000-8000-0000000000c7', 4, 'Time management', 'SYNTHETIC planning outline.', 'reading', 6, '', 'none'),
('aaaa1102-0001-4000-8000-00000000011c', 'aaaa1101-0001-4000-8000-0000000000c8', 1, 'University selection for parents', 'SYNTHETIC parent view. Independently discoverable.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-00000000011d', 'aaaa1101-0001-4000-8000-0000000000c8', 2, 'Finances', 'SYNTHETIC: declined savings never invent readiness.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-00000000011e', 'aaaa1101-0001-4000-8000-0000000000c8', 3, 'Safety', 'SYNTHETIC safety questions to ask, not a guarantee.', 'reading', 5, '', 'none'),
('aaaa1102-0001-4000-8000-00000000011f', 'aaaa1101-0001-4000-8000-0000000000c8', 4, 'Expectations', 'SYNTHETIC family-expectation prompts.', 'reading', 5, '', 'none')
ON CONFLICT (id) DO NOTHING;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
