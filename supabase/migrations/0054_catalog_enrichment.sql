-- Spec WP-13 catalog enrichment: editorial country guidance, sourced
-- accommodation fields, leftover visa/housing fold, quarterly reminders,
-- and source-revision traceability. Imports never auto-publish.

ALTER TABLE public.accommodations
  ADD COLUMN IF NOT EXISTS meal_included_in_rent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_source_type text,
  ADD COLUMN IF NOT EXISTS latitude numeric(9, 6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9, 6),
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS included_costs jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.accommodations
  DROP CONSTRAINT IF EXISTS accommodations_price_source_check;
ALTER TABLE public.accommodations
  ADD CONSTRAINT accommodations_price_source_check CHECK (
    price_source_type IS NULL
    OR price_source_type IN ('residence_quote', 'city_estimate')
  );

ALTER TABLE public.source_facts
  DROP CONSTRAINT IF EXISTS source_facts_entity_type_check;
ALTER TABLE public.source_facts
  ADD CONSTRAINT source_facts_entity_type_check CHECK (entity_type IN (
    'university',
    'program',
    'scholarship',
    'accommodation',
    'ranking',
    'entry_criterion',
    'program_cost',
    'program_intake',
    'country_guidance'
  ));

ALTER TABLE public.catalog_ingestion_jobs
  DROP CONSTRAINT IF EXISTS catalog_ingestion_entity_check;
ALTER TABLE public.catalog_ingestion_jobs
  ADD CONSTRAINT catalog_ingestion_entity_check CHECK (entity_type IN (
    'university',
    'program',
    'scholarship',
    'accommodation',
    'country_guidance'
  ));

CREATE TABLE IF NOT EXISTS public.country_guidance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  country char(2) NOT NULL REFERENCES public.countries (code),
  study_level text NOT NULL,
  visa_category text NOT NULL,
  nationality_applicability text[] NOT NULL DEFAULT '{}',
  official_url text,
  official_authority text,
  source_date date,
  application_fee_amount numeric(20, 6),
  application_fee_currency char(3) REFERENCES public.currencies (code),
  visa_fee_amount numeric(20, 6),
  visa_fee_currency char(3) REFERENCES public.currencies (code),
  payment_notes text,
  processing_min integer,
  processing_max integer,
  processing_unit text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  country_rules text,
  work_hours_value numeric(6, 2),
  work_hours_period text,
  work_hours_conditions text,
  work_hours_source text,
  work_hours_source_date date,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  reapplication_notes text,
  student_advice text,
  counselor_notes text,
  next_review_at timestamptz,
  source_fact_id uuid REFERENCES public.source_facts (id) ON DELETE RESTRICT,
  publication_state text NOT NULL DEFAULT 'draft',
  CONSTRAINT country_guidance_level_check CHECK (study_level IN (
    'undergraduate', 'masters', 'phd', 'certificate'
  )),
  CONSTRAINT country_guidance_category_check CHECK (visa_category IN (
    'student_visa', 'exchange', 'research', 'short_term'
  )),
  CONSTRAINT country_guidance_processing_unit_check CHECK (
    processing_unit IS NULL OR processing_unit IN ('days', 'weeks')
  ),
  CONSTRAINT country_guidance_publication_check CHECK (publication_state IN (
    'draft', 'in_review', 'published', 'withdrawn'
  )),
  CONSTRAINT country_guidance_fee_pair_app CHECK (
    (application_fee_amount IS NULL AND application_fee_currency IS NULL)
    OR (application_fee_amount IS NOT NULL AND application_fee_currency IS NOT NULL)
  ),
  CONSTRAINT country_guidance_fee_pair_visa CHECK (
    (visa_fee_amount IS NULL AND visa_fee_currency IS NULL)
    OR (visa_fee_amount IS NOT NULL AND visa_fee_currency IS NOT NULL)
  ),
  CONSTRAINT country_guidance_unique UNIQUE (country, study_level, visa_category)
);

