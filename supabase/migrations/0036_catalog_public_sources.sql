-- Public projection of provenance for published catalog rows only.
-- Reviewer account ids stay off the public payload.

CREATE OR REPLACE VIEW public.catalog_source_facts_public AS
SELECT
  f.entity_type,
  f.entity_id,
  f.field_path,
  d.canonical_url,
  d.retrieved_at,
  d.permission_basis,
  f.source_type,
  f.verified_at,
  f.next_review_at
FROM public.source_facts f
JOIN public.source_documents d ON d.id = f.document_id
WHERE (
  (
    f.entity_type = 'university'
    AND EXISTS (
      SELECT 1 FROM public.universities u
      WHERE u.id = f.entity_id AND u.publication_state = 'published'
    )
  )
  OR (
    f.entity_type = 'program'
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = f.entity_id AND p.publication_state = 'published'
    )
  )
  OR (
    f.entity_type = 'scholarship'
    AND EXISTS (
      SELECT 1 FROM public.scholarships s
      WHERE s.id = f.entity_id AND s.publication_state = 'published'
    )
  )
  OR (
    f.entity_type = 'accommodation'
    AND EXISTS (
      SELECT 1 FROM public.accommodations a
      WHERE a.id = f.entity_id AND a.publication_state = 'published'
    )
  )
);

GRANT SELECT ON public.catalog_source_facts_public TO anon, authenticated;
