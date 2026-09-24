-- SYNTHETIC - not real
-- Development and pgTAP only. Do not add this file to supabase/seed.sql
-- or run it against a production catalog. Every label includes
-- "SYNTHETIC - not real" so rows cannot be mistaken for verified data.

-- Requires an existing accounts row for reviewed_by / actor FKs.
-- catalog_editorial.test.sql inserts its own copy and rolls back.

INSERT INTO public.approved_hosts (host, path_prefixes, permission_basis, reviewed_by, notes)
SELECT
  'example.invalid',
  ARRAY['/']::text[],
  'official_public_page',
  id,
  'SYNTHETIC - not real'
FROM public.accounts
ORDER BY created_at
LIMIT 1
ON CONFLICT (host) DO NOTHING;

INSERT INTO public.universities (
  id, name, country, city, type, website_url, publication_state
) VALUES (
  'ffffff10-ffff-4fff-8fff-ffffffffffff',
  'SYNTHETIC - not real University',
  'GB',
  'London',
  'public',
  'https://example.invalid/synthetic-uni',
  'draft'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.programs (
  id, university_id, name, level, field_id, duration_value, duration_unit,
  study_modes, general_url, publication_state
) VALUES (
  'ffffff11-ffff-4fff-8fff-ffffffffffff',
  'ffffff10-ffff-4fff-8fff-ffffffffffff',
  'SYNTHETIC - not real Computer Science',
  'undergraduate',
  '20000000-0000-4000-8000-000000000001',
  3,
  'years',
  ARRAY['on_campus']::text[],
  'https://example.invalid/synthetic-program',
  'draft'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.scholarships (
  id, name, provider_name, official_url, provider_type, country_codes,
  levels, field_ids, availability, deadline_precision, publication_state
) VALUES (
  'ffffff12-ffff-4fff-8fff-ffffffffffff',
  'SYNTHETIC - not real Scholarship',
  'SYNTHETIC - not real Provider',
  'https://example.invalid/synthetic-scholarship',
  'university',
  ARRAY['GB']::char(2)[],
  ARRAY['undergraduate']::text[],
  ARRAY['20000000-0000-4000-8000-000000000001']::uuid[],
  'unknown',
  'unknown',
  'draft'
) ON CONFLICT (id) DO NOTHING;
