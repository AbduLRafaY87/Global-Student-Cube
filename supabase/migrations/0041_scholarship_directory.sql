-- URL-first scholarship directory. Leftover prototype rows become unpublished drafts.
-- Bookmarks never write financial_profiles or application groups.

CREATE OR REPLACE VIEW public.catalog_scholarships_public AS
SELECT
  s.id,
  s.name,
  s.provider_name,
  s.official_url,
  s.provider_type,
  s.type,
  s.country_codes,
  s.levels,
  s.field_ids,
  s.university_id,
  s.availability,
  s.award_amount,
  s.award_currency,
  s.award_percent,
  s.award_basis,
  s.deadline_date,
  s.deadline_month,
  s.deadline_precision,
  NULLIF(btrim(s.extended_details ->> 'eligibility_criteria'), '') AS eligibility_excerpt,
  NULLIF(btrim(s.extended_details ->> 'age_citizenship_restrictions'), '') AS age_citizenship,
  CASE
    WHEN jsonb_typeof(s.extended_details -> 'coverage') = 'array'
      THEN NULLIF(
        btrim(array_to_string(
          ARRAY(SELECT jsonb_array_elements_text(s.extended_details -> 'coverage')),
          ', '
        )),
        ''
      )
    ELSE NULLIF(btrim(s.extended_details ->> 'coverage'), '')
  END AS coverage,
  NULLIF(btrim(s.extended_details ->> 'duration'), '') AS duration,
  NULLIF(btrim(s.extended_details ->> 'renewal_conditions'), '') AS renewal_conditions,
  NULLIF(btrim(s.extended_details ->> 'application_mode'), '') AS application_mode,
  NULLIF(btrim(s.extended_details ->> 'application_fee'), '') AS application_fee,
  CASE
    WHEN jsonb_typeof(s.extended_details -> 'required_documents') = 'array'
      THEN NULLIF(
        btrim(array_to_string(
          ARRAY(SELECT jsonb_array_elements_text(s.extended_details -> 'required_documents')),
          ', '
        )),
        ''
      )
    ELSE NULLIF(btrim(s.extended_details ->> 'required_documents'), '')
  END AS required_documents,
  NULLIF(
    btrim(
      concat_ws(
        ' ',
        NULLIF(btrim(s.extended_details ->> 'contact_person_office'), ''),
        NULLIF(btrim(s.extended_details ->> 'contact_email'), ''),
        NULLIF(btrim(s.extended_details ->> 'contact_url'), '')
      )
    ),
    ''
  ) AS contact,
  NULLIF(btrim(s.extended_details ->> 'result_announcement_date'), '') AS result_date,
  sf.verified_at,
  s.publication_state
FROM public.scholarships s
LEFT JOIN public.source_facts sf ON sf.id = s.source_fact_id
WHERE s.publication_state = 'published';

GRANT SELECT ON public.catalog_scholarships_public TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.saved_scholarship_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships (id) ON DELETE RESTRICT,
  CONSTRAINT saved_scholarship_bookmarks_case_scholarship_key UNIQUE (case_id, scholarship_id)
);

CREATE OR REPLACE FUNCTION public.can_read_scholarship_bookmarks(p_case_id uuid, p_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
  SELECT public.can_read_shortlist(p_case_id, p_account_id)
$$;

ALTER TABLE public.saved_scholarship_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_scholarship_bookmarks FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.saved_scholarship_bookmarks FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.saved_scholarship_bookmarks TO authenticated;
GRANT ALL ON public.saved_scholarship_bookmarks TO postgres, service_role;

CREATE POLICY saved_scholarship_bookmarks_select_scope
  ON public.saved_scholarship_bookmarks
  FOR SELECT TO authenticated
  USING (public.can_read_scholarship_bookmarks(case_id, auth.uid()));

CREATE OR REPLACE FUNCTION commands.bookmark_scholarship(p_case_id uuid, p_scholarship_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  existing public.saved_scholarship_bookmarks%ROWTYPE;
BEGIN
  actor := commands.require_shortlist_write(p_case_id);

  PERFORM 1 FROM public.cases WHERE id = p_case_id FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1 FROM public.scholarships
    WHERE id = p_scholarship_id
      AND publication_state = 'published'
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT * INTO existing
  FROM public.saved_scholarship_bookmarks
  WHERE case_id = p_case_id AND scholarship_id = p_scholarship_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', existing.id,
      'caseId', p_case_id,
      'scholarshipId', p_scholarship_id,
      'created', false,
      'addedFunding', false
    );
  END IF;

  INSERT INTO public.saved_scholarship_bookmarks (case_id, scholarship_id)
  VALUES (p_case_id, p_scholarship_id)
  RETURNING * INTO existing;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'bookmark_scholarship', 'saved_scholarship_bookmarks', existing.id,
    commands.request_id(),
    jsonb_build_object('case_id', p_case_id, 'scholarship_id', p_scholarship_id, 'added_funding', false)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'scholarship_bookmarked',
    jsonb_build_object('case_id', p_case_id, 'scholarship_id', p_scholarship_id, 'added_funding', false)
  );

  RETURN jsonb_build_object(
    'id', existing.id,
    'caseId', p_case_id,
    'scholarshipId', p_scholarship_id,
    'created', true,
    'addedFunding', false
  );
END;
$$;

INSERT INTO public.scholarships (
  name, provider_name, official_url, provider_type, country_codes, levels, field_ids,
  availability, deadline_date, deadline_month, deadline_precision, extended_details,
  publication_state
)
SELECT
  left(coalesce(nullif(btrim(l.title), ''), 'Leftover scholarship'), 240),
  left(coalesce(nullif(btrim(l.provider), ''), 'Not provided'), 240),
  l.application_url,
  'private_foundation',
  CASE
    WHEN l.country ~ '^[A-Za-z]{2}$' THEN ARRAY[upper(l.country)]::char(2)[]
    ELSE ARRAY[]::char(2)[]
  END,
  ARRAY[]::text[],
  ARRAY[]::uuid[],
  'unknown',
  CASE WHEN l.deadline IS NOT NULL THEN l.deadline ELSE NULL END,
  NULL,
  CASE WHEN l.deadline IS NOT NULL THEN 'day' ELSE 'unknown' END,
  jsonb_build_object(
    'leftover_import', true,
    'leftover_country', l.country,
    'leftover_amount', l.amount,
    'leftover_minimum_gpa', l.minimum_gpa
  ),
  'draft'
FROM public.leftover_scholarships l
WHERE l.application_url IS NOT NULL
  AND btrim(l.application_url) <> ''
ON CONFLICT (official_url) DO NOTHING;

REVOKE INSERT, UPDATE, DELETE ON public.leftover_scholarships FROM authenticated;

GRANT EXECUTE ON FUNCTION public.can_read_scholarship_bookmarks(uuid, uuid) TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
