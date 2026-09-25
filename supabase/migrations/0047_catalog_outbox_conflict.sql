-- Repeated publication changes must not collide on outbox_events_once.

CREATE OR REPLACE FUNCTION commands.set_catalog_publication_state(
  p_entity_type text,
  p_entity_id uuid,
  p_next_state text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  current_state text;
  revision bigint;
  next_version bigint := 1;
BEGIN
  actor := commands.require_admin_scope('catalog_editorial');

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_entity_type = 'university' THEN
    SELECT publication_state INTO current_state
    FROM public.universities WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'program' THEN
    SELECT publication_state INTO current_state
    FROM public.programs WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'scholarship' THEN
    SELECT publication_state INTO current_state
    FROM public.scholarships WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'accommodation' THEN
    SELECT publication_state INTO current_state
    FROM public.accommodations WHERE id = p_entity_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF current_state IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF NOT commands.can_transition_catalog_state(current_state, p_next_state) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_next_state = 'published' THEN
    IF NOT commands.catalog_entity_has_provenance(p_entity_type, p_entity_id) THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END IF;

  IF p_entity_type = 'university' THEN
    UPDATE public.universities
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id
    RETURNING version INTO next_version;
  ELSIF p_entity_type = 'program' THEN
    UPDATE public.programs
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id
    RETURNING version INTO next_version;
  ELSIF p_entity_type = 'scholarship' THEN
    UPDATE public.scholarships
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id
    RETURNING version INTO next_version;
  ELSE
    UPDATE public.accommodations
    SET publication_state = p_next_state, version = version + 1, updated_at = now()
    WHERE id = p_entity_id
    RETURNING version INTO next_version;
  END IF;

  IF p_next_state IN ('published', 'withdrawn') THEN
    revision := commands.refresh_catalog_snapshot(actor, p_reason);
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor),
    'set_catalog_publication_state',
    p_entity_type,
    p_entity_id,
    p_reason,
    commands.request_id(),
    jsonb_build_object('from', current_state, 'to', p_next_state, 'revision', revision)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    p_entity_type,
    p_entity_id,
    COALESCE(next_version, 1),
    'catalog_publication_changed',
    jsonb_build_object('id', p_entity_id, 'state', p_next_state)
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'id', p_entity_id,
    'state', p_next_state,
    'revision', revision
  );
END;
$$;

GRANT EXECUTE ON FUNCTION commands.set_catalog_publication_state(text, uuid, text, text)
  TO gsc_api_executor;
