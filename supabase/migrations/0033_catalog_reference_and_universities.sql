-- Module 7 reference data + provenance + leftover universities reshape.
-- D5: drop acceptance_rate. Leftover rows become unpublished so the
-- public catalog can be empty. No country inference from leftover names.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.countries (
  code char(2) PRIMARY KEY,
  name text NOT NULL,
  supported boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.currencies (
  code char(3) PRIMARY KEY,
  name text NOT NULL,
  minor_units smallint NOT NULL,
  CONSTRAINT currencies_minor_units_check CHECK (minor_units BETWEEN 0 AND 4)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  parent_id uuid REFERENCES public.taxonomy_terms (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT taxonomy_terms_kind_check CHECK (kind IN (
    'field',
    'discipline',
    'specialization'
  )),
  CONSTRAINT taxonomy_terms_kind_code_key UNIQUE (kind, code)
);

CREATE OR REPLACE FUNCTION commands.taxonomy_parent_kind(p_kind text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_kind
    WHEN 'discipline' THEN 'field'
    WHEN 'specialization' THEN 'discipline'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION commands.enforce_taxonomy_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_kind text;
  walk uuid;
BEGIN
  IF NEW.id IS NOT NULL AND NEW.parent_id IS NOT NULL AND NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF NEW.kind = 'field' AND NEW.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF NEW.kind <> 'field' AND NEW.parent_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT kind INTO parent_kind
    FROM public.taxonomy_terms
    WHERE id = NEW.parent_id;

    IF parent_kind IS DISTINCT FROM commands.taxonomy_parent_kind(NEW.kind) THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;

    walk := NEW.parent_id;
    WHILE walk IS NOT NULL LOOP
      IF walk = NEW.id THEN
        RAISE EXCEPTION 'VALIDATION_FAILED';
      END IF;
      SELECT parent_id INTO walk FROM public.taxonomy_terms WHERE id = walk;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS taxonomy_terms_parent ON public.taxonomy_terms;
CREATE TRIGGER taxonomy_terms_parent
  BEFORE INSERT OR UPDATE OF parent_id, kind ON public.taxonomy_terms
  FOR EACH ROW
  EXECUTE FUNCTION commands.enforce_taxonomy_parent();

CREATE TABLE IF NOT EXISTS public.platform_counters (
  name text PRIMARY KEY,
  next_value bigint NOT NULL CHECK (next_value > 0)
);

INSERT INTO public.platform_counters (name, next_value)
VALUES ('catalog_revision', 1)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  canonical_url text NOT NULL,
  official_host text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  content_hash text NOT NULL,
  snapshot_file_id uuid,
  excerpt text,
  permission_basis text NOT NULL,
  method text NOT NULL,
  http_status smallint,
  license_ref text,
  CONSTRAINT source_documents_method_check CHECK (method IN (
    'manual',
    'automated',
    'university_partner'
  )),
  CONSTRAINT source_documents_permission_check CHECK (permission_basis IN (
    'official_public_page',
    'licensed',
    'partner_grant',
    'fair_dealing_excerpt'
  ))
);

CREATE INDEX IF NOT EXISTS source_documents_url_retrieved_idx
  ON public.source_documents (canonical_url, retrieved_at DESC);

CREATE TABLE IF NOT EXISTS public.source_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  document_id uuid NOT NULL REFERENCES public.source_documents (id) ON DELETE RESTRICT,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field_path text NOT NULL,
  value_json jsonb NOT NULL,
  excerpt text,
  source_type text NOT NULL,
  verified_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  verified_at timestamptz,
  next_review_at timestamptz,
  CONSTRAINT source_facts_entity_type_check CHECK (entity_type IN (
    'university',
    'program',
    'scholarship',
    'accommodation',
    'ranking',
    'entry_criterion',
    'program_cost',
    'program_intake'
  )),
  CONSTRAINT source_facts_source_type_check CHECK (source_type IN (
    'official_university',
    'government',
    'ranking_provider',
    'university_partner'
  ))
);

CREATE INDEX IF NOT EXISTS source_facts_entity_idx
  ON public.source_facts (entity_type, entity_id, field_path);

INSERT INTO public.countries (code, name, supported) VALUES
  ('AE', 'United Arab Emirates', true),
  ('AU', 'Australia', true),
  ('CA', 'Canada', true),
  ('DE', 'Germany', true),
  ('FR', 'France', true),
  ('GB', 'United Kingdom', true),
  ('IE', 'Ireland', true),
  ('IN', 'India', true),
  ('KE', 'Kenya', true),
  ('NL', 'Netherlands', true),
  ('NZ', 'New Zealand', true),
  ('PK', 'Pakistan', true),
  ('SG', 'Singapore', true),
  ('US', 'United States', true),
  ('ZA', 'South Africa', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.currencies (code, name, minor_units) VALUES
  ('AUD', 'Australian dollar', 2),
  ('CAD', 'Canadian dollar', 2),
  ('EUR', 'Euro', 2),
  ('GBP', 'Pound sterling', 2),
  ('INR', 'Indian rupee', 2),
  ('KES', 'Kenyan shilling', 2),
  ('NZD', 'New Zealand dollar', 2),
  ('PKR', 'Pakistani rupee', 2),
  ('SGD', 'Singapore dollar', 2),
  ('USD', 'United States dollar', 2),
  ('ZAR', 'South African rand', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.taxonomy_terms (id, kind, code, label) VALUES
  ('20000000-0000-4000-8000-000000000001', 'field', 'stem', 'STEM'),
  ('20000000-0000-4000-8000-000000000002', 'field', 'engineering', 'Engineering'),
  ('20000000-0000-4000-8000-000000000003', 'field', 'it', 'IT'),
  ('20000000-0000-4000-8000-000000000004', 'field', 'business', 'Business'),
  ('20000000-0000-4000-8000-000000000005', 'field', 'arts', 'Arts'),
  ('20000000-0000-4000-8000-000000000006', 'field', 'medicine', 'Medicine'),
  ('20000000-0000-4000-8000-000000000007', 'field', 'health', 'Health'),
  ('20000000-0000-4000-8000-000000000008', 'field', 'law', 'Law'),
  ('20000000-0000-4000-8000-000000000009', 'field', 'other', 'Other'),
  ('20000000-0000-4000-8000-00000000000a', 'field', 'undecided', 'Undecided')
ON CONFLICT (kind, code) DO NOTHING;

INSERT INTO public.taxonomy_terms (id, parent_id, kind, code, label) VALUES
  (
    '20000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000001',
    'discipline',
    'computer_science',
    'Computer Science'
  ),
  (
    '20000000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000002',
    'discipline',
    'mechanical_engineering',
    'Mechanical Engineering'
  ),
  (
    '20000000-0000-4000-8000-000000000013',
    '20000000-0000-4000-8000-000000000002',
    'discipline',
    'electrical_engineering',
    'Electrical Engineering'
  ),
  (
    '20000000-0000-4000-8000-000000000014',
    '20000000-0000-4000-8000-000000000002',
    'discipline',
    'civil_engineering',
    'Civil Engineering'
  ),
  (
    '20000000-0000-4000-8000-000000000015',
    '20000000-0000-4000-8000-000000000001',
    'discipline',
    'biomedical_engineering',
    'Biomedical Engineering'
  ),
  (
    '20000000-0000-4000-8000-000000000016',
    '20000000-0000-4000-8000-000000000001',
    'discipline',
    'data_science',
    'Data Science'
  )
ON CONFLICT (kind, code) DO NOTHING;

INSERT INTO public.taxonomy_terms (id, parent_id, kind, code, label) VALUES
  (
    '20000000-0000-4000-8000-000000000021',
    '20000000-0000-4000-8000-000000000011',
    'specialization',
    'artificial_intelligence',
    'Artificial Intelligence'
  ),
  (
    '20000000-0000-4000-8000-000000000022',
    '20000000-0000-4000-8000-000000000011',
    'specialization',
    'cybersecurity',
    'Cybersecurity'
  ),
  (
    '20000000-0000-4000-8000-000000000023',
    '20000000-0000-4000-8000-000000000011',
    'specialization',
    'software_development',
    'Software Development'
  ),
  (
    '20000000-0000-4000-8000-000000000024',
    '20000000-0000-4000-8000-000000000011',
    'specialization',
    'game_development',
    'Game Development'
  ),
  (
    '20000000-0000-4000-8000-000000000025',
    '20000000-0000-4000-8000-000000000011',
    'specialization',
    'not_yet_decided',
    'Not yet decided'
  )
ON CONFLICT (kind, code) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.universities
    WHERE length(btrim(country)) <> 2
  ) THEN
    RAISE EXCEPTION 'leftover universities.country is not ISO-2; will not invent a country code';
  END IF;
END
$$;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS state_region text;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS type text;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS latitude numeric(9, 6);

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS longitude numeric(9, 6);

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS website_url text;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS logo_id uuid;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS contacts jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS virtual_tour_url text;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS tour_video_url text;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS publication_state text NOT NULL DEFAULT 'draft';

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS migration_source text;

UPDATE public.universities
SET
  slug = COALESCE(slug, 'legacy-' || replace(id::text, '-', '')),
  publication_state = CASE
    WHEN migration_source = 'leftover' THEN publication_state
    WHEN slug IS NULL THEN 'withdrawn'
    ELSE publication_state
  END,
  migration_source = COALESCE(migration_source, 'leftover'),
  country = upper(btrim(country));

ALTER TABLE public.universities
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.universities
  ALTER COLUMN country TYPE char(2)
  USING upper(btrim(country))::char(2);

ALTER TABLE public.universities
  DROP CONSTRAINT IF EXISTS universities_country_fkey;

ALTER TABLE public.universities
  ADD CONSTRAINT universities_country_fkey
  FOREIGN KEY (country) REFERENCES public.countries (code);

ALTER TABLE public.universities
  DROP CONSTRAINT IF EXISTS universities_slug_key;

ALTER TABLE public.universities
  ADD CONSTRAINT universities_slug_key UNIQUE (slug);

ALTER TABLE public.universities
  DROP CONSTRAINT IF EXISTS universities_version_check;

ALTER TABLE public.universities
  ADD CONSTRAINT universities_version_check CHECK (version > 0);

ALTER TABLE public.universities
  DROP CONSTRAINT IF EXISTS universities_publication_check;

ALTER TABLE public.universities
  ADD CONSTRAINT universities_publication_check CHECK (publication_state IN (
    'draft',
    'in_review',
    'published',
    'withdrawn'
  ));

ALTER TABLE public.universities
  DROP CONSTRAINT IF EXISTS universities_type_check;

ALTER TABLE public.universities
  ADD CONSTRAINT universities_type_check CHECK (
    type IS NULL OR type IN (
      'public',
      'private',
      'research',
      'community_college'
    )
  );

ALTER TABLE public.universities
  DROP CONSTRAINT IF EXISTS universities_coordinates_check;

ALTER TABLE public.universities
  ADD CONSTRAINT universities_coordinates_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (
      latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND latitude BETWEEN -90 AND 90
      AND longitude BETWEEN -180 AND 180
    )
  );

ALTER TABLE public.universities
  DROP CONSTRAINT IF EXISTS universities_aliases_check;

ALTER TABLE public.universities
  ADD CONSTRAINT universities_aliases_check CHECK (cardinality(aliases) <= 20);

ALTER TABLE public.universities
  DROP CONSTRAINT IF EXISTS universities_published_required_check;

ALTER TABLE public.universities
  ADD CONSTRAINT universities_published_required_check CHECK (
    publication_state <> 'published'
    OR (
      city IS NOT NULL
      AND type IS NOT NULL
      AND website_url IS NOT NULL
    )
  );

ALTER TABLE public.universities
  DROP COLUMN IF EXISTS acceptance_rate;

ALTER TABLE public.universities
  DROP COLUMN IF EXISTS tuition_fee;

ALTER TABLE public.universities
  DROP COLUMN IF EXISTS minimum_gpa;

ALTER TABLE public.universities
  DROP COLUMN IF EXISTS ranking;

CREATE OR REPLACE FUNCTION commands.set_university_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := 'u-' || replace(NEW.id::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS universities_set_slug ON public.universities;
CREATE TRIGGER universities_set_slug
  BEFORE INSERT OR UPDATE OF slug ON public.universities
  FOR EACH ROW
  EXECUTE FUNCTION commands.set_university_slug();

CREATE INDEX IF NOT EXISTS universities_country_city_idx
  ON public.universities (country, city);

CREATE INDEX IF NOT EXISTS universities_publication_idx
  ON public.universities (publication_state);

CREATE INDEX IF NOT EXISTS universities_name_trgm_idx
  ON public.universities USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS universities_city_trgm_idx
  ON public.universities USING gin (city gin_trgm_ops);

DROP POLICY IF EXISTS universities_select_authenticated ON public.universities;
DROP POLICY IF EXISTS universities_insert_admin ON public.universities;
DROP POLICY IF EXISTS universities_update_admin ON public.universities;
DROP POLICY IF EXISTS universities_delete_admin ON public.universities;

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities FORCE ROW LEVEL SECURITY;

CREATE POLICY universities_select_published
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (publication_state = 'published');

CREATE POLICY universities_select_own_leftover
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.university_id = universities.id
        AND a.student_id = auth.uid()
    )
  );

REVOKE ALL ON public.universities
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.universities TO authenticated;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.source_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.source_facts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.platform_counters FORCE ROW LEVEL SECURITY;

CREATE POLICY countries_select_all
  ON public.countries FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY currencies_select_all
  ON public.currencies FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY taxonomy_terms_select_active
  ON public.taxonomy_terms FOR SELECT TO anon, authenticated
  USING (active);

REVOKE ALL ON public.countries FROM PUBLIC, service_role;
REVOKE ALL ON public.currencies FROM PUBLIC, service_role;
REVOKE ALL ON public.taxonomy_terms FROM PUBLIC, service_role;
REVOKE ALL ON public.source_documents
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.source_facts
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.platform_counters
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.countries TO anon, authenticated;
GRANT SELECT ON public.currencies TO anon, authenticated;
GRANT SELECT ON public.taxonomy_terms TO anon, authenticated;
