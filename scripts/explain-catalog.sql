EXPLAIN (FORMAT TEXT)
SELECT id, name, country
FROM catalog_universities_public
ORDER BY name
LIMIT 50;

EXPLAIN (FORMAT TEXT)
SELECT id, university_id, name, level
FROM catalog_programs_public
ORDER BY name
LIMIT 50;

EXPLAIN (FORMAT TEXT)
SELECT id, name, official_url, availability
FROM catalog_scholarships_public
ORDER BY name
LIMIT 50;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname ILIKE '%universit%'
    OR indexname ILIKE '%program%'
    OR indexname ILIKE '%scholarship%'
    OR indexname ILIKE '%publication%'
  )
ORDER BY indexname;
