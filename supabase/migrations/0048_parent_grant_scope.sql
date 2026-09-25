-- Parent grant sync: PL/pgSQL variable `scope` is ambiguous with case_grants.scope.

CREATE OR REPLACE FUNCTION commands.sync_parent_case_grants(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, commands
AS $$
DECLARE
  link public.parent_links%ROWTYPE;
  grant_scope text;
  scopes text[];
BEGIN
  SELECT * INTO link FROM public.parent_links WHERE id = p_link_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.case_grants
  SET revoked_at = now()
  WHERE parent_link_id = p_link_id
    AND revoked_at IS NULL;

  IF link.status IS DISTINCT FROM 'active' OR link.revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT pi.scopes INTO scopes
  FROM public.parent_invitations pi
  WHERE pi.case_id = link.case_id
    AND pi.accepted_at IS NOT NULL
  ORDER BY pi.accepted_at DESC
  LIMIT 1;

  IF scopes IS NULL THEN
    scopes := ARRAY['profile.read'];
  END IF;

  FOREACH grant_scope IN ARRAY scopes LOOP
    INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
    VALUES (link.case_id, link.parent_id, grant_scope, p_link_id)
    ON CONFLICT (case_id, account_id, scope) DO UPDATE
      SET revoked_at = NULL,
          parent_link_id = EXCLUDED.parent_link_id;

    IF grant_scope = 'profile.write' THEN
      INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
      VALUES (link.case_id, link.parent_id, 'profile.read', p_link_id)
      ON CONFLICT (case_id, account_id, scope) DO UPDATE
        SET revoked_at = NULL, parent_link_id = EXCLUDED.parent_link_id;
    END IF;
    IF grant_scope = 'finance.write' THEN
      INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
      VALUES (link.case_id, link.parent_id, 'finance.read', p_link_id)
      ON CONFLICT (case_id, account_id, scope) DO UPDATE
        SET revoked_at = NULL, parent_link_id = EXCLUDED.parent_link_id;
    END IF;
    IF grant_scope = 'task.write' THEN
      INSERT INTO public.case_grants (case_id, account_id, scope, parent_link_id)
      VALUES (link.case_id, link.parent_id, 'task.read', p_link_id)
      ON CONFLICT (case_id, account_id, scope) DO UPDATE
        SET revoked_at = NULL, parent_link_id = EXCLUDED.parent_link_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION commands.sync_parent_case_grants(uuid) TO gsc_api_executor;
