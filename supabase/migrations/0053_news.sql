-- Module 12 news, PUB-06 stories, ADM-11 moderation.

ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_kind_check;
ALTER TABLE public.content_items ADD CONSTRAINT content_kind_check CHECK (kind IN (
  'course', 'lesson', 'resource', 'news', 'tour', 'announcement',
  'gold_plus_invitation', 'spotlight', 'story'
));

ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_state_check;
ALTER TABLE public.content_items ADD CONSTRAINT content_state_check CHECK (publication_state IN (
  'draft', 'submitted', 'review', 'published', 'archived', 'changes_requested',
  'rejected', 'withdrawn', 'consent_check', 'admin_review'
));

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS related_university_id uuid,
  ADD COLUMN IF NOT EXISTS related_program_id uuid,
  ADD COLUMN IF NOT EXISTS related_scholarship_id uuid,
  ADD COLUMN IF NOT EXISTS publication_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS name_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS spotlight_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentor_named boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentor_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_named boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subject_account_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS content_items_slug_uidx
  ON public.content_items (slug)
  WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_items_news_idx
  ON public.content_items (kind, publication_state, topic, published_at DESC);

CREATE TABLE IF NOT EXISTS public.news_engagements (
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  item_id uuid NOT NULL REFERENCES public.content_items (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, item_id, kind),
  CONSTRAINT news_engagement_kind_check CHECK (kind IN ('save', 'like'))
);

CREATE TABLE IF NOT EXISTS public.topic_follows (
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  topic text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, topic)
);

CREATE TABLE IF NOT EXISTS public.moderation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  queue_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  redacted_context text NOT NULL DEFAULT '',
  consent_evidence text NOT NULL DEFAULT '',
  coaching_correction text NOT NULL DEFAULT '',
  prior_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision text,
  participant_response text NOT NULL DEFAULT '',
  private_notes text NOT NULL DEFAULT '',
  assigned_to uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  is_protected boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  resolved_at timestamptz,
  revision_reason text NOT NULL DEFAULT '',
  CONSTRAINT moderation_queue_check CHECK (queue_type IN (
    'news', 'story', 'message_report', 'held_feedback', 'safety'
  )),
  CONSTRAINT moderation_severity_check CHECK (severity IN ('low', 'medium', 'high')),
  CONSTRAINT moderation_status_check CHECK (status IN (
    'open', 'in_review', 'resolved', 'escalated', 'revision_requested'
  )),
  UNIQUE (resource_type, resource_id)
);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'news_engagements', 'topic_follows', 'moderation_reviews'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO gsc_api_executor', tbl);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION commands.optional_actor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  raw text;
  sub text;
