EXPLAIN (FORMAT TEXT)
SELECT id, name, official_url, availability
FROM catalog_scholarships_public
ORDER BY name
LIMIT 50;
