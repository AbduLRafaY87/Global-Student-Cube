-- Module 7 programs, costs, intakes, scholarships, snapshots, publication.
-- Application-systems tables stay in 0032; this file only attaches FKs.
-- Leftover prototype scholarships keep their rows under leftover_scholarships.

ALTER TABLE IF EXISTS public.scholarships
  RENAME TO leftover_scholarships;

CREATE OR REPLACE FUNCTION public.is_study_mode_list(p_modes text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_modes IS NOT NULL
    AND cardinality(p_modes) > 0
    AND p_modes <@ ARRAY['on_campus', 'online']::text[]
$$;

CREATE OR REPLACE FUNCTION public.catalog_page_limit(p_limit integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
$$;

CREATE OR REPLACE FUNCTION public.catalog_page_offset(p_offset integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT GREATEST(COALESCE(p_offset, 0), 0)
$$;

CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  university_id uuid NOT NULL REFERENCES public.universities (id) ON DELETE RESTRICT,
  name text NOT NULL,
  level text NOT NULL,
  field_id uuid NOT NULL REFERENCES public.taxonomy_terms (id) ON DELETE RESTRICT,
  discipline_ids uuid[] NOT NULL DEFAULT '{}',
  specialization_ids uuid[] NOT NULL DEFAULT '{}',
  duration_value numeric(6, 2) NOT NULL,
  duration_unit text NOT NULL,
  study_modes text[] NOT NULL,
  general_url text,
  accreditation jsonb NOT NULL DEFAULT '{}'::jsonb,
  international_ratio numeric(5, 2),
  scholarship_availability text NOT NULL DEFAULT 'unknown',
  minimum_grade jsonb,
  publication_state text NOT NULL DEFAULT 'draft',
  CONSTRAINT programs_university_id_id_key UNIQUE (university_id, id),
  CONSTRAINT programs_level_check CHECK (level IN (
    'undergraduate',
    'masters',
    'phd',
    'certificate'
  )),
  CONSTRAINT programs_duration_check CHECK (
    duration_value > 0 AND duration_value <= 120
  ),
  CONSTRAINT programs_duration_unit_check CHECK (duration_unit IN (
    'years',
    'months',
    'semesters'
  )),
  CONSTRAINT programs_study_modes_check CHECK (public.is_study_mode_list(study_modes)),
  CONSTRAINT programs_ratio_check CHECK (
    international_ratio IS NULL OR international_ratio BETWEEN 0 AND 100
  ),
  CONSTRAINT programs_scholarship_check CHECK (scholarship_availability IN (
    'yes',
    'no',
    'limited',
    'unknown'
  )),
  CONSTRAINT programs_publication_check CHECK (publication_state IN (
    'draft',
    'in_review',
    'published',
    'withdrawn'
  )),
  CONSTRAINT programs_published_required_check CHECK (
    publication_state <> 'published' OR general_url IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS programs_field_level_idx
  ON public.programs (field_id, level);

CREATE INDEX IF NOT EXISTS programs_university_idx
  ON public.programs (university_id, publication_state);

CREATE INDEX IF NOT EXISTS programs_name_trgm_idx
  ON public.programs USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.program_action_links (
  program_id uuid PRIMARY KEY REFERENCES public.programs (id) ON DELETE RESTRICT,
  application_url text NOT NULL,
  country_guidance_id uuid
);

CREATE TABLE IF NOT EXISTS public.program_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  program_id uuid NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  intake_year smallint NOT NULL,
  intake_month smallint,
  season text,
  deadline_date date,
  deadline_month smallint,
  deadline_precision text NOT NULL,
  timezone text,
  source_fact_id uuid REFERENCES public.source_facts (id) ON DELETE RESTRICT,
  CONSTRAINT program_intakes_unique UNIQUE (program_id, intake_year, intake_month),
  CONSTRAINT program_intakes_year_check CHECK (intake_year BETWEEN 2000 AND 2100),
  CONSTRAINT program_intakes_month_check CHECK (
    intake_month IS NULL OR intake_month BETWEEN 1 AND 12
  ),
  CONSTRAINT program_intakes_deadline_month_check CHECK (
    deadline_month IS NULL OR deadline_month BETWEEN 1 AND 12
  ),
  CONSTRAINT program_intakes_season_check CHECK (
    season IS NULL OR season IN ('fall', 'spring', 'summer')
  ),
  CONSTRAINT program_intakes_precision_check CHECK (deadline_precision IN (
    'day',
    'month',
    'unknown'
  )),
  CONSTRAINT program_intakes_precision_consistent CHECK (
    (deadline_precision = 'day' AND deadline_date IS NOT NULL)
    OR (
      deadline_precision = 'month'
      AND deadline_month IS NOT NULL
      AND deadline_date IS NULL
    )
    OR (
      deadline_precision = 'unknown'
      AND deadline_date IS NULL
      AND deadline_month IS NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS public.program_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  program_id uuid NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  academic_year text NOT NULL,
  fee_basis text NOT NULL,
  amount numeric(20, 6) NOT NULL,
  currency char(3) NOT NULL REFERENCES public.currencies (code),
  residency_category text NOT NULL DEFAULT 'unspecified',
  source_fact_id uuid NOT NULL REFERENCES public.source_facts (id) ON DELETE RESTRICT,
  CONSTRAINT program_costs_unique
    UNIQUE (program_id, academic_year, fee_basis, residency_category),
  CONSTRAINT program_costs_basis_check CHECK (fee_basis IN (
    'annual',
    'full_program'
  )),
  CONSTRAINT program_costs_amount_check CHECK (amount >= 0)
);

CREATE TABLE IF NOT EXISTS public.accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  university_id uuid NOT NULL REFERENCES public.universities (id) ON DELETE RESTRICT,
  name text NOT NULL,
  type text NOT NULL,
  amount numeric(20, 6),
  currency char(3) REFERENCES public.currencies (code),
  basis text NOT NULL,
  meal_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  distance_km numeric(9, 3),
  transport text[] NOT NULL DEFAULT '{}',
  proximity jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_fact_id uuid REFERENCES public.source_facts (id) ON DELETE RESTRICT,
  publication_state text NOT NULL DEFAULT 'draft',
  CONSTRAINT accommodations_type_check CHECK (type IN (
    'dorm',
    'apartment',
    'family',
    'host_family'
  )),
  CONSTRAINT accommodations_basis_check CHECK (basis IN (
    'monthly',
    'nightly',
    'unknown'
  )),
  CONSTRAINT accommodations_amount_pair CHECK (
    (amount IS NULL AND currency IS NULL)
    OR (amount IS NOT NULL AND currency IS NOT NULL)
  ),
  CONSTRAINT accommodations_amount_check CHECK (amount IS NULL OR amount >= 0),
  CONSTRAINT accommodations_distance_check CHECK (
    distance_km IS NULL OR distance_km >= 0
  ),
  CONSTRAINT accommodations_publication_check CHECK (publication_state IN (
    'draft',
    'in_review',
    'published',
    'withdrawn'
  ))
);

CREATE TABLE IF NOT EXISTS public.entry_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  program_id uuid NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  criterion_key text NOT NULL,
  kind text NOT NULL,
  requirement jsonb NOT NULL,
  mandatory boolean NOT NULL DEFAULT true,
  weight numeric(10, 4),
  source_fact_id uuid REFERENCES public.source_facts (id) ON DELETE RESTRICT,
  revision integer NOT NULL DEFAULT 1,
  CONSTRAINT entry_criteria_unique UNIQUE (program_id, criterion_key, revision),
  CONSTRAINT entry_criteria_weight_check CHECK (weight IS NULL OR weight > 0),
  CONSTRAINT entry_criteria_revision_check CHECK (revision > 0)
);

CREATE TABLE IF NOT EXISTS public.rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  university_id uuid NOT NULL REFERENCES public.universities (id) ON DELETE RESTRICT,
  program_id uuid,
  publisher text NOT NULL,
  edition_year smallint NOT NULL,
  subject text NOT NULL,
  rank_representation text NOT NULL,
  rank_min integer,
  rank_max integer,
  score numeric(10, 4),
  score_scale text,
  licensed_source_id uuid REFERENCES public.source_documents (id) ON DELETE RESTRICT,
  source_fact_id uuid REFERENCES public.source_facts (id) ON DELETE RESTRICT,
  CONSTRAINT rankings_publisher_check CHECK (publisher IN (
    'qs',
    'the',
    'country_specific'
  )),
  CONSTRAINT rankings_representation_check CHECK (rank_representation IN (
    'exact',
    'band',
    'unranked'
  )),
  CONSTRAINT rankings_rank_shape CHECK (
    (
      rank_representation = 'exact'
      AND rank_min IS NOT NULL
      AND rank_min >= 1
      AND rank_max IS NULL
    )
    OR (
      rank_representation = 'band'
      AND rank_min IS NOT NULL
      AND rank_max IS NOT NULL
      AND rank_min >= 1
      AND rank_max >= rank_min
    )
    OR (
      rank_representation = 'unranked'
      AND rank_min IS NULL
      AND rank_max IS NULL
    )
  ),
  CONSTRAINT rankings_entity_publisher_year_subject_key
    UNIQUE NULLS NOT DISTINCT (university_id, program_id, publisher, edition_year, subject)
);

ALTER TABLE public.rankings
  ADD CONSTRAINT rankings_program_composite_fkey
  FOREIGN KEY (university_id, program_id)
  REFERENCES public.programs (university_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  name text NOT NULL,
  provider_name text NOT NULL,
  official_url text NOT NULL,
  provider_type text NOT NULL,
  type text,
  country_codes char(2)[] NOT NULL,
  levels text[] NOT NULL,
  field_ids uuid[] NOT NULL,
  university_id uuid REFERENCES public.universities (id) ON DELETE RESTRICT,
  availability text NOT NULL,
  award_amount numeric(20, 6),
  award_currency char(3) REFERENCES public.currencies (code),
  award_percent numeric(5, 2),
  award_basis text,
  deadline_date date,
  deadline_month smallint,
  deadline_precision text NOT NULL DEFAULT 'unknown',
  extended_details jsonb,
  counselor_remarks text,
  source_fact_id uuid REFERENCES public.source_facts (id) ON DELETE RESTRICT,
  publication_state text NOT NULL DEFAULT 'draft',
  CONSTRAINT scholarships_official_url_key UNIQUE (official_url),
  CONSTRAINT scholarships_provider_type_check CHECK (provider_type IN (
    'university',
    'government',
    'private_foundation',
    'ngo'
  )),
  CONSTRAINT scholarships_availability_check CHECK (availability IN (
    'open',
    'closed',
    'upcoming',
    'unknown'
  )),
  CONSTRAINT scholarships_award_pair CHECK (
    (award_amount IS NULL AND award_currency IS NULL)
    OR (award_amount IS NOT NULL AND award_currency IS NOT NULL)
  ),
  CONSTRAINT scholarships_percent_check CHECK (
    award_percent IS NULL OR award_percent BETWEEN 0 AND 100
  ),
  CONSTRAINT scholarships_deadline_precision_check CHECK (deadline_precision IN (
    'day',
    'month',
    'unknown'
  )),
  CONSTRAINT scholarships_deadline_consistent CHECK (
    (deadline_precision = 'day' AND deadline_date IS NOT NULL)
    OR (
      deadline_precision = 'month'
      AND deadline_month IS NOT NULL
      AND deadline_date IS NULL
    )
    OR (
      deadline_precision = 'unknown'
      AND deadline_date IS NULL
      AND deadline_month IS NULL
    )
  ),
  CONSTRAINT scholarships_publication_check CHECK (publication_state IN (
    'draft',
    'in_review',
    'published',
    'withdrawn'
  )),
  CONSTRAINT scholarships_published_required_check CHECK (
    publication_state <> 'published' OR source_fact_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS scholarships_availability_idx
  ON public.scholarships (availability, publication_state);

CREATE INDEX IF NOT EXISTS scholarships_name_trgm_idx
  ON public.scholarships USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.catalog_revisions (
  revision bigint PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  reason text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.catalog_snapshots (
  revision bigint PRIMARY KEY REFERENCES public.catalog_revisions (revision) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL
);

ALTER TABLE public.application_deadlines
  DROP CONSTRAINT IF EXISTS application_deadlines_program_fkey;

ALTER TABLE public.application_deadlines
  ADD CONSTRAINT application_deadlines_program_fkey
  FOREIGN KEY (program_id) REFERENCES public.programs (id) ON DELETE RESTRICT;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_program_fkey;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_program_fkey
  FOREIGN KEY (program_id) REFERENCES public.programs (id) ON DELETE RESTRICT;

ALTER TABLE public.application_fee_rules
  DROP CONSTRAINT IF EXISTS application_fee_rules_source_fact_fkey;

ALTER TABLE public.application_fee_rules
  ADD CONSTRAINT application_fee_rules_source_fact_fkey
  FOREIGN KEY (source_fact_id) REFERENCES public.source_facts (id) ON DELETE RESTRICT;

ALTER TABLE public.application_deadlines
  DROP CONSTRAINT IF EXISTS application_deadlines_source_fact_fkey;

ALTER TABLE public.application_deadlines
  ADD CONSTRAINT application_deadlines_source_fact_fkey
  FOREIGN KEY (source_fact_id) REFERENCES public.source_facts (id) ON DELETE RESTRICT;

CREATE OR REPLACE VIEW public.catalog_universities_public AS
SELECT
  id,
  name,
  slug,
  aliases,
  country,
  city,
  state_region,
  type,
  latitude,
  longitude,
  website_url,
  virtual_tour_url,
  tour_video_url,
  publication_state
FROM public.universities
WHERE publication_state = 'published';

CREATE OR REPLACE VIEW public.catalog_programs_public AS
SELECT
  p.id,
  p.university_id,
  p.name,
  p.level,
  p.field_id,
  p.discipline_ids,
  p.specialization_ids,
  p.duration_value,
  p.duration_unit,
  p.study_modes,
  p.general_url,
  p.accreditation,
  p.international_ratio,
  p.scholarship_availability,
  p.minimum_grade,
  p.publication_state,
  annual.amount AS annual_tuition_amount,
  annual.currency AS annual_tuition_currency,
  full_course.amount AS full_program_tuition_amount,
  full_course.currency AS full_program_tuition_currency
FROM public.programs p
LEFT JOIN public.program_costs annual
  ON annual.program_id = p.id
  AND annual.fee_basis = 'annual'
  AND annual.residency_category = 'unspecified'
LEFT JOIN public.program_costs full_course
  ON full_course.program_id = p.id
  AND full_course.fee_basis = 'full_program'
  AND full_course.residency_category = 'unspecified'
WHERE p.publication_state = 'published';

CREATE OR REPLACE VIEW public.catalog_scholarships_public AS
SELECT
  id,
  name,
  provider_name,
  official_url,
  provider_type,
  type,
  country_codes,
  levels,
  field_ids,
  university_id,
  availability,
  award_amount,
  award_currency,
  award_percent,
  award_basis,
  deadline_date,
  deadline_month,
  deadline_precision,
  publication_state
FROM public.scholarships
WHERE publication_state = 'published';

CREATE OR REPLACE VIEW public.catalog_accommodations_public AS
SELECT
  id,
  university_id,
  name,
  type,
  amount,
  currency,
  basis,
  meal_plan,
  distance_km,
  transport,
  proximity,
  publication_state
FROM public.accommodations
WHERE publication_state = 'published';

CREATE OR REPLACE VIEW public.catalog_rankings_public AS
SELECT
  r.id,
  r.university_id,
  r.program_id,
  r.publisher,
  r.edition_year,
  r.subject,
  r.rank_representation,
  r.rank_min,
  r.rank_max
FROM public.rankings r
JOIN public.universities u ON u.id = r.university_id
WHERE u.publication_state = 'published';

CREATE OR REPLACE VIEW public.catalog_program_intakes_public AS
SELECT
  i.id,
  i.program_id,
  i.intake_year,
  i.intake_month,
  i.season,
  i.deadline_date,
  i.deadline_month,
  i.deadline_precision,
  i.timezone
FROM public.program_intakes i
JOIN public.programs p ON p.id = i.program_id
WHERE p.publication_state = 'published';

CREATE OR REPLACE VIEW public.catalog_entry_criteria_public AS
SELECT
  e.id,
  e.program_id,
  e.criterion_key,
  e.kind,
  e.requirement,
  e.mandatory,
  e.weight,
  e.revision
FROM public.entry_criteria e
JOIN public.programs p ON p.id = e.program_id
WHERE p.publication_state = 'published';

CREATE OR REPLACE FUNCTION commands.can_transition_catalog_state(
  p_from text,
  p_to text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_from = p_to THEN false
    WHEN p_from = 'draft' THEN p_to IN ('in_review', 'withdrawn')
    WHEN p_from = 'in_review' THEN p_to IN ('published', 'draft', 'withdrawn')
    WHEN p_from = 'published' THEN p_to IN ('withdrawn', 'in_review')
    WHEN p_from = 'withdrawn' THEN p_to = 'draft'
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION commands.catalog_entity_has_provenance(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.source_facts f
    JOIN public.source_documents d ON d.id = f.document_id
    WHERE f.entity_type = p_entity_type
      AND f.entity_id = p_entity_id
      AND f.verified_by IS NOT NULL
      AND f.verified_at IS NOT NULL
      AND f.next_review_at IS NOT NULL
      AND d.canonical_url IS NOT NULL
  )
$$;

CREATE OR REPLACE FUNCTION commands.refresh_catalog_snapshot(
  p_actor uuid,
  p_reason text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  next_revision bigint;
BEGIN
  UPDATE public.platform_counters
  SET next_value = next_value + 1
  WHERE name = 'catalog_revision'
  RETURNING next_value - 1 INTO next_revision;

  INSERT INTO public.catalog_revisions (revision, published_by, reason)
  VALUES (next_revision, p_actor, p_reason);

  INSERT INTO public.catalog_snapshots (revision, snapshot)
  VALUES (
    next_revision,
    jsonb_build_object(
      'revision', next_revision,
      'universities', COALESCE((SELECT jsonb_agg(to_jsonb(u)) FROM public.catalog_universities_public u), '[]'::jsonb),
      'programs', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.catalog_programs_public p), '[]'::jsonb),
      'scholarships', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.catalog_scholarships_public s), '[]'::jsonb)
    )
  );

  RETURN next_revision;
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_source_document(
  p_canonical_url text,
  p_official_host text,
  p_retrieved_at timestamptz,
  p_content_hash text,
  p_excerpt text,
  p_permission_basis text,
  p_method text,
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

  INSERT INTO public.source_documents (
    canonical_url, official_host, retrieved_at, content_hash, excerpt,
    permission_basis, method
  ) VALUES (
    p_canonical_url, p_official_host, p_retrieved_at, p_content_hash, p_excerpt,
    p_permission_basis, p_method
  )
  RETURNING id INTO row_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'upsert_source_document',
    'source_documents',
    row_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('url', p_canonical_url)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'source_documents',
    row_id,
    1,
    'source_document_upserted',
    jsonb_build_object('id', row_id)
  );

  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_source_fact(
  p_document_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_field_path text,
  p_value_json jsonb,
  p_excerpt text,
  p_source_type text,
  p_next_review_at timestamptz,
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

  INSERT INTO public.source_facts (
    document_id, entity_type, entity_id, field_path, value_json, excerpt,
    source_type, verified_by, verified_at, next_review_at
  ) VALUES (
    p_document_id, p_entity_type, p_entity_id, p_field_path, p_value_json, p_excerpt,
    p_source_type, actor, now(), p_next_review_at
  )
  RETURNING id INTO row_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'upsert_source_fact',
    'source_facts',
    row_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('entityType', p_entity_type, 'entityId', p_entity_id)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'source_facts',
    row_id,
    1,
    'source_fact_upserted',
    jsonb_build_object('id', row_id)
  );

  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_university(
  p_id uuid,
  p_name text,
  p_slug text,
  p_country text,
  p_city text,
  p_type text,
  p_website_url text,
  p_aliases text[],
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

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 OR p_name IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.universities (
      name, slug, country, city, type, website_url, aliases, publication_state
    ) VALUES (
      p_name, p_slug, p_country, p_city, p_type, p_website_url,
      COALESCE(p_aliases, '{}'), 'draft'
    )
    RETURNING id INTO row_id;
  ELSE
    UPDATE public.universities
    SET
      name = p_name,
      slug = COALESCE(p_slug, slug),
      country = p_country,
      city = p_city,
      type = p_type,
      website_url = p_website_url,
      aliases = COALESCE(p_aliases, aliases),
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
    'upsert_university',
    'universities',
    row_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('name', p_name)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'universities',
    row_id,
    1,
    'university_upserted',
    jsonb_build_object('id', row_id)
  );

  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_program(
  p_id uuid,
  p_university_id uuid,
  p_name text,
  p_level text,
  p_field_id uuid,
  p_duration_value numeric,
  p_duration_unit text,
  p_study_modes text[],
  p_general_url text,
  p_international_ratio numeric,
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

  IF p_id IS NULL THEN
    INSERT INTO public.programs (
      university_id, name, level, field_id, duration_value, duration_unit,
      study_modes, general_url, international_ratio, publication_state
    ) VALUES (
      p_university_id, p_name, p_level, p_field_id, p_duration_value, p_duration_unit,
      p_study_modes, p_general_url, p_international_ratio, 'draft'
    )
    RETURNING id INTO row_id;
  ELSE
    UPDATE public.programs
    SET
      name = p_name,
      level = p_level,
      field_id = p_field_id,
      duration_value = p_duration_value,
      duration_unit = p_duration_unit,
      study_modes = p_study_modes,
      general_url = p_general_url,
      international_ratio = p_international_ratio,
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
    'upsert_program',
    'programs',
    row_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('name', p_name)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'programs',
    row_id,
    1,
    'program_upserted',
    jsonb_build_object('id', row_id)
  );

  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_program_cost(
  p_program_id uuid,
  p_academic_year text,
  p_fee_basis text,
  p_amount numeric,
  p_currency text,
  p_residency_category text,
  p_source_fact_id uuid,
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

  IF p_source_fact_id IS NULL OR p_amount IS NULL OR p_currency IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.program_costs (
    program_id, academic_year, fee_basis, amount, currency,
    residency_category, source_fact_id
  ) VALUES (
    p_program_id, p_academic_year, p_fee_basis, p_amount, p_currency,
    COALESCE(p_residency_category, 'unspecified'), p_source_fact_id
  )
  ON CONFLICT (program_id, academic_year, fee_basis, residency_category)
  DO UPDATE SET
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    source_fact_id = EXCLUDED.source_fact_id
  RETURNING id INTO row_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'upsert_program_cost',
    'program_costs',
    row_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('feeBasis', p_fee_basis, 'amount', p_amount)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'program_costs',
    row_id,
    1,
    'program_cost_upserted',
    jsonb_build_object('id', row_id, 'fee_basis', p_fee_basis)
  );

  RETURN jsonb_build_object('id', row_id);
END;
$$;

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
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'program' THEN
    UPDATE public.programs
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'scholarship' THEN
    UPDATE public.scholarships
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id;
  ELSE
    UPDATE public.accommodations
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id;
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
    1,
    'catalog_publication_changed',
    jsonb_build_object('id', p_entity_id, 'state', p_next_state)
  );

  RETURN jsonb_build_object(
    'id', p_entity_id,
    'state', p_next_state,
    'revision', revision
  );
END;
$$;

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_action_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.programs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.program_action_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.program_intakes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.program_costs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.entry_criteria FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rankings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_snapshots FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.programs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.program_action_links
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.program_intakes
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.program_costs
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.accommodations
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.entry_criteria
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.rankings FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.scholarships
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.catalog_revisions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.catalog_snapshots
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.catalog_universities_public TO anon, authenticated;
GRANT SELECT ON public.catalog_programs_public TO anon, authenticated;
GRANT SELECT ON public.catalog_scholarships_public TO anon, authenticated;
GRANT SELECT ON public.catalog_accommodations_public TO anon, authenticated;
GRANT SELECT ON public.catalog_rankings_public TO anon, authenticated;
GRANT SELECT ON public.catalog_program_intakes_public TO anon, authenticated;
GRANT SELECT ON public.catalog_entry_criteria_public TO anon, authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commands
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION public.is_study_mode_list(text[]) TO authenticated, gsc_api_executor;
GRANT EXECUTE ON FUNCTION public.catalog_page_limit(integer) TO anon, authenticated, gsc_api_executor;
GRANT EXECUTE ON FUNCTION public.catalog_page_offset(integer) TO anon, authenticated, gsc_api_executor;
