-- ADM-03/04 ingestion, import batches, quarterly review queue.
-- No production catalog seeds. SYNTHETIC fixtures live in tests only.

CREATE TABLE IF NOT EXISTS public.approved_hosts (
  host text PRIMARY KEY,
  path_prefixes text[] NOT NULL DEFAULT ARRAY['/']::text[],
  permission_basis text NOT NULL,
  reviewed_by uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  expires_at timestamptz,
  notes text,
  CONSTRAINT approved_hosts_permission_check CHECK (permission_basis IN (
    'official_public_page',
    'licensed',
    'partner_grant',
    'fair_dealing_excerpt'
  ))
);

CREATE TABLE IF NOT EXISTS public.catalog_ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  source_type text NOT NULL,
  canonical_url text NOT NULL,
  official_host text NOT NULL,
  permission_basis text NOT NULL,
  license_ref text,
  entity_type text NOT NULL,
  entity_id uuid,
  review_owner uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  status text NOT NULL,
  retrieved_at timestamptz,
  content_hash text,
  excerpt text,
  document_id uuid REFERENCES public.source_documents (id) ON DELETE RESTRICT,
  CONSTRAINT catalog_ingestion_source_check CHECK (source_type IN (
    'official_url',
    'licensed_feed',
    'manual_sourced_entry'
  )),
  CONSTRAINT catalog_ingestion_entity_check CHECK (entity_type IN (
    'university',
    'program',
    'scholarship',
    'accommodation'
  )),
  CONSTRAINT catalog_ingestion_status_check CHECK (status IN (
    'queued',
    'extracted',
    'reviewed',
    'rejected'
  )),
  CONSTRAINT catalog_ingestion_license_check CHECK (
    source_type <> 'licensed_feed' OR license_ref IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.catalog_ingestion_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.catalog_ingestion_jobs (id) ON DELETE RESTRICT,
  field_path text NOT NULL,
  current_value jsonb,
  proposed_value jsonb NOT NULL,
  excerpt text,
  decision text NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  decided_at timestamptz,
  CONSTRAINT catalog_ingestion_fields_job_path_key UNIQUE (job_id, field_path),
  CONSTRAINT catalog_ingestion_fields_decision_check CHECK (decision IN (
    'pending',
    'accepted',
    'rejected'
  ))
);

CREATE TABLE IF NOT EXISTS public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  status text NOT NULL,
  mapping_version text NOT NULL DEFAULT 'catalog_import_v1',
  dry_run boolean NOT NULL DEFAULT true,
  accepted_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  CONSTRAINT import_batches_kind_check CHECK (kind IN (
    'csv',
    'json'
  )),
  CONSTRAINT import_batches_status_check CHECK (status IN (
    'dry_run',
    'applied',
    'rejected'
  ))
);

CREATE TABLE IF NOT EXISTS public.import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.import_batches (id) ON DELETE RESTRICT,
  row_number integer NOT NULL,
  external_key text,
  normalized jsonb NOT NULL,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL,
  CONSTRAINT import_rows_batch_row_key UNIQUE (batch_id, row_number),
  CONSTRAINT import_rows_status_check CHECK (status IN (
    'accepted',
    'rejected'
  ))
);

CREATE INDEX IF NOT EXISTS catalog_ingestion_jobs_status_idx
  ON public.catalog_ingestion_jobs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS catalog_ingestion_fields_job_idx
  ON public.catalog_ingestion_fields (job_id, decision);

CREATE OR REPLACE FUNCTION commands.host_is_approved(p_host text, p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.approved_hosts h
    WHERE h.host = lower(p_host)
      AND (h.expires_at IS NULL OR h.expires_at > now())
      AND EXISTS (
        SELECT 1
        FROM unnest(h.path_prefixes) AS prefix
        WHERE p_path LIKE prefix || '%'
      )
  )
$$;

