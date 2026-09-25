-- pgTAP for remote `test db`, plus two command bugs found on the first linked run.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

GRANT gsc_api_executor TO postgres;

CREATE OR REPLACE FUNCTION commands.sync_student_case_grants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  grant_scope text;
BEGIN
  IF NEW.student_account_id IS NULL THEN
    RETURN NEW;
  END IF;
  FOREACH grant_scope IN ARRAY ARRAY[
    'profile.read', 'profile.write', 'finance.read', 'finance.write',
    'shortlist.read', 'shortlist.write', 'booking.manage', 'report.read',
    'task.read', 'task.write', 'journey.read'
  ]
  LOOP
    INSERT INTO public.case_grants (case_id, account_id, scope)
    VALUES (NEW.id, NEW.student_account_id, grant_scope)
    ON CONFLICT (case_id, account_id, scope) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION commands.import_catalog_rows(
  p_kind text,
  p_rows jsonb,
  p_dry_run boolean,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  batch_id uuid;
  item jsonb;
  idx integer := 0;
  accepted integer := 0;
  rejected integer := 0;
  missing text[];
  row_status text;
  errors jsonb;
  url text;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.import_batches (
    actor_id, kind, status, dry_run
  ) VALUES (
    actor,
    p_kind,
    CASE WHEN p_dry_run THEN 'dry_run' ELSE 'applied' END,
    p_dry_run
  )
  RETURNING id INTO batch_id;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb))
  LOOP
    idx := idx + 1;
    missing := ARRAY[]::text[];
    IF COALESCE(item ->> 'entity_type', '') = '' THEN
      missing := array_append(missing, 'entity_type');
    END IF;
    IF COALESCE(item ->> 'field_path', '') = '' THEN
      missing := array_append(missing, 'field_path');
    END IF;
    IF item -> 'value' IS NULL OR item ->> 'value' = '' THEN
      missing := array_append(missing, 'value');
    END IF;
    IF COALESCE(item ->> 'official_url', '') = '' THEN
      missing := array_append(missing, 'official_url');
    END IF;
    IF COALESCE(item ->> 'retrieved_at', '') = '' THEN
      missing := array_append(missing, 'retrieved_at');
    END IF;
    IF COALESCE(item ->> 'content_hash', '') = '' THEN
      missing := array_append(missing, 'content_hash');
    END IF;
    IF COALESCE(item ->> 'excerpt', '') = '' THEN
      missing := array_append(missing, 'excerpt');
    END IF;
    IF COALESCE(item ->> 'source_type', '') = '' THEN
      missing := array_append(missing, 'source_type');
    END IF;
    IF COALESCE(item ->> 'next_review_at', '') = '' THEN
      missing := array_append(missing, 'next_review_at');
    END IF;

    url := item ->> 'official_url';
    IF cardinality(missing) > 0 THEN
      row_status := 'rejected';
      errors := jsonb_build_array(
        'Missing provenance: ' || array_to_string(missing, ', ') || '. The row was rejected, not guessed.'
      );
      rejected := rejected + 1;
    ELSIF url IS NULL OR url !~* '^https?://' THEN
      row_status := 'rejected';
      errors := jsonb_build_array('official_url is not an allowable public http(s) URL.');
      rejected := rejected + 1;
    ELSE
      row_status := 'accepted';
      errors := '[]'::jsonb;
      accepted := accepted + 1;
      IF NOT p_dry_run AND item ? 'entity_id' AND (item ->> 'entity_id') IS NOT NULL THEN
        PERFORM commands.apply_catalog_field(
          item ->> 'entity_type',
          (item ->> 'entity_id')::uuid,
          item ->> 'field_path',
          item -> 'value'
        );
      END IF;
    END IF;

    INSERT INTO public.import_rows (
      batch_id, row_number, external_key, normalized, errors, status
    ) VALUES (
      batch_id, idx, item ->> 'entity_id', item, errors, row_status
    );
  END LOOP;

  UPDATE public.import_batches
  SET accepted_count = accepted, rejected_count = rejected
  WHERE id = batch_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'import_catalog_rows',
    'import_batches',
    batch_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('dryRun', p_dry_run, 'accepted', accepted, 'rejected', rejected)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'import_batches',
    batch_id,
    1,
    'catalog_import_reported',
    jsonb_build_object('id', batch_id, 'dryRun', p_dry_run)
  );

  RETURN jsonb_build_object(
    'id', batch_id,
    'dryRun', p_dry_run,
    'accepted', accepted,
    'rejected', rejected,
    'published', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION commands.sync_student_case_grants() TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION commands.import_catalog_rows(text, jsonb, boolean, text) TO gsc_api_executor;
