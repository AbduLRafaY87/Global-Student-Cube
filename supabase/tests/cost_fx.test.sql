BEGIN;

SELECT no_plan();

SELECT throws_ok(
  $$SELECT commands.upsert_fx_snapshot('EUR', 'USD', 0, 'exchangerate-api', now())$$,
  'VALIDATION_FAILED',
  'a zero FX rate is rejected instead of stored as 1:1'
);

SELECT lives_ok(
  $$SELECT commands.upsert_fx_snapshot('EUR', 'USD', 1.1, 'exchangerate-api', '2026-09-21T12:00:00Z')$$,
  'a positive ExchangeRate-API quote can be cached'
);

SELECT * FROM finish();
ROLLBACK;
