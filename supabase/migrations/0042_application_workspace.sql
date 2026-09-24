-- Case-scoped application workspace for the rebuilt Applications screen.
-- Systems/groups/deadlines/fees/documents stay unreadable to authenticated clients.

CREATE OR REPLACE FUNCTION commands.application_workspace()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  payload jsonb;
BEGIN
  actor := commands.actor_id();

  SELECT jsonb_build_object(
    'groups', COALESCE(jsonb_agg(visible.group_row ORDER BY visible.sort_at), '[]'::jsonb)
  )
  INTO payload
  FROM (
    SELECT
      g.created_at AS sort_at,
      jsonb_build_object(
        'id', g.id,
        'caseId', g.case_id,
        'state', g.state,
        'migrationSource', g.migration_source,
        'createdAt', g.created_at,
        'system', jsonb_build_object(
          'id', s.id,
          'code', s.code,
          'name', s.name,
          'choiceModel', s.choice_model,
          'feeModel', s.fee_model,
          'deadlineModel', s.deadline_model,
          'essayModel', s.essay_model,
          'documentModel', s.document_model,
          'maxChoices', s.max_choices
        ),
        'choices', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'universityId', a.university_id,
              'universityName', COALESCE(u.name, 'Not provided'),
              'programId', a.program_id,
              'status', a.status,
              'preferenceOrder', a.preference_order,
              'version', a.version
            )
            ORDER BY a.preference_order NULLS LAST, a.created_at
          )
          FROM public.applications a
          LEFT JOIN public.universities u ON u.id = a.university_id
          WHERE a.group_id = g.id
        ), '[]'::jsonb),
        'deadlines', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', d.id,
              'systemId', d.system_id,
              'scope', d.scope,
              'universityId', d.university_id,
              'programId', d.program_id,
              'kind', d.kind,
              'precision', d.deadline_precision,
              'date', d.deadline_date,
              'month', d.deadline_month
            )
          )
          FROM public.application_deadlines d
          WHERE d.system_id = g.system_id
        ), '[]'::jsonb),
        'feeRules', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', f.id,
              'appliesTo', f.applies_to,
              'kind', f.kind,
              'amount', f.amount,
              'currency', f.currency,
              'includedChoices', f.included_choices
            )
          )
          FROM public.application_fee_rules f
          WHERE f.system_id = g.system_id
        ), '[]'::jsonb),
        'documentRequirements', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', r.id,
              'purpose', r.purpose,
              'required', r.required,
              'certifyOnce', r.certify_once,
              'universityId', r.university_id,
              'programId', r.program_id
            )
          )
          FROM public.application_document_requirements r
          WHERE r.system_id = g.system_id
        ), '[]'::jsonb)
      ) AS group_row
    FROM public.application_groups g
    JOIN public.application_systems s ON s.id = g.system_id
    WHERE EXISTS (
        SELECT 1
        FROM public.cases c
        WHERE c.id = g.case_id
          AND (c.student_account_id = actor OR c.operating_guardian_id = actor)
      )
      OR EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a.group_id = g.id
          AND a.student_id = actor
      )
  ) visible;

  RETURN COALESCE(payload, jsonb_build_object('groups', '[]'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION commands.application_workspace() TO gsc_api_executor;
