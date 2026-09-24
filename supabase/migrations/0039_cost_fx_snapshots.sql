-- CAT-04 cost snapshots and cached ExchangeRate-API quotes.
-- Rates are never invented. Missing FX leaves conversion unavailable.

CREATE TABLE IF NOT EXISTS public.fx_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  base char(3) NOT NULL,
  quote char(3) NOT NULL,
  rate numeric(20, 10) NOT NULL,
  provider text NOT NULL,
  captured_at timestamptz NOT NULL,
  CONSTRAINT fx_snapshots_rate_check CHECK (rate > 0),
  CONSTRAINT fx_snapshots_pair_captured_key UNIQUE (base, quote, captured_at)
);

CREATE INDEX IF NOT EXISTS fx_snapshots_pair_idx
  ON public.fx_snapshots (base, quote, captured_at DESC);

CREATE TABLE IF NOT EXISTS public.budget_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  horizon text NOT NULL DEFAULT 'first_year',
  nights_per_month smallint NOT NULL DEFAULT 30,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirmed_funding jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT budget_assumptions_case_id_key UNIQUE (case_id),
  CONSTRAINT budget_assumptions_horizon_check CHECK (horizon IN ('first_year', 'full_program')),
  CONSTRAINT budget_assumptions_nights_check CHECK (nights_per_month BETWEEN 1 AND 31)
);

CREATE TABLE IF NOT EXISTS public.cost_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE RESTRICT,
  program_id uuid,
  accommodation_id uuid,
  horizon text NOT NULL,
  calculation_version text NOT NULL,
  annual_comparison jsonb NOT NULL,
  broader_budget jsonb NOT NULL,
  readiness jsonb NOT NULL,
  fx jsonb NOT NULL,
  CONSTRAINT cost_snapshots_horizon_check CHECK (horizon IN ('first_year', 'full_program'))
);

CREATE INDEX IF NOT EXISTS cost_snapshots_case_idx
  ON public.cost_snapshots (case_id, created_at DESC);

ALTER TABLE public.financial_profiles
  ADD COLUMN IF NOT EXISTS selected_cost_snapshot_id uuid
    REFERENCES public.cost_snapshots (id) ON DELETE RESTRICT;

ALTER TABLE public.fx_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE public.budget_assumptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cost_snapshots FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.fx_snapshots FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.budget_assumptions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.cost_snapshots FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.fx_snapshots TO authenticated;
GRANT SELECT ON public.budget_assumptions TO authenticated;
GRANT SELECT ON public.cost_snapshots TO authenticated;
GRANT ALL ON public.fx_snapshots TO postgres, service_role;
GRANT ALL ON public.budget_assumptions TO postgres, service_role;
GRANT ALL ON public.cost_snapshots TO postgres, service_role;

CREATE POLICY fx_snapshots_select_authenticated
  ON public.fx_snapshots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY budget_assumptions_select_finance
  ON public.budget_assumptions FOR SELECT TO authenticated
  USING (public.can_read_finance(case_id, auth.uid()));

CREATE POLICY cost_snapshots_select_finance
  ON public.cost_snapshots FOR SELECT TO authenticated
  USING (public.can_read_finance(case_id, auth.uid()));

CREATE OR REPLACE FUNCTION commands.upsert_fx_snapshot(
  p_base text,
  p_quote text,
  p_rate numeric,
  p_provider text,
  p_captured_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  row_id uuid;
BEGIN
  IF p_rate IS NULL OR p_rate <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  INSERT INTO public.fx_snapshots (base, quote, rate, provider, captured_at)
  VALUES (upper(p_base), upper(p_quote), p_rate, p_provider, p_captured_at)
  ON CONFLICT (base, quote, captured_at) DO UPDATE
    SET rate = EXCLUDED.rate, provider = EXCLUDED.provider
  RETURNING id INTO row_id;
  RETURN jsonb_build_object('id', row_id, 'base', upper(p_base), 'quote', upper(p_quote));
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_budget_assumptions(p_case_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.require_finance_write(p_case_id);
  IF p_payload ? 'expectedVersion' THEN
    UPDATE public.cases
    SET version = version + 1, updated_at = now()
    WHERE id = p_case_id
      AND version = (p_payload ->> 'expectedVersion')::bigint;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'VERSION_CONFLICT';
    END IF;
  END IF;

  INSERT INTO public.budget_assumptions (
    case_id, horizon, nights_per_month, lines, confirmed_funding
  ) VALUES (
    p_case_id,
    coalesce(nullif(p_payload ->> 'horizon', ''), 'first_year'),
    coalesce((p_payload ->> 'nightsPerMonth')::smallint, 30),
    coalesce(p_payload -> 'lines', '[]'::jsonb),
    coalesce(p_payload -> 'confirmedFunding', '[]'::jsonb)
  )
  ON CONFLICT (case_id) DO UPDATE SET
    horizon = EXCLUDED.horizon,
    nights_per_month = EXCLUDED.nights_per_month,
    lines = EXCLUDED.lines,
    confirmed_funding = EXCLUDED.confirmed_funding,
    updated_at = now();

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'save_budget_assumptions', 'budget_assumptions', p_case_id,
    commands.request_id(), jsonb_build_object('horizon', p_payload ->> 'horizon')
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'budget_assumptions_saved', jsonb_build_object('case_id', p_case_id)
  );
  RETURN jsonb_build_object('caseId', p_case_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.save_cost_snapshot(p_case_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  snap_id uuid;
BEGIN
  actor := commands.require_finance_write(p_case_id);
  INSERT INTO public.cost_snapshots (
    case_id, program_id, accommodation_id, horizon, calculation_version,
    annual_comparison, broader_budget, readiness, fx
  ) VALUES (
    p_case_id,
    nullif(p_payload ->> 'programId', '')::uuid,
    nullif(p_payload ->> 'accommodationId', '')::uuid,
    coalesce(nullif(p_payload ->> 'horizon', ''), 'first_year'),
    coalesce(nullif(p_payload ->> 'calculationVersion', ''), '2026.1'),
    coalesce(p_payload -> 'annualComparison', '{}'::jsonb),
    coalesce(p_payload -> 'broaderBudget', '{}'::jsonb),
    coalesce(p_payload -> 'readiness', '{}'::jsonb),
    coalesce(p_payload -> 'fx', '{}'::jsonb)
  )
  RETURNING id INTO snap_id;

  UPDATE public.financial_profiles
  SET selected_cost_snapshot_id = snap_id, updated_at = now()
  WHERE case_id = p_case_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'save_cost_snapshot', 'cost_snapshots', snap_id,
    commands.request_id(), jsonb_build_object('case_id', p_case_id)
  );
  RETURN jsonb_build_object('id', snap_id, 'caseId', p_case_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.share_cost_snapshot(p_case_id uuid, p_parent_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  link public.parent_links%ROWTYPE;
BEGIN
  actor := commands.require_finance_write(p_case_id);
  SELECT * INTO link FROM public.parent_links WHERE id = p_parent_link_id;
  IF NOT FOUND OR link.case_id IS DISTINCT FROM p_case_id THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF link.status IS DISTINCT FROM 'active' OR link.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'share_cost_snapshot', 'parent_links', p_parent_link_id,
    commands.request_id(), jsonb_build_object('case_id', p_case_id)
  );
  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, aggregate_version, event_type, payload
  ) VALUES (
    'cases', p_case_id, 1, 'cost_snapshot_shared',
    jsonb_build_object('case_id', p_case_id, 'parent_link_id', p_parent_link_id)
  );
  RETURN jsonb_build_object('caseId', p_case_id, 'shared', true);
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