BEGIN
  raw := nullif(current_setting('request.jwt.claims', true), '');
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;
  sub := raw::jsonb ->> 'sub';
  IF sub IS NULL OR sub = '' THEN
    RETURN NULL;
  END IF;
  RETURN sub::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION commands.news_is_public(p_state text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_state = 'published';
$$;

CREATE OR REPLACE FUNCTION commands.story_publish_allowed(p_row public.content_items)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_row.publication_consent
    AND (p_row.kind <> 'spotlight' OR p_row.spotlight_consent)
    AND (NOT p_row.mentor_named OR p_row.mentor_consent)
    AND (NOT p_row.parent_named OR p_row.parent_consent);
$$;

CREATE OR REPLACE FUNCTION commands.enqueue_moderation(
  p_queue text,
  p_resource_type text,
  p_resource_id uuid,
  p_title text,
  p_context text,
  p_consent text,
  p_protected boolean,
  p_actor uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  review_id uuid;
BEGIN
  INSERT INTO public.moderation_reviews (
    queue_type, resource_type, resource_id, title, redacted_context,
    consent_evidence, is_protected, created_by, status
  ) VALUES (
    p_queue, p_resource_type, p_resource_id, COALESCE(p_title, ''),
    COALESCE(p_context, ''), COALESCE(p_consent, ''), COALESCE(p_protected, false),
    p_actor, 'open'
  )
  ON CONFLICT (resource_type, resource_id) DO UPDATE SET
    title = EXCLUDED.title,
    redacted_context = EXCLUDED.redacted_context,
    updated_at = now(),
    status = CASE
      WHEN public.moderation_reviews.status = 'resolved' THEN 'open'
      ELSE public.moderation_reviews.status
    END
  RETURNING id INTO review_id;
  RETURN review_id;
END;
$$;

CREATE OR REPLACE FUNCTION commands.news_card(p_row public.content_items)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', p_row.id,
    'kind', p_row.kind,
    'title', p_row.title,
    'topic', p_row.topic,
    'summary', p_row.summary,
    'author', p_row.author_attribution,
    'publishedAt', p_row.published_at,
    'eventDate', p_row.event_date,
    'sourceUrl', COALESCE(p_row.source_urls[1], ''),
    'country', p_row.country_code
  );
$$;

CREATE OR REPLACE FUNCTION commands.news_feed(
  p_tab text,
  p_topic text,
  p_search text,
  p_page integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  page integer := GREATEST(COALESCE(p_page, 1), 1);
  page_size integer := 20;
  items jsonb;
  follows jsonb;
BEGIN
  actor := commands.optional_actor_id();
  SELECT COALESCE(jsonb_agg(commands.news_card(c) ORDER BY c.published_at DESC), '[]'::jsonb)
  INTO items
  FROM (
    SELECT c.*
    FROM public.content_items c
    WHERE c.kind = 'news'
      AND commands.news_is_public(c.publication_state)
      AND (NULLIF(p_topic, '') IS NULL OR c.topic = p_topic)
      AND (
        NULLIF(p_search, '') IS NULL
        OR c.title ILIKE '%' || p_search || '%'
        OR c.summary ILIKE '%' || p_search || '%'
      )
      AND (
        COALESCE(p_tab, 'all') = 'all'
        OR (
          p_tab = 'following' AND actor IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.topic_follows f
            WHERE f.account_id = actor AND f.topic = c.topic
          )
        )
        OR (
          p_tab = 'saved' AND actor IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.news_engagements e
            WHERE e.account_id = actor AND e.item_id = c.id AND e.kind = 'save'
          )
        )
      )
    ORDER BY c.published_at DESC
    OFFSET (page - 1) * page_size
    LIMIT page_size
  ) c;

  SELECT COALESCE(jsonb_agg(f.topic ORDER BY f.topic), '[]'::jsonb)
  INTO follows
  FROM public.topic_follows f
  WHERE actor IS NOT NULL AND f.account_id = actor;

  RETURN jsonb_build_object(
    'items', COALESCE(items, '[]'::jsonb),
    'followedTopics', COALESCE(follows, '[]'::jsonb),
    'page', page,
    'whatsAppEnabled', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_news_article(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.content_items%ROWTYPE;
  saved boolean := false;
  liked boolean := false;
  following boolean := false;
BEGIN
  actor := commands.optional_actor_id();
  SELECT * INTO row FROM public.content_items WHERE id = p_id AND kind = 'news';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('unavailable', true, 'message', 'This update is no longer available.');
  END IF;
  IF NOT commands.news_is_public(row.publication_state) THEN
    IF actor IS NULL OR row.created_by <> actor THEN
      RETURN jsonb_build_object('unavailable', true, 'message', 'This update is no longer available.');
    END IF;
  END IF;
  IF actor IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.news_engagements e
      WHERE e.account_id = actor AND e.item_id = row.id AND e.kind = 'save'
    ) INTO saved;
    SELECT EXISTS (
      SELECT 1 FROM public.news_engagements e
      WHERE e.account_id = actor AND e.item_id = row.id AND e.kind = 'like'
    ) INTO liked;
    SELECT EXISTS (
      SELECT 1 FROM public.topic_follows f
      WHERE f.account_id = actor AND f.topic = row.topic
    ) INTO following;
  END IF;
  RETURN jsonb_build_object(
    'id', row.id,
    'title', row.title,
    'topic', row.topic,
    'summary', row.summary,
    'body', row.body,
    'author', row.author_attribution,
    'publishedAt', row.published_at,
    'eventDate', row.event_date,
    'sourceUrl', COALESCE(row.source_urls[1], ''),
    'sourceUrls', to_jsonb(row.source_urls),
    'captions', row.captions,
    'mediaUrl', row.media_url,
    'relatedUniversityId', row.related_university_id,
    'relatedScholarshipId', row.related_scholarship_id,
    'state', row.publication_state,
    'saved', saved,
    'liked', liked,
    'following', following,
    'deadlineDisclaimer', 'Editorial dates are not official application deadlines.',
    'shareUrl', '/news/' || row.id::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.toggle_news_engagement(
  p_id uuid,
  p_kind text,
  p_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.content_items%ROWTYPE;
BEGIN
  actor := commands.require_learning_member();
  IF p_kind NOT IN ('save', 'like') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT * INTO row FROM public.content_items WHERE id = p_id AND kind IN ('news', 'story', 'spotlight');
  IF NOT FOUND OR NOT commands.news_is_public(row.publication_state) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF COALESCE(p_enabled, true) THEN
    INSERT INTO public.news_engagements (account_id, item_id, kind)
    VALUES (actor, row.id, p_kind)
    ON CONFLICT (account_id, item_id, kind) DO NOTHING;
  ELSE
    DELETE FROM public.news_engagements
    WHERE account_id = actor AND item_id = row.id AND kind = p_kind;
  END IF;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'toggle_news_engagement', 'content_items', row.id,
    commands.request_id(), jsonb_build_object('kind', p_kind, 'enabled', COALESCE(p_enabled, true))
  );
  RETURN jsonb_build_object(
    'id', row.id,
    'kind', p_kind,
    'enabled', EXISTS (
      SELECT 1 FROM public.news_engagements e
      WHERE e.account_id = actor AND e.item_id = row.id AND e.kind = p_kind
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.follow_news_topic(p_topic text, p_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_learning_member();
  IF p_topic NOT IN (
    'admissions_requirement_changes', 'new_scholarships', 'education_fairs',
    'new_programs', 'application_deadlines', 'intakes', 'open_days',
    'early_bird_scholarships', 'deadline_reminders', 'eligibility_alerts',
    'new_app_features', 'system_improvements', 'webinars_workshops',
    'alumni_success', 'mentorship_updates'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF COALESCE(p_enabled, true) THEN
    INSERT INTO public.topic_follows (account_id, topic)
    VALUES (actor, p_topic)
    ON CONFLICT (account_id, topic) DO NOTHING;
  ELSE
    DELETE FROM public.topic_follows WHERE account_id = actor AND topic = p_topic;
  END IF;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'follow_news_topic', 'topic_follows', actor,
    commands.request_id(), jsonb_build_object('topic', p_topic, 'enabled', COALESCE(p_enabled, true), 'whatsApp', false)
  );
  RETURN jsonb_build_object(
    'topic', p_topic,
    'following', EXISTS (
      SELECT 1 FROM public.topic_follows f WHERE f.account_id = actor AND f.topic = p_topic
    ),
    'whatsAppEnabled', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_counselor_news(
  p_id uuid,
  p_title text,
  p_summary text,
  p_topic text,
  p_body text,
  p_source_url text,
  p_related_university uuid,
  p_related_scholarship uuid,
  p_captions text,
  p_rights_declaration text,
  p_submit boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.content_items%ROWTYPE;
  factual boolean;
BEGIN
  actor := commands.actor_id();
  IF commands.projected_home_role(actor) <> 'counselor'
     AND NOT commands.has_staff_permission(actor, 'catalog_editorial') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_title IS NULL OR char_length(p_title) NOT BETWEEN 1 AND 160
     OR p_summary IS NULL OR char_length(p_summary) NOT BETWEEN 1 AND 280 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_topic NOT IN (
    'admissions_requirement_changes', 'new_scholarships', 'education_fairs',
    'new_programs', 'application_deadlines', 'intakes', 'open_days',
    'early_bird_scholarships', 'deadline_reminders', 'eligibility_alerts',
    'new_app_features', 'system_improvements', 'webinars_workshops',
    'alumni_success', 'mentorship_updates'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  factual := p_topic IN (
    'admissions_requirement_changes', 'new_scholarships', 'education_fairs',
    'new_programs', 'application_deadlines', 'intakes', 'open_days',
    'early_bird_scholarships', 'deadline_reminders', 'eligibility_alerts'
  );
  IF factual AND (p_source_url IS NULL OR p_source_url !~* '^https?://') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.content_items (
      kind, title, topic, audience, summary, body, author_attribution, source_urls,
      captions, consent_evidence, created_by, publication_state
    ) VALUES (
      'news', p_title, p_topic, 'overall', p_summary, COALESCE(p_body, ''),
      'Counselor submission',
      CASE WHEN NULLIF(p_source_url, '') IS NULL THEN '{}' ELSE ARRAY[p_source_url] END,
      COALESCE(p_captions, ''), COALESCE(p_rights_declaration, ''), actor, 'draft'
    ) RETURNING * INTO row;
  ELSE
    SELECT * INTO row FROM public.content_items WHERE id = p_id AND kind = 'news' FOR UPDATE;
    IF NOT FOUND OR (row.created_by <> actor AND NOT commands.has_staff_permission(actor, 'catalog_editorial')) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF row.publication_state = 'published' THEN
      INSERT INTO public.content_items (
        kind, title, topic, audience, summary, body, author_attribution, source_urls,
        captions, consent_evidence, created_by, publication_state
      ) VALUES (
        'news', p_title, p_topic, 'overall', p_summary, COALESCE(p_body, ''),
        row.author_attribution,
        CASE WHEN NULLIF(p_source_url, '') IS NULL THEN '{}' ELSE ARRAY[p_source_url] END,
        COALESCE(p_captions, ''), COALESCE(p_rights_declaration, ''), actor, 'draft'
      ) RETURNING * INTO row;
    ELSE
      UPDATE public.content_items SET
        title = p_title,
        topic = p_topic,
        summary = p_summary,
        body = COALESCE(p_body, body),
        source_urls = CASE WHEN NULLIF(p_source_url, '') IS NULL THEN source_urls ELSE ARRAY[p_source_url] END,
        captions = COALESCE(p_captions, captions),
        consent_evidence = COALESCE(p_rights_declaration, consent_evidence),
        related_university_id = p_related_university,
        related_scholarship_id = p_related_scholarship,
        version = version + 1,
        updated_at = now()
      WHERE id = row.id
      RETURNING * INTO row;
    END IF;
  END IF;

  IF p_submit THEN
    UPDATE public.content_items
    SET publication_state = 'submitted', version = version + 1, updated_at = now()
    WHERE id = row.id
    RETURNING * INTO row;
    PERFORM commands.enqueue_moderation(
      'news', 'content_items', row.id, row.title, left(row.summary, 280),
      row.consent_evidence, false, actor
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'upsert_counselor_news', 'content_items', row.id,
    commands.request_id(), jsonb_build_object('state', row.publication_state, 'submitted', p_submit)
  );
  RETURN jsonb_build_object('id', row.id, 'state', row.publication_state);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_counselor_news()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  items jsonb;
BEGIN
  actor := commands.actor_id();
  IF commands.projected_home_role(actor) <> 'counselor'
     AND NOT commands.has_staff_permission(actor, 'catalog_editorial') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'topic', c.topic,
    'state', c.publication_state,
    'summary', c.summary,
    'updatedAt', c.updated_at
  ) ORDER BY c.updated_at DESC), '[]'::jsonb)
  INTO items
  FROM public.content_items c
  WHERE c.kind = 'news'
    AND (c.created_by = actor OR commands.has_staff_permission(actor, 'catalog_editorial'));
  RETURN jsonb_build_object('items', COALESCE(items, '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION commands.submit_success_story(
  p_id uuid,
  p_title text,
  p_body text,
  p_country text,
  p_topic text,
  p_publication_consent boolean,
  p_name_consent boolean,
  p_image_consent boolean,
  p_spotlight_consent boolean,
  p_mentor_named boolean,
  p_mentor_consent boolean,
  p_parent_named boolean,
  p_parent_consent boolean,
  p_submit boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.content_items%ROWTYPE;
  v_kind text;
BEGIN
  actor := commands.require_learning_member();
  IF p_title IS NULL OR char_length(p_title) NOT BETWEEN 1 AND 160
     OR p_body IS NULL OR char_length(p_body) NOT BETWEEN 1 AND 3000 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  v_kind := CASE WHEN COALESCE(p_spotlight_consent, false) THEN 'spotlight' ELSE 'story' END;
  IF p_id IS NULL THEN
    INSERT INTO public.content_items (
      kind, title, topic, audience, summary, body, author_attribution, created_by,
      publication_state, publication_consent, name_consent, image_consent,
      spotlight_consent, mentor_named, mentor_consent, parent_named, parent_consent,
      subject_account_id, country_code, named_people_consent
    ) VALUES (
      v_kind, p_title, COALESCE(NULLIF(p_topic, ''), 'alumni_success'), 'overall',
      left(p_body, 280), p_body, 'Member submission', actor, 'draft',
      COALESCE(p_publication_consent, false), COALESCE(p_name_consent, false),
      COALESCE(p_image_consent, false), COALESCE(p_spotlight_consent, false),
      COALESCE(p_mentor_named, false), COALESCE(p_mentor_consent, false),
      COALESCE(p_parent_named, false), COALESCE(p_parent_consent, false),
      actor, COALESCE(p_country, ''), COALESCE(p_name_consent, false)
    ) RETURNING * INTO row;
  ELSE
    SELECT * INTO row FROM public.content_items
    WHERE id = p_id AND kind IN ('story', 'spotlight') FOR UPDATE;
    IF NOT FOUND OR row.subject_account_id IS DISTINCT FROM actor AND row.created_by <> actor THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    UPDATE public.content_items SET
      kind = v_kind,
      title = p_title,
      topic = COALESCE(NULLIF(p_topic, ''), topic),
      summary = left(p_body, 280),
      body = p_body,
      publication_consent = COALESCE(p_publication_consent, publication_consent),
      name_consent = COALESCE(p_name_consent, name_consent),
      image_consent = COALESCE(p_image_consent, image_consent),
      spotlight_consent = COALESCE(p_spotlight_consent, spotlight_consent),
      mentor_named = COALESCE(p_mentor_named, mentor_named),
      mentor_consent = COALESCE(p_mentor_consent, mentor_consent),
      parent_named = COALESCE(p_parent_named, parent_named),
      parent_consent = COALESCE(p_parent_consent, parent_consent),
      country_code = COALESCE(p_country, country_code),
      version = version + 1,
      updated_at = now()
    WHERE id = row.id
    RETURNING * INTO row;
  END IF;

  IF p_submit THEN
    IF NOT row.publication_consent THEN
      RAISE EXCEPTION 'SUBJECT_CONSENT_REQUIRED';
    END IF;
    UPDATE public.content_items
    SET publication_state = CASE
          WHEN commands.story_publish_allowed(row) THEN 'consent_check'
          ELSE 'submitted'
        END,
        version = version + 1,
        updated_at = now()
    WHERE id = row.id
    RETURNING * INTO row;
    PERFORM commands.enqueue_moderation(
      CASE WHEN row.kind = 'spotlight' THEN 'story' ELSE 'story' END,
      'content_items', row.id, row.title, left(row.body, 280),
      'publication=' || row.publication_consent::text, false, actor
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'submit_success_story', 'content_items', row.id,
    commands.request_id(), jsonb_build_object('state', row.publication_state)
  );
  RETURN jsonb_build_object('id', row.id, 'state', row.publication_state);
END;
$$;

CREATE OR REPLACE FUNCTION commands.withdraw_success_story(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.content_items%ROWTYPE;
BEGIN
  actor := commands.require_learning_member();
  SELECT * INTO row FROM public.content_items
  WHERE id = p_id AND kind IN ('story', 'spotlight') FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.subject_account_id IS DISTINCT FROM actor
     AND row.created_by <> actor
     AND NOT commands.has_staff_permission(actor, 'catalog_editorial') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.content_items
  SET publication_state = 'withdrawn',
      withdrawn_at = now(),
      publication_consent = false,
      version = version + 1,
      updated_at = now()
  WHERE id = row.id
  RETURNING * INTO row;
  UPDATE public.moderation_reviews
  SET status = 'resolved', decision = 'remove', updated_at = now(), resolved_at = now()
  WHERE resource_type = 'content_items' AND resource_id = row.id;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'withdraw_success_story', 'content_items', row.id,
    commands.request_id(), jsonb_build_object('state', 'withdrawn')
  );
  RETURN jsonb_build_object('id', row.id, 'state', 'withdrawn');
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_public_stories(p_country text, p_topic text, p_search text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  items jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'kind', c.kind,
    'title', c.title,
    'excerpt', c.summary,
    'publishedAt', c.published_at,
    'country', c.country_code,
    'topic', c.topic,
    'attribution', CASE WHEN c.name_consent THEN c.author_attribution ELSE NULL END,
    'spotlight', c.kind = 'spotlight'
  ) ORDER BY (c.kind = 'spotlight') DESC, c.published_at DESC), '[]'::jsonb)
  INTO items
  FROM (
    SELECT c.*
    FROM public.content_items c
    WHERE c.kind IN ('story', 'spotlight')
      AND commands.news_is_public(c.publication_state)
      AND c.publication_consent
      AND (NULLIF(p_country, '') IS NULL OR c.country_code = p_country)
      AND (NULLIF(p_topic, '') IS NULL OR c.topic = p_topic)
      AND (
        NULLIF(p_search, '') IS NULL
        OR c.title ILIKE '%' || p_search || '%'
        OR c.summary ILIKE '%' || p_search || '%'
      )
    ORDER BY (c.kind = 'spotlight') DESC, c.published_at DESC
    LIMIT 40
  ) c;
  RETURN jsonb_build_object('items', COALESCE(items, '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_public_story(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  row public.content_items%ROWTYPE;
BEGIN
  SELECT * INTO row FROM public.content_items
  WHERE id = p_id AND kind IN ('story', 'spotlight');
  IF NOT FOUND
     OR NOT commands.news_is_public(row.publication_state)
     OR NOT row.publication_consent THEN
    RETURN jsonb_build_object(
      'unavailable', true,
      'message', 'This story is no longer available.'
    );
  END IF;
  RETURN jsonb_build_object(
    'id', row.id,
    'kind', row.kind,
    'title', row.title,
    'body', row.body,
    'publishedAt', row.published_at,
    'country', row.country_code,
    'topic', row.topic,
    'attribution', CASE WHEN row.name_consent THEN row.author_attribution ELSE NULL END,
    'imageAllowed', row.image_consent,
    'spotlight', row.kind = 'spotlight',
    'shareUrl', '/stories?story=' || row.id::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.sync_moderation_sources()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  INSERT INTO public.moderation_reviews (
    queue_type, resource_type, resource_id, title, redacted_context, consent_evidence,
    is_protected, status
  )
  SELECT
    CASE WHEN c.kind = 'news' THEN 'news' ELSE 'story' END,
    'content_items', c.id, c.title, left(c.summary, 280),
    COALESCE(c.consent_evidence, ''), false, 'open'
  FROM public.content_items c
  WHERE c.kind IN ('news', 'story', 'spotlight')
    AND c.publication_state IN ('submitted', 'review', 'consent_check', 'admin_review')
  ON CONFLICT (resource_type, resource_id) DO NOTHING;

  INSERT INTO public.moderation_reviews (
    queue_type, resource_type, resource_id, title, redacted_context, is_protected, status
  )
  SELECT
    CASE WHEN EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.safety_report_id = s.id AND cr.reason_category = 'Safety'
    ) THEN 'safety' ELSE 'message_report' END,
    'safety_reports', s.id,
    'Reported conversation',
    left(COALESCE(s.evidence ->> 'detail', ''), 280),
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.safety_report_id = s.id AND cr.reason_category = 'Safety'
    ),
    'open'
  FROM public.safety_reports s
  WHERE s.state IN ('open', 'reviewing')
  ON CONFLICT (resource_type, resource_id) DO NOTHING;

  INSERT INTO public.moderation_reviews (
    queue_type, resource_type, resource_id, title, redacted_context, is_protected, status
  )
  SELECT
    'held_feedback', 'feedback_responses', f.id, 'Held session feedback',
    'Feedback held for quality review.', false, 'open'
  FROM public.feedback_responses f
  WHERE f.publication_state = 'held'
  ON CONFLICT (resource_type, resource_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_moderation_queue(
  p_queue text,
  p_severity text,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  has_safety boolean;
  items jsonb;
BEGIN
  actor := commands.require_privileged_admin();
  IF NOT (
    commands.has_staff_permission(actor, 'catalog_editorial')
    OR commands.has_staff_permission(actor, 'safety')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  has_safety := commands.has_staff_permission(actor, 'safety');
  PERFORM commands.sync_moderation_sources();

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'queue', r.queue_type,
    'severity', r.severity,
    'status', r.status,
    'title', r.title,
    'protected', r.is_protected,
    'createdAt', r.created_at
  ) ORDER BY r.created_at ASC), '[]'::jsonb)
  INTO items
  FROM public.moderation_reviews r
  WHERE (NULLIF(p_queue, '') IS NULL OR r.queue_type = p_queue)
    AND (NULLIF(p_severity, '') IS NULL OR r.severity = p_severity)
    AND (NULLIF(p_status, '') IS NULL OR r.status = p_status)
    AND (has_safety OR NOT r.is_protected);

  RETURN jsonb_build_object('items', COALESCE(items, '[]'::jsonb), 'canReadSafety', has_safety);
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_moderation_review(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  has_safety boolean;
  row public.moderation_reviews%ROWTYPE;
  content public.content_items%ROWTYPE;
BEGIN
  actor := commands.require_privileged_admin();
  IF NOT (
    commands.has_staff_permission(actor, 'catalog_editorial')
    OR commands.has_staff_permission(actor, 'safety')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  has_safety := commands.has_staff_permission(actor, 'safety');
  SELECT * INTO row FROM public.moderation_reviews WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.is_protected AND NOT has_safety THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF row.resource_type = 'content_items' THEN
    SELECT * INTO content FROM public.content_items WHERE id = row.resource_id;
  END IF;
  RETURN jsonb_build_object(
    'id', row.id,
    'queue', row.queue_type,
    'severity', row.severity,
    'status', row.status,
    'title', row.title,
    'context', row.redacted_context,
    'consentEvidence', row.consent_evidence,
    'coachingCorrection', row.coaching_correction,
    'priorActions', row.prior_actions,
    'participantResponse', row.participant_response,
    'privateNotes', row.private_notes,
    'protected', row.is_protected,
    'resourceType', row.resource_type,
    'resourceId', row.resource_id,
    'publicationConsent', content.publication_consent,
    'spotlightConsent', content.spotlight_consent,
    'nameConsent', content.name_consent,
    'contentState', content.publication_state,
    'body', CASE WHEN row.queue_type IN ('news', 'story') THEN content.body ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.decide_moderation(
  p_id uuid,
  p_decision text,
  p_response text,
  p_notes text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.moderation_reviews%ROWTYPE;
  content public.content_items%ROWTYPE;
  next_status text;
BEGIN
  actor := commands.require_privileged_admin();
  IF NOT (
    commands.has_staff_permission(actor, 'catalog_editorial')
    OR commands.has_staff_permission(actor, 'safety')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_decision NOT IN ('approved', 'publish', 'remove', 'restrict', 'request_revision', 'escalate') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 1 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT * INTO row FROM public.moderation_reviews WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.is_protected AND NOT commands.has_staff_permission(actor, 'safety') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  next_status := CASE p_decision
    WHEN 'escalate' THEN 'escalated'
    WHEN 'request_revision' THEN 'revision_requested'
    ELSE 'resolved'
  END;

  IF row.resource_type = 'content_items' THEN
    SELECT * INTO content FROM public.content_items WHERE id = row.resource_id FOR UPDATE;
    IF p_decision = 'publish' THEN
      IF content.kind IN ('story', 'spotlight') AND NOT commands.story_publish_allowed(content) THEN
        RAISE EXCEPTION 'SUBJECT_CONSENT_REQUIRED';
      END IF;
      UPDATE public.content_items
      SET publication_state = 'published', published_at = now(), version = version + 1, updated_at = now()
      WHERE id = content.id;
    ELSIF p_decision IN ('remove', 'restrict') THEN
      UPDATE public.content_items
      SET publication_state = 'withdrawn', withdrawn_at = now(), version = version + 1, updated_at = now()
      WHERE id = content.id;
    ELSIF p_decision = 'request_revision' THEN
      UPDATE public.content_items
      SET publication_state = 'changes_requested', version = version + 1, updated_at = now()
      WHERE id = content.id;
    ELSIF p_decision = 'approved' AND content.kind IN ('story', 'spotlight') THEN
      UPDATE public.content_items
      SET publication_state = 'admin_review', version = version + 1, updated_at = now()
      WHERE id = content.id;
    END IF;
  ELSIF row.resource_type = 'safety_reports' THEN
    UPDATE public.safety_reports
    SET state = CASE WHEN p_decision = 'escalate' THEN 'reviewing' ELSE 'closed' END
    WHERE id = row.resource_id;
  ELSIF row.resource_type = 'feedback_responses' THEN
    IF p_decision IN ('approved', 'publish') THEN
      UPDATE public.feedback_responses SET publication_state = 'eligible' WHERE id = row.resource_id;
    ELSIF p_decision IN ('remove', 'restrict') THEN
      UPDATE public.feedback_responses SET publication_state = 'excluded' WHERE id = row.resource_id;
    END IF;
  END IF;

  UPDATE public.moderation_reviews SET
    status = next_status,
    decision = p_decision,
    participant_response = COALESCE(p_response, participant_response),
    private_notes = COALESCE(p_notes, private_notes),
    revision_reason = CASE WHEN p_decision = 'request_revision' THEN COALESCE(p_reason, '') ELSE revision_reason END,
    assigned_to = CASE WHEN p_decision = 'escalate' THEN assigned_to ELSE actor END,
    is_protected = CASE WHEN p_decision = 'escalate' THEN true ELSE is_protected END,
    resolved_at = CASE WHEN next_status = 'resolved' THEN now() ELSE resolved_at END,
    prior_actions = prior_actions || jsonb_build_array(jsonb_build_object(
      'at', now(), 'decision', p_decision, 'reason', p_reason
    )),
    updated_at = now()
  WHERE id = row.id
  RETURNING * INTO row;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, reason, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'decide_moderation', 'moderation_reviews', row.id,
    commands.request_id(), p_reason, jsonb_build_object('decision', p_decision)
  );
  RETURN jsonb_build_object('id', row.id, 'status', row.status, 'decision', row.decision);
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
    PERFORM commands.enqueue_moderation(
      CASE WHEN row.kind IN ('story', 'spotlight') THEN 'story' ELSE 'news' END,
      'content_items', row.id, row.title, left(row.summary, 280),
      row.consent_evidence, false, actor
    );
  ELSIF p_next IN ('review', 'published', 'changes_requested', 'rejected', 'archived', 'withdrawn', 'admin_review', 'consent_check') THEN
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
    IF row.kind IN ('story', 'spotlight') AND NOT commands.story_publish_allowed(row) THEN
      RAISE EXCEPTION 'SUBJECT_CONSENT_REQUIRED';
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
      withdrawn_at = CASE WHEN p_next IN ('withdrawn', 'archived') THEN now() ELSE withdrawn_at END,
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

CREATE OR REPLACE FUNCTION commands.list_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  perms text[];
  queues jsonb := '[]'::jsonb;
BEGIN
  actor := commands.require_privileged_admin();
  perms := commands.staff_permission_list(actor);

  IF commands.has_staff_permission(actor, 'verification') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'professional_review',
        'label', 'Professional reviews',
        'href', '/admin/approvals?kind=professional',
        'count', (
          SELECT count(*)::integer FROM public.verification_cases
          WHERE state IN ('pending', 'needs_information')
            AND commands.verification_kind(professional_evidence)
              IN ('counselor', 'mentor', 'company')
        )
      ),
      jsonb_build_object(
        'id', 'guardian_review',
        'label', 'Guardian-link reviews',
        'href', '/admin/approvals?kind=guardian_link',
        'count', (
          SELECT count(*)::integer FROM public.verification_cases
          WHERE state IN ('pending', 'needs_information')
            AND commands.verification_kind(professional_evidence) = 'guardian_link'
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'supervisor') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'escalations',
        'label', 'Supervisor escalations',
        'href', '/admin/approvals?escalated=1',
        'count', (
          SELECT count(*)::integer FROM public.verification_cases
          WHERE state IN ('pending', 'needs_information') AND escalates_at <= now()
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'operations') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'recent_audit',
        'label', 'Recent audited actions',
        'href', '/admin/audit',
        'count', (
          SELECT count(*)::integer FROM public.audit_events
          WHERE occurred_at >= now() - interval '7 days'
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'catalog_editorial') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'ingestion_review',
        'label', 'Catalog extractions to review',
        'href', '/admin/catalog?kind=ingestion',
        'count', (
          SELECT count(*)::integer FROM public.catalog_ingestion_jobs WHERE status = 'extracted'
        )
      ),
      jsonb_build_object(
        'id', 'catalog_review_due',
        'label', 'Quarterly catalog review due',
        'href', '/admin/catalog?reviewDue=1',
        'count', (
          SELECT count(*)::integer FROM public.source_facts
          WHERE next_review_at IS NOT NULL AND next_review_at < now()
        )
      ),
      jsonb_build_object(
        'id', 'moderation_review',
        'label', 'Moderation and publication review',
        'href', '/admin/moderation',
        'count', (
          SELECT count(*)::integer FROM public.moderation_reviews
          WHERE status IN ('open', 'in_review', 'revision_requested') AND NOT is_protected
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'safety') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'safety_review',
        'label', 'Protected safety review',
        'href', '/admin/moderation?queue=safety',
        'count', (
          SELECT count(*)::integer FROM public.moderation_reviews
          WHERE is_protected AND status IN ('open', 'in_review', 'escalated')
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'rewards_approval') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'rewards_review',
        'label', 'Rewards verification',
        'href', '/admin/rewards',
        'count', (
          SELECT count(*)::integer FROM public.mentoring_logs
          WHERE state IN ('submitted', 'approved_awaiting_rating', 'reward_eligible')
        ) + (
          SELECT count(*)::integer FROM public.redemptions
          WHERE state IN ('reserved', 'fulfilling', 'failed')
        )
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'homeRole', 'admin',
    'permissions', to_jsonb(perms),
    'queues', queues,
    'recentAudit', CASE
      WHEN commands.has_staff_permission(actor, 'operations') THEN (
        SELECT COALESCE(jsonb_agg(row_to_json(ev)::jsonb ORDER BY ev.occurred_at DESC), '[]'::jsonb)
        FROM (
          SELECT id, actor_id, action, resource_type, resource_id, occurred_at, reason
          FROM public.audit_events
          ORDER BY occurred_at DESC
          LIMIT 5
        ) ev
      )
      ELSE '[]'::jsonb
    END
  );
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;

INSERT INTO public.accounts (id, auth_user_id, email_normalized, status, gsc_id)
SELECT 'aaaa1200-0001-4000-8000-0000000000ed', NULL,
       'synthetic-news@example.invalid', 'approved', 'GSC-NEW'
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = 'aaaa1200-0001-4000-8000-0000000000ed');

INSERT INTO public.content_items (
  id, kind, title, topic, audience, summary, body, author_attribution,
  source_urls, publication_state, published_at, created_by, slug
) VALUES
(
  'aaaa1201-0001-4000-8000-0000000000a1', 'news',
  'SYNTHETIC — New scholarship listings',
  'new_scholarships', 'overall',
  'SYNTHETIC: bookmarks are not funding. Official URLs stay on the provider site.',
  'SYNTHETIC editorial update. Following this topic does not enroll WhatsApp alerts.',
  'SYNTHETIC editorial', ARRAY['https://example.invalid/scholarships'],
  'published', now(), 'aaaa1200-0001-4000-8000-0000000000ed', 'synthetic-new-scholarships'
),
(
  'aaaa1201-0001-4000-8000-0000000000a2', 'news',
  'SYNTHETIC — App improvements',
  'system_improvements', 'overall',
  'SYNTHETIC platform note. No accredited-award claim.',
  'SYNTHETIC editorial. Sharing this URL grants no extra case access.',
  'SYNTHETIC editorial', '{}',
  'published', now(), 'aaaa1200-0001-4000-8000-0000000000ed', 'synthetic-system-improvements'
),
(
  'aaaa1201-0001-4000-8000-0000000000a3', 'news',
  'SYNTHETIC — Intake month reminder',
  'intakes', 'overall',
  'SYNTHETIC: a month-only deadline stays a month name, never an invented last day.',
  'SYNTHETIC editorial. This date is not an official application deadline.',
  'SYNTHETIC editorial', ARRAY['https://example.invalid/intakes'],
  'published', now(), 'aaaa1200-0001-4000-8000-0000000000ed', 'synthetic-intakes'
),
(
  'aaaa1201-0001-4000-8000-0000000000a4', 'news',
  'SYNTHETIC — Unpublished counselor draft',
  'new_programs', 'overall',
  'SYNTHETIC draft used to prove unpublished news stays invisible.',
  'Must never appear on /news or search.',
  'SYNTHETIC editorial', ARRAY['https://example.invalid/draft'],
  'draft', NULL, 'aaaa1200-0001-4000-8000-0000000000ed', 'synthetic-unpublished-news'
),
(
  'aaaa1201-0001-4000-8000-0000000000a5', 'news',
  'SYNTHETIC — Withdrawn update',
  'education_fairs', 'overall',
  'SYNTHETIC withdrawn item. Stale links resolve safely.',
  'Hidden body after withdrawal.',
  'SYNTHETIC editorial', ARRAY['https://example.invalid/fair'],
  'withdrawn', now() - interval '2 days', 'aaaa1200-0001-4000-8000-0000000000ed', 'synthetic-withdrawn-news'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.content_items (
  id, kind, title, topic, audience, summary, body, author_attribution,
  publication_state, published_at, created_by, slug, publication_consent,
  name_consent, image_consent, spotlight_consent, subject_account_id, country_code,
  withdrawn_at
) VALUES
(
  'aaaa1202-0001-4000-8000-0000000000b1', 'story',
  'SYNTHETIC — Published journey',
  'alumni_success', 'overall',
  'SYNTHETIC excerpt. Shared with permission.',
  'SYNTHETIC story text. Publication consent is independent of name and image consent.',
  'Amina Example', 'published', now(), 'aaaa1200-0001-4000-8000-0000000000ed',
  'synthetic-published-story', true, true, false, false,
  'aaaa1200-0001-4000-8000-0000000000ed', 'PK', NULL
),
(
  'aaaa1202-0001-4000-8000-0000000000b2', 'story',
  'SYNTHETIC — Withdrawn journey',
  'alumni_success', 'overall',
  'SYNTHETIC withdrawn story must leave the wall.',
  'Private body after withdrawal.',
  'Hidden name', 'withdrawn', now() - interval '5 days', 'aaaa1200-0001-4000-8000-0000000000ed',
  'synthetic-withdrawn-story', false, false, false, false,
  'aaaa1200-0001-4000-8000-0000000000ed', 'PK', now()
),
(
  'aaaa1202-0001-4000-8000-0000000000b3', 'story',
  'SYNTHETIC — No publication consent',
  'alumni_success', 'overall',
  'Admin approval without subject consent cannot publish.',
  'Must stay off the public wall.',
  'Not public', 'admin_review', NULL, 'aaaa1200-0001-4000-8000-0000000000ed',
  'synthetic-no-consent-story', false, true, false, false,
  'aaaa1200-0001-4000-8000-0000000000ed', 'PK', NULL
),
(
  'aaaa1202-0001-4000-8000-0000000000b4', 'spotlight',
  'SYNTHETIC — Spotlight with separate consent',
  'alumni_success', 'overall',
  'SYNTHETIC spotlight. Spotlight consent is independent of the named story.',
  'SYNTHETIC spotlight body. Mentor was not notified of a private milestone.',
  'Amina Example', 'published', now(), 'aaaa1200-0001-4000-8000-0000000000ed',
  'synthetic-spotlight', true, true, false, true,
  'aaaa1200-0001-4000-8000-0000000000ed', 'PK', NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.moderation_reviews (
  id, queue_type, resource_type, resource_id, title, redacted_context,
  consent_evidence, status, is_protected
) VALUES (
  'aaaa1203-0001-4000-8000-0000000000c1',
  'story', 'content_items', 'aaaa1202-0001-4000-8000-0000000000b3',
  'SYNTHETIC — No publication consent',
  'Admin approval without subject consent cannot publish.',
  'publication=false', 'open', false
)
ON CONFLICT (resource_type, resource_id) DO NOTHING;
