EXPLAIN (FORMAT TEXT)
SELECT id, university_id, name, level
FROM catalog_programs_public
ORDER BY name
LIMIT 50;