CREATE OR REPLACE FUNCTION commands.apply_catalog_field(
  p_entity_type text,
  p_entity_id uuid,
  p_field_path text,
  p_value jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_entity_type = 'university' THEN
    IF p_field_path = 'name' THEN
      UPDATE public.universities SET name = trim(both '"' from p_value::text), version = version + 1, updated_at = now() WHERE id = p_entity_id;
    ELSIF p_field_path = 'city' THEN
      UPDATE public.universities SET city = trim(both '"' from p_value::text), version = version + 1, updated_at = now() WHERE id = p_entity_id;
    ELSIF p_field_path = 'type' THEN
      UPDATE public.universities SET type = trim(both '"' from p_value::text), version = version + 1, updated_at = now() WHERE id = p_entity_id;
    ELSIF p_field_path = 'website_url' THEN
      UPDATE public.universities SET website_url = trim(both '"' from p_value::text), version = version + 1, updated_at = now() WHERE id = p_entity_id;
    ELSIF p_field_path = 'state_region' THEN
      UPDATE public.universities SET state_region = trim(both '"' from p_value::text), version = version + 1, updated_at = now() WHERE id = p_entity_id;
    END IF;
  ELSIF p_entity_type = 'program' THEN
    IF p_field_path = 'name' THEN
      UPDATE public.programs SET name = trim(both '"' from p_value::text), version = version + 1, updated_at = now() WHERE id = p_entity_id;
    ELSIF p_field_path = 'general_url' THEN
      UPDATE public.programs SET general_url = trim(both '"' from p_value::text), version = version + 1, updated_at = now() WHERE id = p_entity_id;
    ELSIF p_field_path = 'international_ratio' THEN
      UPDATE public.programs SET international_ratio = (p_value #>> '{}')::numeric, version = version + 1, updated_at = now() WHERE id = p_entity_id;
    END IF;
  ELSIF p_entity_type = 'scholarship' THEN
    IF p_field_path = 'name' THEN
      UPDATE public.scholarships SET name = trim(both '"' from p_value::text), version = version + 1, updated_at = now() WHERE id = p_entity_id;
    ELSIF p_field_path = 'availability' THEN
      UPDATE public.scholarships SET availability = trim(both '"' from p_value::text), version = version + 1, updated_at = now() WHERE id = p_entity_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION commands.submit_catalog_ingestion(
  p_source_type text,
  p_canonical_url text,
  p_official_host text,
  p_path text,
  p_permission_basis text,
  p_license_ref text,
  p_entity_type text,
  p_entity_id uuid,
  p_review_owner uuid,
  p_retrieved_at timestamptz,
  p_content_hash text,
  p_excerpt text,
  p_proposed_fields jsonb,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  job_id uuid;
  document_id uuid;
  field record;
  current_value jsonb;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF NOT commands.host_is_approved(p_official_host, COALESCE(p_path, '/')) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_source_type = 'licensed_feed' AND (p_license_ref IS NULL OR btrim(p_license_ref) = '') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.source_documents (
    canonical_url, official_host, retrieved_at, content_hash, excerpt,
    permission_basis, method
  ) VALUES (
    p_canonical_url,
    lower(p_official_host),
    COALESCE(p_retrieved_at, now()),
    COALESCE(p_content_hash, 'pending'),
    p_excerpt,
    p_permission_basis,
    CASE p_source_type
      WHEN 'manual_sourced_entry' THEN 'manual'
      WHEN 'licensed_feed' THEN 'university_partner'
      ELSE 'automated'
    END
  )
  RETURNING id INTO document_id;

  INSERT INTO public.catalog_ingestion_jobs (
    source_type, canonical_url, official_host, permission_basis, license_ref,
    entity_type, entity_id, review_owner, status, retrieved_at, content_hash,
    excerpt, document_id
  ) VALUES (
    p_source_type, p_canonical_url, lower(p_official_host), p_permission_basis,
    p_license_ref, p_entity_type, p_entity_id, p_review_owner, 'extracted',
    COALESCE(p_retrieved_at, now()), p_content_hash, p_excerpt, document_id
  )
  RETURNING id INTO job_id;

  FOR field IN
    SELECT * FROM jsonb_each(COALESCE(p_proposed_fields, '{}'::jsonb))
  LOOP
    current_value := NULL;
    IF p_entity_type = 'university' AND p_entity_id IS NOT NULL THEN
      SELECT to_jsonb(u) -> field.key INTO current_value
      FROM public.universities u WHERE u.id = p_entity_id;
    ELSIF p_entity_type = 'program' AND p_entity_id IS NOT NULL THEN
      SELECT to_jsonb(p) -> field.key INTO current_value
      FROM public.programs p WHERE p.id = p_entity_id;
    ELSIF p_entity_type = 'scholarship' AND p_entity_id IS NOT NULL THEN
      SELECT to_jsonb(s) -> field.key INTO current_value
      FROM public.scholarships s WHERE s.id = p_entity_id;
    END IF;

    INSERT INTO public.catalog_ingestion_fields (
      job_id, field_path, current_value, proposed_value, excerpt
    ) VALUES (
      job_id, field.key, current_value, field.value, p_excerpt
    );
  END LOOP;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'submit_catalog_ingestion',
    'catalog_ingestion_jobs',
    job_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('url', p_canonical_url, 'autoPublish', false)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'catalog_ingestion_jobs',
    job_id,
    1,
    'catalog_ingestion_queued',
    jsonb_build_object('id', job_id, 'status', 'extracted')
  );

  RETURN jsonb_build_object('id', job_id, 'status', 'extracted', 'documentId', document_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.review_catalog_ingestion(
  p_job_id uuid,
  p_decisions jsonb,
  p_next_review_at timestamptz,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  job public.catalog_ingestion_jobs%ROWTYPE;
  item jsonb;
  v_field_path text;
  v_decision text;
  field public.catalog_ingestion_fields%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO job FROM public.catalog_ingestion_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_decisions, '[]'::jsonb))
  LOOP
    v_field_path := item ->> 'fieldPath';
    v_decision := item ->> 'decision';
    IF v_decision NOT IN ('accepted', 'rejected') THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;

    SELECT * INTO field
    FROM public.catalog_ingestion_fields
    WHERE job_id = p_job_id AND catalog_ingestion_fields.field_path = v_field_path
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;

    UPDATE public.catalog_ingestion_fields
    SET decision = v_decision, decided_by = actor, decided_at = now()
    WHERE id = field.id;

    IF v_decision = 'accepted' AND job.entity_id IS NOT NULL THEN
      PERFORM commands.apply_catalog_field(
        job.entity_type, job.entity_id, field.field_path, field.proposed_value
      );
      IF job.document_id IS NOT NULL THEN
        INSERT INTO public.source_facts (
          document_id, entity_type, entity_id, field_path, value_json, excerpt,
          source_type, verified_by, verified_at, next_review_at
        ) VALUES (
          job.document_id,
          job.entity_type,
          job.entity_id,
          field.field_path,
          field.proposed_value,
          COALESCE(field.excerpt, job.excerpt),
          'official_university',
          actor,
          now(),
          p_next_review_at
        );
      END IF;
    END IF;
  END LOOP;

  UPDATE public.catalog_ingestion_jobs
  SET status = 'reviewed', version = version + 1, updated_at = now()
  WHERE id = p_job_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'review_catalog_ingestion',
    'catalog_ingestion_jobs',
    p_job_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('autoPublish', false)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'catalog_ingestion_jobs',
    p_job_id,
    job.version + 1,
    'catalog_ingestion_reviewed',
    jsonb_build_object('id', p_job_id, 'published', false)
  );

  RETURN jsonb_build_object('id', p_job_id, 'status', 'reviewed', 'published', false);
END;
$$;

CREATE OR REPLACE FUNCTION commands.reject_catalog_ingestion(
  p_job_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.catalog_ingestion_jobs
  SET status = 'rejected', version = version + 1, updated_at = now()
  WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  UPDATE public.catalog_ingestion_fields
  SET decision = 'rejected', decided_by = actor, decided_at = now()
  WHERE job_id = p_job_id AND decision = 'pending';

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'reject_catalog_ingestion',
    'catalog_ingestion_jobs',
    p_job_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('status', 'rejected')
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'catalog_ingestion_jobs',
    p_job_id,
    1,
    'catalog_ingestion_rejected',
    jsonb_build_object('id', p_job_id)
  );

  RETURN jsonb_build_object('id', p_job_id, 'status', 'rejected');
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
    IF COALESCE(item ->> 'entity_type', '') = '' THEN missing := missing || 'entity_type'; END IF;
    IF COALESCE(item ->> 'field_path', '') = '' THEN missing := missing || 'field_path'; END IF;
    IF item -> 'value' IS NULL OR item ->> 'value' = '' THEN missing := missing || 'value'; END IF;
    IF COALESCE(item ->> 'official_url', '') = '' THEN missing := missing || 'official_url'; END IF;
    IF COALESCE(item ->> 'retrieved_at', '') = '' THEN missing := missing || 'retrieved_at'; END IF;
    IF COALESCE(item ->> 'content_hash', '') = '' THEN missing := missing || 'content_hash'; END IF;
    IF COALESCE(item ->> 'excerpt', '') = '' THEN missing := missing || 'excerpt'; END IF;
    IF COALESCE(item ->> 'source_type', '') = '' THEN missing := missing || 'source_type'; END IF;
    IF COALESCE(item ->> 'next_review_at', '') = '' THEN missing := missing || 'next_review_at'; END IF;

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

CREATE OR REPLACE FUNCTION commands.list_catalog_entities(
  p_kind text,
  p_country text,
  p_state text,
  p_review_due boolean,
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  lim integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  off integer := GREATEST(COALESCE(p_offset, 0), 0);
  items jsonb := '[]'::jsonb;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');

  IF COALESCE(p_kind, 'university') = 'university' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT
        u.id,
        u.name,
        'university' AS type,
        u.publication_state AS status,
        (
          SELECT min(f.next_review_at)
          FROM public.source_facts f
          WHERE f.entity_type = 'university' AND f.entity_id = u.id
        ) AS review_due
      FROM public.universities u
      WHERE (p_country IS NULL OR u.country = p_country)
        AND (p_state IS NULL OR u.publication_state = p_state)
        AND (
          COALESCE(p_review_due, false) = false
          OR EXISTS (
            SELECT 1 FROM public.source_facts f
            WHERE f.entity_type = 'university'
              AND f.entity_id = u.id
              AND f.next_review_at IS NOT NULL
              AND f.next_review_at < now()
          )
        )
      ORDER BY u.name
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'program' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT p.id, p.name, 'program' AS type, p.publication_state AS status,
        NULL::timestamptz AS review_due, p.university_id AS parent_id
      FROM public.programs p
      WHERE p_state IS NULL OR p.publication_state = p_state
      ORDER BY p.name
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'scholarship' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT s.id, s.name, 'scholarship' AS type, s.publication_state AS status, NULL::timestamptz AS review_due
      FROM public.scholarships s
      WHERE p_state IS NULL OR s.publication_state = p_state
      ORDER BY s.name
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'accommodation' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT a.id, a.name, 'accommodation' AS type, a.publication_state AS status,
        NULL::timestamptz AS review_due, a.university_id AS parent_id
      FROM public.accommodations a
      WHERE p_state IS NULL OR a.publication_state = p_state
      ORDER BY a.name
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'ingestion' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT j.id, j.canonical_url AS name, j.entity_type AS type, j.status,
        NULL::timestamptz AS review_due
      FROM public.catalog_ingestion_jobs j
      WHERE p_state IS NULL OR j.status = p_state
      ORDER BY j.created_at DESC
      LIMIT lim OFFSET off
    ) row_item;
  ELSIF p_kind = 'taxonomy' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb) INTO items
    FROM (
      SELECT t.id, t.label AS name, t.kind AS type,
        CASE WHEN t.active THEN 'active' ELSE 'inactive' END AS status,
        NULL::timestamptz AS review_due
      FROM public.taxonomy_terms t
      ORDER BY t.kind, t.label
      LIMIT lim OFFSET off
    ) row_item;
  END IF;

  RETURN jsonb_build_object('items', items, 'limit', lim, 'offset', off);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_catalog_review_due(
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  lim integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  off integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');

  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(row_item))
      FROM (
        SELECT DISTINCT ON (f.entity_type, f.entity_id)
          f.entity_type,
          f.entity_id,
          f.field_path,
          f.next_review_at,
          f.verified_at
        FROM public.source_facts f
        WHERE f.next_review_at IS NOT NULL AND f.next_review_at < now()
        ORDER BY f.entity_type, f.entity_id, f.next_review_at
        LIMIT lim OFFSET off
      ) row_item
    ), '[]'::jsonb),
    'limit', lim,
    'offset', off
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_catalog_ingestion_job(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  RETURN (
    SELECT jsonb_build_object(
      'job', to_jsonb(j),
      'fields', COALESCE((
        SELECT jsonb_agg(to_jsonb(f) ORDER BY f.field_path)
        FROM public.catalog_ingestion_fields f
        WHERE f.job_id = j.id
      ), '[]'::jsonb)
    )
    FROM public.catalog_ingestion_jobs j
    WHERE j.id = p_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_catalog_university(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  PERFORM commands.require_admin_scope('catalog_editorial');
  RETURN (
    SELECT jsonb_build_object(
      'university', to_jsonb(u),
      'accommodations', COALESCE((
        SELECT jsonb_agg(to_jsonb(a) ORDER BY a.name)
        FROM public.accommodations a WHERE a.university_id = u.id
      ), '[]'::jsonb),
      'rankings', COALESCE((
        SELECT jsonb_agg(to_jsonb(r) ORDER BY r.edition_year DESC)
        FROM public.rankings r WHERE r.university_id = u.id
      ), '[]'::jsonb)
    )
    FROM public.universities u
    WHERE u.id = p_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_catalog_program(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  PERFORM commands.require_admin_scope('catalog_editorial');
  RETURN (
    SELECT jsonb_build_object(
      'program', to_jsonb(p),
      'costs', COALESCE((
        SELECT jsonb_agg(to_jsonb(c) ORDER BY c.fee_basis)
        FROM public.program_costs c WHERE c.program_id = p.id
      ), '[]'::jsonb),
      'intakes', COALESCE((
        SELECT jsonb_agg(to_jsonb(i) ORDER BY i.intake_year)
        FROM public.program_intakes i WHERE i.program_id = p.id
      ), '[]'::jsonb),
      'actionLink', (
        SELECT to_jsonb(l) FROM public.program_action_links l WHERE l.program_id = p.id
      ),
      'criteria', COALESCE((
        SELECT jsonb_agg(to_jsonb(e) ORDER BY e.criterion_key, e.revision DESC)
        FROM public.entry_criteria e WHERE e.program_id = p.id
      ), '[]'::jsonb)
    )
    FROM public.programs p
    WHERE p.id = p_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_catalog_scholarship(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  PERFORM commands.require_admin_scope('catalog_editorial');
  RETURN (
    SELECT jsonb_build_object('scholarship', to_jsonb(s))
    FROM public.scholarships s
    WHERE s.id = p_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_scholarship(
  p_id uuid,
  p_name text,
  p_provider_name text,
  p_official_url text,
  p_provider_type text,
  p_country_codes text[],
  p_levels text[],
  p_field_ids uuid[],
  p_availability text,
  p_deadline_precision text,
  p_deadline_date date,
  p_deadline_month integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row_id uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.scholarships (
      name, provider_name, official_url, provider_type, country_codes, levels,
      field_ids, availability, deadline_precision, deadline_date, deadline_month
    ) VALUES (
      p_name, p_provider_name, p_official_url, p_provider_type, p_country_codes, p_levels,
      p_field_ids, p_availability, p_deadline_precision, p_deadline_date, p_deadline_month
    )
    RETURNING id INTO row_id;
  ELSE
    UPDATE public.scholarships
    SET
      name = p_name,
      provider_name = p_provider_name,
      official_url = p_official_url,
      provider_type = p_provider_type,
      country_codes = p_country_codes,
      levels = p_levels,
      field_ids = p_field_ids,
      availability = p_availability,
      deadline_precision = p_deadline_precision,
      deadline_date = p_deadline_date,
      deadline_month = p_deadline_month,
      version = version + 1,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO row_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'upsert_scholarship', 'scholarships', row_id,
    p_reason, commands.request_id(), jsonb_build_object('name', p_name)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'scholarships', row_id, 1, 'scholarship_upserted', jsonb_build_object('id', row_id)
  );
  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_accommodation(
  p_id uuid,
  p_university_id uuid,
  p_name text,
  p_type text,
  p_amount numeric,
  p_currency text,
  p_basis text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row_id uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.accommodations (
      university_id, name, type, amount, currency, basis
    ) VALUES (
      p_university_id, p_name, p_type, p_amount, p_currency, p_basis
    )
    RETURNING id INTO row_id;
  ELSE
    UPDATE public.accommodations
    SET name = p_name, type = p_type, amount = p_amount, currency = p_currency,
        basis = p_basis, version = version + 1, updated_at = now()
    WHERE id = p_id
    RETURNING id INTO row_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;
  END IF;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'upsert_accommodation', 'accommodations', row_id,
    p_reason, commands.request_id(), jsonb_build_object('name', p_name)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'accommodations', row_id, 1, 'accommodation_upserted', jsonb_build_object('id', row_id)
  );
  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_entry_criterion(
  p_program_id uuid,
  p_criterion_key text,
  p_kind text,
  p_requirement jsonb,
  p_mandatory boolean,
  p_weight numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  next_revision integer;
  row_id uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT COALESCE(max(revision), 0) + 1 INTO next_revision
  FROM public.entry_criteria
  WHERE program_id = p_program_id AND criterion_key = p_criterion_key;

  INSERT INTO public.entry_criteria (
    program_id, criterion_key, kind, requirement, mandatory, weight, revision
  ) VALUES (
    p_program_id, p_criterion_key, p_kind, p_requirement, p_mandatory, p_weight, next_revision
  )
  RETURNING id INTO row_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'upsert_entry_criterion', 'entry_criteria', row_id,
    p_reason, commands.request_id(), jsonb_build_object('revision', next_revision)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'entry_criteria', row_id, next_revision, 'entry_criterion_versioned',
    jsonb_build_object('id', row_id, 'revision', next_revision)
  );
  RETURN jsonb_build_object('id', row_id, 'revision', next_revision);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_program_intake(
  p_program_id uuid,
  p_intake_year integer,
  p_intake_month integer,
  p_deadline_precision text,
  p_deadline_date date,
  p_deadline_month integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row_id uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  INSERT INTO public.program_intakes (
    program_id, intake_year, intake_month, deadline_precision, deadline_date, deadline_month
  ) VALUES (
    p_program_id, p_intake_year, p_intake_month, p_deadline_precision, p_deadline_date, p_deadline_month
  )
  ON CONFLICT (program_id, intake_year, intake_month)
  DO UPDATE SET
    deadline_precision = EXCLUDED.deadline_precision,
    deadline_date = EXCLUDED.deadline_date,
    deadline_month = EXCLUDED.deadline_month
  RETURNING id INTO row_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'upsert_program_intake', 'program_intakes', row_id,
    p_reason, commands.request_id(), jsonb_build_object('year', p_intake_year)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'program_intakes', row_id, 1, 'program_intake_upserted', jsonb_build_object('id', row_id)
  );
  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.upsert_program_action_link(
  p_program_id uuid,
  p_application_url text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  INSERT INTO public.program_action_links (program_id, application_url)
  VALUES (p_program_id, p_application_url)
  ON CONFLICT (program_id) DO UPDATE SET application_url = EXCLUDED.application_url;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'upsert_program_action_link', 'program_action_links',
    p_program_id, p_reason, commands.request_id(), jsonb_build_object('gated', true)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'program_action_links', p_program_id, 1, 'program_action_link_upserted',
    jsonb_build_object('programId', p_program_id)
  );
  RETURN jsonb_build_object('programId', p_program_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  perms text[];
  queues jsonb := '[]'::jsonb;
BEGIN
  actor := commands.require_privileged_admin();
  perms := commands.staff_permission_list(actor);

  IF commands.has_staff_permission(actor, 'verification') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'professional_review',
        'label', 'Professional reviews',
        'href', '/admin/approvals?kind=professional',
        'count', (
          SELECT count(*)::integer
          FROM public.verification_cases
          WHERE state IN ('pending', 'needs_information')
            AND commands.verification_kind(professional_evidence)
              IN ('counselor', 'mentor', 'company')
        )
      ),
      jsonb_build_object(
        'id', 'guardian_review',
        'label', 'Guardian-link reviews',
        'href', '/admin/approvals?kind=guardian_link',
        'count', (
          SELECT count(*)::integer
          FROM public.verification_cases
          WHERE state IN ('pending', 'needs_information')
            AND commands.verification_kind(professional_evidence) = 'guardian_link'
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'supervisor') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'escalations',
        'label', 'Supervisor escalations',
        'href', '/admin/approvals?escalated=1',
        'count', (
          SELECT count(*)::integer
          FROM public.verification_cases
          WHERE state IN ('pending', 'needs_information')
            AND escalates_at <= now()
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'operations') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'recent_audit',
        'label', 'Recent audited actions',
        'href', '/admin/audit',
        'count', (
          SELECT count(*)::integer
          FROM public.audit_events
          WHERE occurred_at >= now() - interval '7 days'
        )
      )
    );
  END IF;

  IF commands.has_staff_permission(actor, 'catalog_editorial') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'ingestion_review',
        'label', 'Catalog extractions to review',
        'href', '/admin/catalog?kind=ingestion',
        'count', (
          SELECT count(*)::integer
          FROM public.catalog_ingestion_jobs
          WHERE status = 'extracted'
        )
      ),
      jsonb_build_object(
        'id', 'catalog_review_due',
        'label', 'Quarterly catalog review due',
        'href', '/admin/catalog?reviewDue=1',
        'count', (
          SELECT count(*)::integer
          FROM public.source_facts
          WHERE next_review_at IS NOT NULL AND next_review_at < now()
        )
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'homeRole', 'admin',
    'permissions', to_jsonb(perms),
    'queues', queues,
    'recentAudit', CASE
      WHEN commands.has_staff_permission(actor, 'operations') THEN (
        SELECT COALESCE(
          jsonb_agg(row_to_json(ev)::jsonb ORDER BY ev.occurred_at DESC),
          '[]'::jsonb
        )
        FROM (
          SELECT id, actor_id, action, resource_type, resource_id, occurred_at, reason
          FROM public.audit_events
          ORDER BY occurred_at DESC
          LIMIT 5
        ) ev
      )
      ELSE '[]'::jsonb
    END
  );
END;
$$;

ALTER TABLE public.approved_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_ingestion_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.approved_hosts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_ingestion_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_ingestion_fields FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.approved_hosts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.catalog_ingestion_jobs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.catalog_ingestion_fields FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.import_batches FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.import_rows FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commands
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