CREATE INDEX IF NOT EXISTS country_guidance_country_level_idx
  ON public.country_guidance (country, study_level, publication_state);

CREATE TABLE IF NOT EXISTS public.visa_requirement_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  country char(2) NOT NULL,
  document_key text NOT NULL,
  status text NOT NULL,
  notes text,
  leftover_item_id uuid,
  CONSTRAINT visa_progress_document_check CHECK (document_key IN (
    'passport',
    'offer_letter',
    'financial_proof',
    'photos',
    'visa_form',
    'medical',
    'insurance',
    'other'
  )),
  CONSTRAINT visa_progress_status_check CHECK (status IN (
    'not_started',
    'preparing',
    'available',
    'reviewed',
    'not_applicable'
  )),
  CONSTRAINT visa_progress_unique UNIQUE (case_id, country, document_key)
);

CREATE INDEX IF NOT EXISTS visa_progress_case_idx
  ON public.visa_requirement_progress (case_id, country);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'program_action_links_country_guidance_id_fkey'
  ) THEN
    ALTER TABLE public.program_action_links
      ADD CONSTRAINT program_action_links_country_guidance_id_fkey
      FOREIGN KEY (country_guidance_id)
      REFERENCES public.country_guidance (id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

DROP VIEW IF EXISTS public.catalog_accommodations_public;
CREATE VIEW public.catalog_accommodations_public AS
SELECT
  id,
  university_id,
  name,
  type,
  amount,
  currency,
  basis,
  meal_plan,
  meal_included_in_rent,
  price_source_type,
  latitude,
  longitude,
  address,
  included_costs,
  distance_km,
  transport,
  proximity,
  publication_state
FROM public.accommodations
WHERE publication_state = 'published';

GRANT SELECT ON public.catalog_accommodations_public TO anon, authenticated;

-- Fold leftover student-entered visa rows into case progress. Keep visa_checklists.
INSERT INTO public.visa_requirement_progress (
  case_id, country, document_key, status, notes, leftover_item_id
)
SELECT DISTINCT ON (c.id, left(v.country, 2), mapped.document_key)
  c.id,
  left(v.country, 2),
  mapped.document_key,
  CASE WHEN COALESCE(v.is_completed, false) THEN 'available' ELSE 'not_started' END,
  NULLIF(v.notes, ''),
  v.id
FROM public.visa_checklists v
JOIN public.cases c ON c.student_account_id = v.student_id
CROSS JOIN LATERAL (
  SELECT CASE
    WHEN lower(v.document_name) LIKE '%passport%' THEN 'passport'
    WHEN lower(v.document_name) LIKE '%offer%' THEN 'offer_letter'
    WHEN lower(v.document_name) LIKE '%financial%'
      OR lower(v.document_name) LIKE '%bank%' THEN 'financial_proof'
    WHEN lower(v.document_name) LIKE '%photo%' THEN 'photos'
    WHEN lower(v.document_name) LIKE '%form%' THEN 'visa_form'
    WHEN lower(v.document_name) LIKE '%medical%' THEN 'medical'
    WHEN lower(v.document_name) LIKE '%insurance%' THEN 'insurance'
    ELSE 'other'
  END AS document_key
) mapped
WHERE length(btrim(v.country)) >= 2
ORDER BY c.id, left(v.country, 2), mapped.document_key, v.created_at
ON CONFLICT (case_id, country, document_key) DO NOTHING;

-- Fold leftover housing into draft accommodations. Never publish.
INSERT INTO public.accommodations (
  university_id, name, type, basis, address, publication_state
)
SELECT
  h.university_id,
  h.title,
  CASE WHEN h.housing_type = 'on_campus' THEN 'dorm' ELSE 'apartment' END,
  'monthly',
  NULLIF(h.address, ''),
  'draft'
FROM public.housing_options h
WHERE EXISTS (
  SELECT 1 FROM public.universities u WHERE u.id = h.university_id
)
  AND NOT EXISTS (
    SELECT 1
    FROM public.accommodations a
    WHERE a.university_id = h.university_id
      AND a.name = h.title
  );

ALTER TABLE public.country_guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_guidance FORCE ROW LEVEL SECURITY;
ALTER TABLE public.visa_requirement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_requirement_progress FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.country_guidance
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.visa_requirement_progress
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION commands.set_catalog_publication_state(
  p_entity_type text,
  p_entity_id uuid,
  p_next_state text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  current_state text;
  revision bigint;
  next_version bigint := 1;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_entity_type = 'university' THEN
    SELECT publication_state INTO current_state
    FROM public.universities WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'program' THEN
    SELECT publication_state INTO current_state
    FROM public.programs WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'scholarship' THEN
    SELECT publication_state INTO current_state
    FROM public.scholarships WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'accommodation' THEN
    SELECT publication_state INTO current_state
    FROM public.accommodations WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'country_guidance' THEN
    SELECT publication_state INTO current_state
    FROM public.country_guidance WHERE id = p_entity_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF current_state IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF NOT commands.can_transition_catalog_state(current_state, p_next_state) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_next_state = 'published' THEN
    IF NOT commands.catalog_entity_has_provenance(p_entity_type, p_entity_id) THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END IF;

  IF p_entity_type = 'university' THEN
    UPDATE public.universities
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id
    RETURNING version INTO next_version;
  ELSIF p_entity_type = 'program' THEN
    UPDATE public.programs
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id
    RETURNING version INTO next_version;
  ELSIF p_entity_type = 'scholarship' THEN
    UPDATE public.scholarships
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id
    RETURNING version INTO next_version;
  ELSIF p_entity_type = 'accommodation' THEN
    UPDATE public.accommodations
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id
    RETURNING version INTO next_version;
  ELSE
    UPDATE public.country_guidance
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id
    RETURNING version INTO next_version;
  END IF;

  IF p_next_state IN ('published', 'withdrawn') THEN
    revision := commands.refresh_catalog_snapshot(actor, p_reason);
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'set_catalog_publication_state',
    p_entity_type,
    p_entity_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('from', current_state, 'to', p_next_state, 'revision', revision)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    p_entity_type,
    p_entity_id,
    COALESCE(next_version, 1),
    'catalog_publication_changed',
    jsonb_build_object('id', p_entity_id, 'state', p_next_state)
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'id', p_entity_id,
    'state', p_next_state,
    'revision', revision
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_catalog_entities(
  p_kind text,
  p_country text,
  p_state text,
  p_review_due boolean,
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  lim integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  off integer := GREATEST(COALESCE(p_offset, 0), 0);
  items jsonb := '[]'::jsonb;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');

  IF COALESCE(p_kind, 'university') = 'university' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT
        u.id,
        u.name,
        'university' AS type,
        u.publication_state AS status,
        (
          SELECT min(f.next_review_at)
          FROM public.source_facts f
          WHERE f.entity_type = 'university' AND f.entity_id = u.id
        ) AS review_due
      FROM public.universities u
      WHERE (p_country IS NULL OR u.country = p_country)
        AND (p_state IS NULL OR u.publication_state = p_state)
        AND (
          COALESCE(p_review_due, false) = false
          OR EXISTS (
            SELECT 1 FROM public.source_facts f
            WHERE f.entity_type = 'university'
              AND f.entity_id = u.id
              AND f.next_review_at IS NOT NULL
              AND f.next_review_at < now()
          )
        )
      ORDER BY u.name
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'program' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT p.id, p.name, 'program' AS type, p.publication_state AS status,
        NULL::timestamptz AS review_due, p.university_id AS parent_id
      FROM public.programs p
      WHERE p_state IS NULL OR p.publication_state = p_state
      ORDER BY p.name
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'scholarship' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT s.id, s.name, 'scholarship' AS type, s.publication_state AS status, NULL::timestamptz AS review_due
      FROM public.scholarships s
      WHERE p_state IS NULL OR s.publication_state = p_state
      ORDER BY s.name
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'accommodation' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT a.id, a.name, 'accommodation' AS type, a.publication_state AS status,
        NULL::timestamptz AS review_due, a.university_id AS parent_id
      FROM public.accommodations a
      WHERE p_state IS NULL OR a.publication_state = p_state
      ORDER BY a.name
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind IN ('visa', 'country_guidance') THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT
        g.id,
        (g.country || ' · ' || g.study_level || ' · ' || g.visa_category) AS name,
        'country_guidance' AS type,
        g.publication_state AS status,
        g.next_review_at AS review_due
      FROM public.country_guidance g
      WHERE (p_country IS NULL OR g.country = p_country)
        AND (p_state IS NULL OR g.publication_state = p_state)
      ORDER BY g.country, g.study_level, g.visa_category
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'ingestion' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT j.id, j.canonical_url AS name, j.entity_type AS type, j.status,
        NULL::timestamptz AS review_due
      FROM public.catalog_ingestion_jobs j
      WHERE p_state IS NULL OR j.status = p_state
      ORDER BY j.created_at DESC
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'taxonomy' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT t.id, t.label AS name, t.kind AS type,
        CASE WHEN t.active THEN 'active' ELSE 'inactive' END AS status,
        NULL::timestamptz AS review_due
      FROM public.taxonomy_terms t
      ORDER BY t.kind, t.label
      LIMIT lim OFFSET off
    ) row_item;
  END IF;

  RETURN jsonb_build_object('items', items, 'limit', lim, 'offset', off);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_catalog_review_due(
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  lim integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  off integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  PERFORM commands.emit_quarterly_review_reminders();

  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(row_item))
      FROM (
        SELECT DISTINCT ON (f.entity_type, f.entity_id)
          f.entity_type,
          f.entity_id,
          f.field_path,
          f.next_review_at,
          f.verified_at
        FROM public.source_facts f
        WHERE f.next_review_at IS NOT NULL
          AND f.next_review_at <= now() + interval '14 days'
        ORDER BY f.entity_type, f.entity_id, f.next_review_at
        LIMIT lim OFFSET off
      ) row_item
    ), '[]'::jsonb),
    'limit', lim,
    'offset', off
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.emit_quarterly_review_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  quarter_version bigint;
  inserted integer := 0;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  quarter_version := (EXTRACT(YEAR FROM now())::bigint * 10)
    + EXTRACT(QUARTER FROM now())::bigint;

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  )
  SELECT
    'source_facts',
    f.id,
    quarter_version,
    'quarterly_review_reminder',
    jsonb_build_object(
      'sourceFactId', f.id,
      'entityType', f.entity_type,
      'entityId', f.entity_id,
      'fieldPath', f.field_path,
      'nextReviewAt', f.next_review_at
    )
  FROM public.source_facts f
  WHERE f.next_review_at IS NOT NULL
    AND f.next_review_at <= now() + interval '14 days'
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'emit_quarterly_review_reminders',
    'source_facts',
    'Quarterly catalog review reminders',
    commands.request_id(),
    jsonb_build_object('inserted', inserted, 'quarter', quarter_version)
  );

  RETURN jsonb_build_object('reminders', inserted, 'quarter', quarter_version);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_quarterly_review_reminders(
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  lim integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  off integer := GREATEST(COALESCE(p_offset, 0), 0);
  emitted jsonb;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  emitted := commands.emit_quarterly_review_reminders();

  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(row_item))
      FROM (
        SELECT
          f.id AS source_fact_id,
          f.entity_type,
          f.entity_id,
          f.field_path,
          f.next_review_at,
          f.verified_at,
          (f.next_review_at <= now()) AS overdue
        FROM public.source_facts f
        WHERE f.next_review_at IS NOT NULL
          AND f.next_review_at <= now() + interval '14 days'
        ORDER BY f.next_review_at, f.entity_type, f.entity_id
        LIMIT lim OFFSET off
      ) row_item
    ), '[]'::jsonb),
    'emitted', emitted,
    'limit', lim,
    'offset', off
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.trace_source_revision(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  IF p_entity_type IS NULL OR p_entity_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  RETURN jsonb_build_object(
    'entityType', p_entity_type,
    'entityId', p_entity_id,
    'traceable', EXISTS (
      SELECT 1
      FROM public.source_facts f
      WHERE f.entity_type = p_entity_type AND f.entity_id = p_entity_id
    ),
    'revisions', COALESCE((
      SELECT jsonb_agg(to_jsonb(row_item) ORDER BY row_item.verified_at DESC NULLS LAST, row_item.created_at DESC)
      FROM (
        SELECT
          f.id AS source_fact_id,
          f.field_path,
          f.created_at,
          f.verified_at,
          f.next_review_at,
          f.source_type,
          d.id AS document_id,
          d.canonical_url,
          d.retrieved_at,
          d.content_hash
        FROM public.source_facts f
        JOIN public.source_documents d ON d.id = f.document_id
        WHERE f.entity_type = p_entity_type AND f.entity_id = p_entity_id
      ) row_item
    ), '[]'::jsonb)
  );
END;
$$;

DROP FUNCTION IF EXISTS commands.upsert_accommodation(uuid, uuid, text, text, numeric, text, text, text);

CREATE OR REPLACE FUNCTION commands.upsert_accommodation(
  p_id uuid,
  p_university_id uuid,
  p_name text,
  p_type text,
  p_amount numeric,
  p_currency text,
  p_basis text,
  p_reason text,
  p_meal_included boolean DEFAULT false,
  p_price_source text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_included_costs jsonb DEFAULT '[]'::jsonb
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
  IF p_price_source IS NOT NULL
     AND p_price_source NOT IN ('residence_quote', 'city_estimate') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.accommodations (
      university_id, name, type, amount, currency, basis,
      meal_included_in_rent, price_source_type, latitude, longitude, address, included_costs
    ) VALUES (
      p_university_id, p_name, p_type, p_amount, p_currency, p_basis,
      COALESCE(p_meal_included, false), p_price_source, p_latitude, p_longitude,
      nullif(p_address, ''), COALESCE(p_included_costs, '[]'::jsonb)
    )
    RETURNING id INTO row_id;
  ELSE
    UPDATE public.accommodations
    SET name = p_name,
        type = p_type,
        amount = p_amount,
        currency = p_currency,
        basis = p_basis,
        meal_included_in_rent = COALESCE(p_meal_included, false),
        price_source_type = p_price_source,
        latitude = p_latitude,
        longitude = p_longitude,
        address = nullif(p_address, ''),
        included_costs = COALESCE(p_included_costs, '[]'::jsonb),
        version = version + 1,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO row_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;
  END IF;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'upsert_accommodation', 'accommodations', row_id,
    p_reason, commands.request_id(), jsonb_build_object('name', p_name)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'accommodations', row_id, 1, 'accommodation_upserted', jsonb_build_object('id', row_id)
  )
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_country_guidance(
  p_id uuid,
  p_payload jsonb,
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
  IF p_payload IS NULL
     OR coalesce(p_payload->>'country', '') = ''
     OR coalesce(p_payload->>'studyLevel', '') = ''
     OR coalesce(p_payload->>'visaCategory', '') = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.country_guidance (
      country, study_level, visa_category, nationality_applicability,
      official_url, official_authority, source_date,
      application_fee_amount, application_fee_currency,
      visa_fee_amount, visa_fee_currency, payment_notes,
      processing_min, processing_max, processing_unit, documents, country_rules,
      work_hours_value, work_hours_period, work_hours_conditions,
      work_hours_source, work_hours_source_date, faq, reapplication_notes,
      student_advice, counselor_notes, next_review_at
    ) VALUES (
      p_payload->>'country',
      p_payload->>'studyLevel',
      p_payload->>'visaCategory',
      COALESCE((
        SELECT array_agg(value)
        FROM jsonb_array_elements_text(COALESCE(p_payload->'nationalityApplicability', '[]'::jsonb)) AS value
      ), '{}'),
      nullif(p_payload->>'officialUrl', ''),
      nullif(p_payload->>'officialAuthority', ''),
      NULLIF(p_payload->>'sourceDate', '')::date,
      NULLIF(p_payload->>'applicationFeeAmount', '')::numeric,
      NULLIF(p_payload->>'applicationFeeCurrency', ''),
      NULLIF(p_payload->>'visaFeeAmount', '')::numeric,
      NULLIF(p_payload->>'visaFeeCurrency', ''),
      nullif(p_payload->>'paymentNotes', ''),
      NULLIF(p_payload->>'processingMin', '')::integer,
      NULLIF(p_payload->>'processingMax', '')::integer,
      NULLIF(p_payload->>'processingUnit', ''),
      COALESCE(p_payload->'documents', '[]'::jsonb),
      nullif(p_payload->>'countryRules', ''),
      NULLIF(p_payload->>'workHoursValue', '')::numeric,
      nullif(p_payload->>'workHoursPeriod', ''),
      nullif(p_payload->>'workHoursConditions', ''),
      nullif(p_payload->>'workHoursSource', ''),
      NULLIF(p_payload->>'workHoursSourceDate', '')::date,
      COALESCE(p_payload->'faq', '[]'::jsonb),
      nullif(p_payload->>'reapplicationNotes', ''),
      nullif(p_payload->>'studentAdvice', ''),
      nullif(p_payload->>'counselorNotes', ''),
      NULLIF(p_payload->>'nextReviewAt', '')::timestamptz
    )
    RETURNING id INTO row_id;
  ELSE
    UPDATE public.country_guidance
    SET country = p_payload->>'country',
        study_level = p_payload->>'studyLevel',
        visa_category = p_payload->>'visaCategory',
        nationality_applicability = COALESCE((
          SELECT array_agg(value)
          FROM jsonb_array_elements_text(COALESCE(p_payload->'nationalityApplicability', '[]'::jsonb)) AS value
        ), '{}'),
        official_url = nullif(p_payload->>'officialUrl', ''),
        official_authority = nullif(p_payload->>'officialAuthority', ''),
        source_date = NULLIF(p_payload->>'sourceDate', '')::date,
        application_fee_amount = NULLIF(p_payload->>'applicationFeeAmount', '')::numeric,
        application_fee_currency = NULLIF(p_payload->>'applicationFeeCurrency', ''),
        visa_fee_amount = NULLIF(p_payload->>'visaFeeAmount', '')::numeric,
        visa_fee_currency = NULLIF(p_payload->>'visaFeeCurrency', ''),
        payment_notes = nullif(p_payload->>'paymentNotes', ''),
        processing_min = NULLIF(p_payload->>'processingMin', '')::integer,
        processing_max = NULLIF(p_payload->>'processingMax', '')::integer,
        processing_unit = NULLIF(p_payload->>'processingUnit', ''),
        documents = COALESCE(p_payload->'documents', '[]'::jsonb),
        country_rules = nullif(p_payload->>'countryRules', ''),
        work_hours_value = NULLIF(p_payload->>'workHoursValue', '')::numeric,
        work_hours_period = nullif(p_payload->>'workHoursPeriod', ''),
        work_hours_conditions = nullif(p_payload->>'workHoursConditions', ''),
        work_hours_source = nullif(p_payload->>'workHoursSource', ''),
        work_hours_source_date = NULLIF(p_payload->>'workHoursSourceDate', '')::date,
        faq = COALESCE(p_payload->'faq', '[]'::jsonb),
        reapplication_notes = nullif(p_payload->>'reapplicationNotes', ''),
        student_advice = nullif(p_payload->>'studentAdvice', ''),
        counselor_notes = nullif(p_payload->>'counselorNotes', ''),
        next_review_at = NULLIF(p_payload->>'nextReviewAt', '')::timestamptz,
        version = version + 1,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO row_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'upsert_country_guidance',
    'country_guidance',
    row_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('country', p_payload->>'country')
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'country_guidance', row_id, 1, 'country_guidance_upserted',
    jsonb_build_object('id', row_id)
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_country_guidance(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  PERFORM commands.require_admin_scope('catalog_editorial');
  RETURN (
    SELECT jsonb_build_object('guidance', to_jsonb(g))
    FROM public.country_guidance g
    WHERE g.id = p_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_case_visa_guidance(p_case uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  counseling_done boolean := false;
  has_target boolean := false;
  dest_country char(2);
  dest_level text;
  nationality char(2);
  matched public.country_guidance%ROWTYPE;
  lock_reason text;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'journey.read')
     AND NOT commands.has_case_scope(p_case, actor, 'report.read') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.case_id = p_case
      AND b.kind = 'counseling'
      AND b.session_state = 'completed'
  ) INTO counseling_done;

  SELECT EXISTS (
    SELECT 1 FROM public.saved_program_pairs s WHERE s.case_id = p_case
  ) INTO has_target;

  SELECT i.nationality INTO nationality
  FROM public.cases c
  JOIN public.identities i ON i.account_id = c.student_account_id
  WHERE c.id = p_case;

  SELECT u.country, p.level
  INTO dest_country, dest_level
  FROM public.saved_program_pairs s
  JOIN public.programs p ON p.id = s.program_id
  JOIN public.universities u ON u.id = s.university_id
  WHERE s.case_id = p_case
  ORDER BY s.slot
  LIMIT 1;

  IF NOT counseling_done OR NOT has_target THEN
    lock_reason := 'Visa guidance unlocks after completed counseling and an explicit target selection.';
    RETURN jsonb_build_object(
      'unlocked', false,
      'lockReason', lock_reason,
      'counselingCompleted', counseling_done,
      'hasSelectedTarget', has_target,
      'destinationCountry', dest_country,
      'studyLevel', dest_level,
      'nationality', nationality,
      'guidance', NULL,
      'noMatchedGuidance', false,
      'checklist', '[]'::jsonb,
      'disclaimer',
        'This guidance is indicative. It is not a visa approval or a fixed processing guarantee.'
    );
  END IF;

  SELECT g.* INTO matched
  FROM public.country_guidance g
  WHERE g.publication_state = 'published'
    AND g.country = dest_country
    AND g.study_level = dest_level
    AND (
      cardinality(g.nationality_applicability) = 0
      OR nationality = ANY (g.nationality_applicability)
    )
  ORDER BY g.visa_category
  LIMIT 1;

  IF matched.id IS NULL THEN
    RETURN jsonb_build_object(
      'unlocked', true,
      'lockReason', NULL,
      'counselingCompleted', true,
      'hasSelectedTarget', true,
      'destinationCountry', dest_country,
      'studyLevel', dest_level,
      'nationality', nationality,
      'guidance', NULL,
      'noMatchedGuidance', true,
      'checklist', '[]'::jsonb,
      'disclaimer',
        'This guidance is indicative. It is not a visa approval or a fixed processing guarantee.'
    );
  END IF;

  RETURN jsonb_build_object(
    'unlocked', true,
    'lockReason', NULL,
    'counselingCompleted', true,
    'hasSelectedTarget', true,
    'destinationCountry', dest_country,
    'studyLevel', dest_level,
    'nationality', nationality,
    'noMatchedGuidance', false,
    'outdated', matched.next_review_at IS NOT NULL AND matched.next_review_at < now(),
    'disclaimer',
      'This guidance is indicative. It is not a visa approval or a fixed processing guarantee.',
    'guidance', jsonb_build_object(
      'id', matched.id,
      'country', matched.country,
      'studyLevel', matched.study_level,
      'visaCategory', matched.visa_category,
      'officialUrl', matched.official_url,
      'officialAuthority', matched.official_authority,
      'sourceDate', matched.source_date,
      'applicationFeeAmount', matched.application_fee_amount,
      'applicationFeeCurrency', matched.application_fee_currency,
      'visaFeeAmount', matched.visa_fee_amount,
      'visaFeeCurrency', matched.visa_fee_currency,
      'paymentNotes', matched.payment_notes,
      'processingMin', matched.processing_min,
      'processingMax', matched.processing_max,
      'processingUnit', matched.processing_unit,
      'documents', matched.documents,
      'countryRules', matched.country_rules,
      'workHoursValue', matched.work_hours_value,
      'workHoursPeriod', matched.work_hours_period,
      'workHoursConditions', matched.work_hours_conditions,
      'workHoursSource', matched.work_hours_source,
      'workHoursSourceDate', matched.work_hours_source_date,
      'faq', matched.faq,
      'reapplicationNotes', matched.reapplication_notes,
      'studentAdvice', matched.student_advice,
      'nextReviewAt', matched.next_review_at
    ),
    'checklist', COALESCE((
      SELECT jsonb_agg(to_jsonb(row_item) ORDER BY row_item.document_key)
      FROM (
        SELECT
          COALESCE(p.document_key, doc.key) AS document_key,
          COALESCE(p.status, 'not_started') AS status,
          p.notes
        FROM (
          SELECT COALESCE(elem->>'key', elem->>'document_key') AS key
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(matched.documents) = 'array' THEN matched.documents
              ELSE '[]'::jsonb
            END
          ) elem
        ) doc
        FULL JOIN public.visa_requirement_progress p
          ON p.case_id = p_case
         AND p.country = matched.country
         AND p.document_key = doc.key
        WHERE COALESCE(p.document_key, doc.key) IS NOT NULL
      ) row_item
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.set_visa_requirement_progress(
  p_case uuid,
  p_country text,
  p_document_key text,
  p_status text,
  p_notes text
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
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'journey.read') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_status NOT IN ('not_started', 'preparing', 'available', 'reviewed', 'not_applicable') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_document_key NOT IN (
    'passport', 'offer_letter', 'financial_proof', 'photos',
    'visa_form', 'medical', 'insurance', 'other'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.visa_requirement_progress (
    case_id, country, document_key, status, notes
  ) VALUES (
    p_case, p_country, p_document_key, p_status, nullif(p_notes, '')
  )
  ON CONFLICT (case_id, country, document_key) DO UPDATE
    SET status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        updated_at = now()
  RETURNING id INTO row_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'set_visa_requirement_progress',
    'visa_requirement_progress',
    row_id,
    commands.request_id(),
    jsonb_build_object('document', p_document_key, 'status', p_status)
  );

  RETURN jsonb_build_object('id', row_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION commands.add_visa_requirement_to_roadmap(
  p_case uuid,
  p_title text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  existing uuid;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.has_case_scope(p_case, actor, 'task.write') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF length(trim(p_title)) < 2 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT t.id INTO existing
  FROM public.tasks t
  WHERE t.case_id = p_case
    AND t.title = trim(p_title)
    AND t.status NOT IN ('completed', 'cancelled')
  LIMIT 1;

  IF existing IS NOT NULL THEN
    RETURN jsonb_build_object('id', existing, 'duplicated', true);
  END IF;

  RETURN commands.create_followup_task(
    p_case, trim(p_title), 'Student', 'Added from destination visa guidance.', NULL, NULL
  ) || jsonb_build_object('duplicated', false);
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commands
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
