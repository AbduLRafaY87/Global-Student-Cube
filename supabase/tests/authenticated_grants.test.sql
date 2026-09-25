-- Authenticated must not hold table INSERT/UPDATE/DELETE except the allowlist.
BEGIN;

SELECT no_plan();

SELECT is(
  COALESCE((
    SELECT string_agg(table_name || ':' || privilege_type, ',' ORDER BY table_name, privilege_type)
    FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
      AND table_schema = 'public'
      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
  ), ''),
  '',
  'authenticated has no INSERT/UPDATE/DELETE on public tables'
);

SELECT * FROM finish();
ROLLBACK;
