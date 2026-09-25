-- Immutable points ledger, referrals, catalog, redemptions, certificates.

CREATE TABLE IF NOT EXISTS public.reward_accounts (
  account_id uuid PRIMARY KEY REFERENCES public.accounts (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_fresh_auth_at timestamptz NOT NULL DEFAULT now(),
  warning_sent_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.points_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  points integer NOT NULL CHECK (points > 0),
  source_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  reversal_of uuid REFERENCES public.points_entries (id) ON DELETE RESTRICT,
  admin_reason text,
  CONSTRAINT points_entries_type_check CHECK (event_type IN (
    'earn_mentoring',
    'earn_referral',
    'reserve',
    'release',
    'redeem',
    'expire',
    'reversal'
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS points_entries_mentoring_once
  ON public.points_entries (source_id)
  WHERE event_type = 'earn_mentoring';

CREATE UNIQUE INDEX IF NOT EXISTS points_entries_referral_once
  ON public.points_entries (source_id)
  WHERE event_type = 'earn_referral';

CREATE INDEX IF NOT EXISTS points_entries_account_idx
  ON public.points_entries (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reward_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  points_cost integer NOT NULL CHECK (points_cost >= 500),
  enabled boolean NOT NULL DEFAULT false,
  inventory_policy text NOT NULL DEFAULT 'unlimited',
  inventory_count integer,
  delivery_estimate text NOT NULL,
  image_url text,
  supplier_reference text,
  funded boolean NOT NULL DEFAULT false,
  kind text NOT NULL,
  CONSTRAINT reward_catalog_category_check CHECK (category IN ('recognition', 'gift_card', 'donation')),
  CONSTRAINT reward_catalog_kind_check CHECK (kind IN ('recognition_pack', 'gift_card')),
  CONSTRAINT reward_catalog_inventory_check CHECK (inventory_policy IN ('unlimited', 'counted'))
);

CREATE TABLE IF NOT EXISTS public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  catalog_id uuid NOT NULL REFERENCES public.reward_catalog (id) ON DELETE RESTRICT,
  state text NOT NULL,
  points integer NOT NULL CHECK (points >= 500),
  CONSTRAINT redemptions_state_check CHECK (state IN (
    'draft', 'requested', 'reserved', 'fulfilling', 'fulfilled', 'failed', 'cancelled', 'released'
  ))
);

CREATE INDEX IF NOT EXISTS redemptions_account_idx
  ON public.redemptions (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  referrer_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  invitee_account_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  channel text,
  status text NOT NULL DEFAULT 'issued',
  attributed_at timestamptz,
  qualified_at timestamptz,
  CONSTRAINT referrals_status_check CHECK (status IN (
    'issued', 'visited', 'attributed', 'onboarding', 'qualified', 'credited', 'ineligible', 'review_hold'
  )),
  CONSTRAINT referrals_channel_check CHECK (
    channel IS NULL OR channel IN ('whatsapp', 'email', 'sms', 'copy_link', 'qr')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_one_invitee
  ON public.referrals (invitee_account_id)
  WHERE invitee_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON public.referrals (referrer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reward_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  redemption_id uuid NOT NULL REFERENCES public.redemptions (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  issue_id text NOT NULL UNIQUE,
  minutes integer NOT NULL CHECK (minutes >= 0),
  date_from date,
  date_to date,
  state text NOT NULL DEFAULT 'issued',
  CONSTRAINT reward_certificates_kind_check CHECK (kind IN ('certificate', 'letter')),
  CONSTRAINT reward_certificates_state_check CHECK (state IN ('pending', 'issued', 'withdrawn'))
);

CREATE TABLE IF NOT EXISTS public.gold_plus_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  body text NOT NULL,
  event_information text NOT NULL,
  published boolean NOT NULL DEFAULT false
);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'reward_accounts',
    'points_entries',
    'reward_catalog',
    'redemptions',
    'referrals',
    'reward_certificates',
    'gold_plus_invitations'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role',
      tbl
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE ON TABLE public.%I TO gsc_api_executor',
      tbl
    );
  END LOOP;
END $$;

INSERT INTO public.reward_catalog (
  code, title, category, description, points_cost, enabled, inventory_policy,
  delivery_estimate, funded, kind
) VALUES (
  'recognition-pack-500',
  'Recognition pack',
  'recognition',
  'Certificate and appreciation letter for verified mentoring contributions.',
  500,
  true,
  'unlimited',
  'Generated after fulfillment',
  true,
  'recognition_pack'
) ON CONFLICT (code) DO NOTHING;

INSERT INTO public.reward_catalog (
  code, title, category, description, points_cost, enabled, inventory_policy,
  inventory_count, delivery_estimate, funded, kind
) VALUES (
  'gift-card-unfunded',
  'Gift card',
  'gift_card',
  'Gift-card fulfillment stays disabled until funded inventory exists.',
  500,
  false,
  'counted',
  0,
  '10–12 working days',
  false,
  'gift_card'
) ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION commands.ensure_reward_account(p_account uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  INSERT INTO public.reward_accounts (account_id)
  VALUES (p_account)
  ON CONFLICT (account_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION commands.reward_tier(p_mentees integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_mentees >= 25 THEN 'platinum'
    WHEN p_mentees >= 15 THEN 'gold'
    WHEN p_mentees >= 10 THEN 'silver'
    WHEN p_mentees >= 5 THEN 'star'
    ELSE 'none'
  END
$$;

CREATE OR REPLACE FUNCTION commands.reward_projection(p_account uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  earned integer := 0;
  redeemed integer := 0;
  expired integer := 0;
  reserved integer := 0;
  sessions integer := 0;
  referrals integer := 0;
  mentees integer := 0;
BEGIN
  SELECT
    COALESCE(sum(points) FILTER (WHERE event_type IN ('earn_mentoring', 'earn_referral', 'reversal')), 0),
    COALESCE(sum(points) FILTER (WHERE event_type = 'redeem'), 0),
    COALESCE(sum(points) FILTER (WHERE event_type = 'expire'), 0),
    COALESCE(sum(points) FILTER (WHERE event_type = 'reserve'), 0)
      - COALESCE(sum(points) FILTER (WHERE event_type = 'release'), 0),
    COALESCE(count(*) FILTER (WHERE event_type = 'earn_mentoring'), 0),
    COALESCE(count(*) FILTER (WHERE event_type = 'earn_referral'), 0)
  INTO earned, redeemed, expired, reserved, sessions, referrals
  FROM public.points_entries
  WHERE account_id = p_account;

  mentees := COALESCE((commands.alumni_contribution(p_account) ->> 'uniqueMentees')::int, 0);

  RETURN jsonb_build_object(
    'totalEarned', earned,
    'redeemed', redeemed,
    'expired', expired,
    'reserved', GREATEST(reserved, 0),
    'available', GREATEST(earned - redeemed - expired - GREATEST(reserved, 0), 0),
    'sessionCount', sessions,
    'referralSubmittedCount', referrals,
    'uniqueMentees', mentees,
    'tier', commands.reward_tier(mentees)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.append_points_entry(
  p_account uuid,
  p_type text,
  p_points integer,
  p_source uuid,
  p_key text,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  entry_id uuid;
BEGIN
  INSERT INTO public.points_entries (
    account_id, event_type, points, source_id, idempotency_key, admin_reason
  ) VALUES (
    p_account, p_type, p_points, p_source, p_key, NULLIF(btrim(COALESCE(p_reason, '')), '')
  )
  ON CONFLICT (idempotency_key) DO UPDATE
    SET account_id = public.points_entries.account_id
  RETURNING id INTO entry_id;
  RETURN entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION commands.eligible_reward_member(p_account uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_profiles p
    WHERE p.account_id = p_account AND p.verification_state = 'approved'
  ) OR EXISTS (
    SELECT 1 FROM public.parent_mentor_profiles p
    WHERE p.account_id = p_account AND p.verification_state = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION commands.require_reward_member()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  IF NOT commands.eligible_reward_member(actor) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN actor;
END;
$$;

CREATE OR REPLACE FUNCTION commands.touch_reward_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  PERFORM commands.ensure_reward_account(actor);
  UPDATE public.reward_accounts
  SET last_activity_at = now(),
      last_fresh_auth_at = now(),
      updated_at = now()
  WHERE account_id = actor;
END;
$$;

CREATE OR REPLACE FUNCTION commands.reward_home()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  projection jsonb;
  ledger jsonb;
  pending jsonb;
  invitation jsonb;
  account public.reward_accounts%ROWTYPE;
BEGIN
  actor := commands.require_reward_member();
  PERFORM commands.touch_reward_activity();
  SELECT * INTO account FROM public.reward_accounts WHERE account_id = actor;
  projection := commands.reward_projection(actor);

  SELECT COALESCE(jsonb_agg(item ORDER BY item ->> 'createdAt' DESC), '[]'::jsonb)
  INTO ledger
  FROM (
    SELECT jsonb_build_object(
      'id', e.id,
      'eventType', e.event_type,
      'points', e.points,
      'createdAt', e.created_at,
      'sourceId', e.source_id
    ) AS item
    FROM public.points_entries e
    WHERE e.account_id = actor
    ORDER BY e.created_at DESC
    LIMIT 50
  ) listed;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'bookingId', l.booking_id,
    'state', l.state
  )), '[]'::jsonb)
  INTO pending
  FROM public.mentoring_logs l
  JOIN public.bookings b ON b.id = l.booking_id
  WHERE b.host_id = actor
    AND l.state IN ('submitted', 'approved', 'approved_awaiting_rating', 'reward_eligible');

  SELECT jsonb_build_object(
    'title', g.title,
    'body', g.body,
    'eventInformation', g.event_information
  )
  INTO invitation
  FROM public.gold_plus_invitations g
  WHERE g.published
    AND (projection ->> 'tier') IN ('gold', 'platinum')
  ORDER BY g.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'projection', projection,
    'ledger', COALESCE(ledger, '[]'::jsonb),
    'pending', COALESCE(pending, '[]'::jsonb),
    'lastActivityAt', account.last_activity_at,
    'goldInvitation', invitation,
    'verificationBadge', 'verified'
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_reward_catalog(p_gift_cards boolean)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  result jsonb;
BEGIN
  actor := commands.require_reward_member();
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'code', c.code,
    'title', c.title,
    'category', c.category,
    'description', c.description,
    'pointsCost', c.points_cost,
    'enabled', c.enabled AND (c.kind <> 'gift_card' OR p_gift_cards),
    'deliveryEstimate', c.delivery_estimate,
    'kind', c.kind,
    'funded', c.funded
  ) ORDER BY c.points_cost), '[]'::jsonb)
  INTO result
  FROM public.reward_catalog c
  WHERE c.kind = 'recognition_pack'
     OR p_gift_cards;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.create_redemption(p_catalog_code text, p_gift_cards boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  catalog public.reward_catalog%ROWTYPE;
  account public.reward_accounts%ROWTYPE;
  projection jsonb;
  available integer;
  redemption public.redemptions%ROWTYPE;
BEGIN
  actor := commands.require_reward_member();
  PERFORM commands.ensure_reward_account(actor);
  SELECT * INTO account FROM public.reward_accounts WHERE account_id = actor FOR UPDATE;
  IF account.last_fresh_auth_at < now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO catalog FROM public.reward_catalog WHERE code = p_catalog_code FOR UPDATE;
  IF NOT FOUND OR NOT catalog.enabled THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF catalog.kind = 'gift_card' AND (NOT p_gift_cards OR NOT catalog.funded OR COALESCE(catalog.inventory_count, 0) < 1) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF catalog.inventory_policy = 'counted' AND COALESCE(catalog.inventory_count, 0) < 1 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  projection := commands.reward_projection(actor);
  available := (projection ->> 'available')::int;
  IF available < catalog.points_cost THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.redemptions (account_id, catalog_id, state, points)
  VALUES (actor, catalog.id, 'reserved', catalog.points_cost)
  RETURNING * INTO redemption;

  PERFORM commands.append_points_entry(
    actor, 'reserve', catalog.points_cost, redemption.id,
    'reserve:' || redemption.id::text, NULL
  );

  IF catalog.inventory_policy = 'counted' THEN
    UPDATE public.reward_catalog
    SET inventory_count = inventory_count - 1,
        version = version + 1,
        updated_at = now()
    WHERE id = catalog.id AND inventory_count >= 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'create_redemption', 'redemptions', redemption.id,
    commands.request_id(), jsonb_build_object('points', catalog.points_cost)
  );

  RETURN jsonb_build_object('id', redemption.id, 'state', redemption.state, 'points', redemption.points);
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_redemption(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.redemptions%ROWTYPE;
  catalog public.reward_catalog%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.redemptions WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.account_id <> actor AND NOT commands.has_staff_permission(actor, 'rewards_approval') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO catalog FROM public.reward_catalog WHERE id = row.catalog_id;
  RETURN jsonb_build_object(
    'id', row.id,
    'state', row.state,
    'points', row.points,
    'deliveryEstimate', catalog.delivery_estimate,
    'title', catalog.title,
    'kind', catalog.kind
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_my_redemptions()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  result jsonb;
BEGIN
  actor := commands.require_reward_member();
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'state', r.state,
    'points', r.points,
    'title', c.title,
    'createdAt', r.created_at
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO result
  FROM public.redemptions r
  JOIN public.reward_catalog c ON c.id = r.catalog_id
  WHERE r.account_id = actor;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.issue_referral_code()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.referrals%ROWTYPE;
  code text;
BEGIN
  actor := commands.require_reward_member();
  SELECT * INTO row
  FROM public.referrals
  WHERE referrer_id = actor AND invitee_account_id IS NULL AND status IN ('issued', 'visited')
  ORDER BY created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    code := encode(gen_random_bytes(6), 'hex');
    INSERT INTO public.referrals (referrer_id, code, status)
    VALUES (actor, code, 'issued')
    RETURNING * INTO row;
  END IF;
  RETURN jsonb_build_object('id', row.id, 'code', row.code, 'status', row.status);
END;
$$;

CREATE OR REPLACE FUNCTION commands.visit_referral(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  row public.referrals%ROWTYPE;
BEGIN
  SELECT * INTO row FROM public.referrals WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.status = 'issued' THEN
    UPDATE public.referrals SET status = 'visited', updated_at = now()
    WHERE id = row.id
    RETURNING * INTO row;
  END IF;
  RETURN jsonb_build_object('code', row.code, 'status', row.status);
END;
$$;

CREATE OR REPLACE FUNCTION commands.attribute_referral(p_code text, p_invitee uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  row public.referrals%ROWTYPE;
BEGIN
  SELECT * INTO row FROM public.referrals WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF p_invitee = row.referrer_id THEN
    UPDATE public.referrals SET status = 'ineligible', updated_at = now() WHERE id = row.id;
    RETURN jsonb_build_object('status', 'ineligible', 'reason', 'generic');
  END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE invitee_account_id = p_invitee) THEN
    RETURN jsonb_build_object('status', 'ineligible', 'reason', 'generic');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.parent_links l
    WHERE l.parent_id = row.referrer_id
      AND l.case_id IN (SELECT id FROM public.cases WHERE student_account_id = p_invitee)
      AND l.status = 'active'
  ) THEN
    UPDATE public.referrals SET status = 'ineligible', updated_at = now() WHERE id = row.id;
    RETURN jsonb_build_object('status', 'ineligible', 'reason', 'generic');
  END IF;
  IF row.status NOT IN ('issued', 'visited') THEN
    RETURN jsonb_build_object('id', row.id, 'status', row.status);
  END IF;

  UPDATE public.referrals
  SET invitee_account_id = p_invitee,
      status = 'attributed',
      attributed_at = now(),
      updated_at = now()
  WHERE id = row.id
  RETURNING * INTO row;
  RETURN jsonb_build_object('id', row.id, 'status', row.status);
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_my_referrals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  result jsonb;
BEGIN
  actor := commands.require_reward_member();
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'createdAt', r.created_at,
    'attributedAt', r.attributed_at,
    'qualifiedAt', r.qualified_at
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO result
  FROM public.referrals r
  WHERE r.referrer_id = actor;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.qualify_referrals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  updated integer := 0;
BEGIN
  UPDATE public.referrals r
  SET status = 'onboarding',
      updated_at = now()
  WHERE r.status = 'attributed'
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = r.invitee_account_id
    );

  UPDATE public.referrals r
  SET status = 'qualified',
      qualified_at = now(),
      updated_at = now()
  WHERE r.status IN ('attributed', 'onboarding')
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = r.invitee_account_id AND a.status = 'approved'
    )
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.student_account_id = r.invitee_account_id
        AND c.module2_completed_at IS NOT NULL
        AND c.module3_completed_at IS NOT NULL
    );
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$;

CREATE OR REPLACE FUNCTION commands.credit_qualified_referrals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  rec record;
  credited integer := 0;
BEGIN
  FOR rec IN
    SELECT * FROM public.referrals
    WHERE status = 'qualified'
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM commands.ensure_reward_account(rec.referrer_id);
    PERFORM commands.append_points_entry(
      rec.referrer_id, 'earn_referral', 25, rec.invitee_account_id,
      'earn_referral:' || rec.invitee_account_id::text, NULL
    );
    UPDATE public.referrals
    SET status = 'credited', updated_at = now()
    WHERE id = rec.id;
    UPDATE public.reward_accounts
    SET last_activity_at = now(), updated_at = now()
    WHERE account_id = rec.referrer_id;
    credited := credited + 1;
  END LOOP;
  RETURN credited;
END;
$$;

CREATE OR REPLACE FUNCTION commands.credit_eligible_mentoring()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  rec record;
  credited integer := 0;
BEGIN
  FOR rec IN
    SELECT l.id, l.booking_id, b.host_id
    FROM public.mentoring_logs l
    JOIN public.bookings b ON b.id = l.booking_id
    WHERE l.state = 'reward_eligible'
    FOR UPDATE OF l SKIP LOCKED
  LOOP
    PERFORM commands.ensure_reward_account(rec.host_id);
    PERFORM commands.append_points_entry(
      rec.host_id, 'earn_mentoring', 25, rec.booking_id,
      'earn_mentoring:' || rec.booking_id::text, NULL
    );
    UPDATE public.mentoring_logs
    SET state = 'credited', updated_at = now()
    WHERE id = rec.id AND state = 'reward_eligible';
    UPDATE public.reward_accounts
    SET last_activity_at = now(), updated_at = now()
    WHERE account_id = rec.host_id;
    credited := credited + 1;
  END LOOP;
  RETURN credited;
END;
$$;

CREATE OR REPLACE FUNCTION commands.approve_mentoring_activity(p_log uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  log_row public.mentoring_logs%ROWTYPE;
  booking public.bookings%ROWTYPE;
  rated boolean;
  next_state text;
BEGIN
  actor := commands.require_admin_scope('rewards_approval');
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT * INTO log_row FROM public.mentoring_logs WHERE id = p_log FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  SELECT * INTO booking FROM public.bookings WHERE id = log_row.booking_id;
  rated := EXISTS (
    SELECT 1 FROM public.mentoring_feedback f
    WHERE f.booking_id = log_row.booking_id
      AND f.author_account_id = booking.mentee_id
      AND f.state = 'submitted'
  );
  IF log_row.state NOT IN ('submitted', 'approved_awaiting_rating', 'changes_requested') THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;
  next_state := CASE WHEN rated THEN 'reward_eligible' ELSE 'approved_awaiting_rating' END;
  UPDATE public.mentoring_logs
  SET state = next_state, updated_at = now()
  WHERE id = p_log;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'approve_mentoring_activity', 'mentoring_logs', p_log,
    btrim(p_reason), commands.request_id(), jsonb_build_object('nextState', next_state)
  );
  RETURN jsonb_build_object('id', p_log, 'state', next_state);
END;
$$;

CREATE OR REPLACE FUNCTION commands.decide_redemption(
  p_id uuid,
  p_decision text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.redemptions%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('rewards_approval');
  IF p_decision NOT IN ('fulfill', 'fail') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT * INTO row FROM public.redemptions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.state NOT IN ('reserved', 'fulfilling') THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  IF p_decision = 'fulfill' THEN
    UPDATE public.redemptions
    SET state = 'fulfilled', updated_at = now(), version = version + 1
    WHERE id = p_id
    RETURNING * INTO row;
    PERFORM commands.append_points_entry(
      row.account_id, 'redeem', row.points, row.id,
      'redeem:' || row.id::text, p_reason
    );
    PERFORM commands.append_points_entry(
      row.account_id, 'release', row.points, row.id,
      'release:' || row.id::text, p_reason
    );
    PERFORM commands.issue_recognition_documents(row.id);
  ELSE
    UPDATE public.redemptions
    SET state = 'failed', updated_at = now(), version = version + 1
    WHERE id = p_id
    RETURNING * INTO row;
    PERFORM commands.append_points_entry(
      row.account_id, 'release', row.points, row.id,
      'release:' || row.id::text, p_reason
    );
    UPDATE public.redemptions SET state = 'released', updated_at = now() WHERE id = row.id;
  END IF;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, reason, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'decide_redemption', 'redemptions', p_id,
    btrim(p_reason), commands.request_id(), jsonb_build_object('decision', p_decision)
  );
  RETURN jsonb_build_object('id', row.id, 'state', row.state);
END;
$$;

CREATE OR REPLACE FUNCTION commands.issue_recognition_documents(p_redemption uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  row public.redemptions%ROWTYPE;
  minutes integer;
  date_from date;
  date_to date;
BEGIN
  SELECT * INTO row FROM public.redemptions WHERE id = p_redemption;
  SELECT COALESCE(sum(
    GREATEST(
      EXTRACT(EPOCH FROM (COALESCE(b.actual_ended_at, b.ends_at) - COALESCE(b.actual_started_at, b.starts_at))) / 60,
      0
    )
  ), 0)::int,
  min(b.starts_at)::date,
  max(b.ends_at)::date
  INTO minutes, date_from, date_to
  FROM public.bookings b
  JOIN public.mentoring_logs l ON l.booking_id = b.id
  WHERE b.host_id = row.account_id
    AND b.kind = 'mentoring'
    AND l.state = 'credited';

  INSERT INTO public.reward_certificates (
    account_id, redemption_id, kind, issue_id, minutes, date_from, date_to, state
  ) VALUES (
    row.account_id, p_redemption, 'certificate',
    'CERT-' || substr(p_redemption::text, 1, 8),
    minutes, date_from, date_to, 'issued'
  ) ON CONFLICT (issue_id) DO NOTHING;

  INSERT INTO public.reward_certificates (
    account_id, redemption_id, kind, issue_id, minutes, date_from, date_to, state
  ) VALUES (
    row.account_id, p_redemption, 'letter',
    'LTR-' || substr(p_redemption::text, 1, 8),
    minutes, date_from, date_to, 'issued'
  ) ON CONFLICT (issue_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION commands.list_my_certificates()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  result jsonb;
BEGIN
  actor := commands.actor_id();
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'kind', c.kind,
    'issueId', c.issue_id,
    'minutes', c.minutes,
    'hoursLabel', to_char((c.minutes::numeric / 60), 'FM999990.0') || ' hours',
    'dateFrom', c.date_from,
    'dateTo', c.date_to,
    'state', c.state,
    'createdAt', c.created_at
  ) ORDER BY c.created_at DESC), '[]'::jsonb)
  INTO result
  FROM public.reward_certificates c
  WHERE c.account_id = actor
     OR commands.has_staff_permission(actor, 'rewards_approval');
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION commands.get_certificate(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.reward_certificates%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.reward_certificates WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF row.account_id <> actor AND NOT commands.has_staff_permission(actor, 'rewards_approval') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN jsonb_build_object(
    'id', row.id,
    'kind', row.kind,
    'issueId', row.issue_id,
    'minutes', row.minutes,
    'hoursLabel', to_char((row.minutes::numeric / 60), 'FM999990.0') || ' hours',
    'dateFrom', row.date_from,
    'dateTo', row.date_to,
    'state', row.state,
    'displayName', COALESCE(commands.display_name(row.account_id), 'Mentor'),
    'issuedOn', row.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.admin_rewards_queue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  logs jsonb;
  refs jsonb;
  reds jsonb;
  catalog jsonb;
  analytics jsonb;
BEGIN
  actor := commands.require_admin_scope('rewards_approval');
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'bookingId', l.booking_id,
    'state', l.state,
    'mentorName', COALESCE(commands.display_name(b.host_id), 'Mentor'),
    'startsAt', b.starts_at
  ) ORDER BY l.created_at), '[]'::jsonb)
  INTO logs
  FROM public.mentoring_logs l
  JOIN public.bookings b ON b.id = l.booking_id
  WHERE l.state IN ('submitted', 'approved_awaiting_rating', 'reward_eligible');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'referrerName', COALESCE(commands.display_name(r.referrer_id), 'Mentor')
  ) ORDER BY r.created_at), '[]'::jsonb)
  INTO refs
  FROM public.referrals r
  WHERE r.status IN ('review_hold', 'qualified', 'onboarding');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'state', d.state,
    'points', d.points,
    'title', c.title
  ) ORDER BY d.created_at), '[]'::jsonb)
  INTO reds
  FROM public.redemptions d
  JOIN public.reward_catalog c ON c.id = d.catalog_id
  WHERE d.state IN ('reserved', 'fulfilling', 'failed');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'code', c.code,
    'title', c.title,
    'enabled', c.enabled,
    'kind', c.kind,
    'funded', c.funded,
    'inventoryCount', c.inventory_count
  ) ORDER BY c.code), '[]'::jsonb)
  INTO catalog
  FROM public.reward_catalog c;

  SELECT jsonb_build_object(
    'pointsIssued', COALESCE((SELECT sum(points) FROM public.points_entries WHERE event_type IN ('earn_mentoring', 'earn_referral')), 0),
    'redemptionsReserved', COALESCE((SELECT count(*) FROM public.redemptions WHERE state IN ('reserved', 'fulfilling')), 0),
    'redemptionsFulfilled', COALESCE((SELECT count(*) FROM public.redemptions WHERE state = 'fulfilled'), 0),
    'topReferrers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'accountId', account_id,
        'credits', credits
      ))
      FROM (
        SELECT account_id, count(*) AS credits
        FROM public.points_entries
        WHERE event_type = 'earn_referral'
        GROUP BY account_id
        ORDER BY count(*) DESC, account_id
        LIMIT 5
      ) top
    ), '[]'::jsonb)
  ) INTO analytics;

  RETURN jsonb_build_object(
    'sessions', COALESCE(logs, '[]'::jsonb),
    'referrals', COALESCE(refs, '[]'::jsonb),
    'redemptions', COALESCE(reds, '[]'::jsonb),
    'catalog', COALESCE(catalog, '[]'::jsonb),
    'analytics', analytics
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.worker_expire_reward_points()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  rec record;
  projection jsonb;
  available integer;
  expired integer := 0;
BEGIN
  FOR rec IN
    SELECT * FROM public.reward_accounts
    WHERE last_activity_at <= (now() - interval '6 months')
    FOR UPDATE SKIP LOCKED
  LOOP
    projection := commands.reward_projection(rec.account_id);
    available := (projection ->> 'available')::int;
    IF available > 0 THEN
      PERFORM commands.append_points_entry(
        rec.account_id, 'expire', available, rec.account_id,
        'expire:' || rec.account_id::text || ':' || to_char(now(), 'YYYYMM'),
        'six calendar months inactivity'
      );
      expired := expired + 1;
    END IF;
  END LOOP;
  RETURN expired;
END;
$$;

CREATE OR REPLACE FUNCTION commands.worker_tick_rewards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
BEGIN
  PERFORM commands.qualify_referrals();
  RETURN jsonb_build_object(
    'mentoringCredits', commands.credit_eligible_mentoring(),
    'referralCredits', commands.credit_qualified_referrals(),
    'expiredAccounts', commands.worker_expire_reward_points()
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.publish_reward(p_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  catalog public.reward_catalog%ROWTYPE;
BEGIN
  actor := commands.require_admin_scope('rewards_approval');
  IF length(trim(p_reason)) < 1 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT * INTO catalog FROM public.reward_catalog WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF catalog.kind = 'gift_card' AND (NOT catalog.funded OR COALESCE(catalog.inventory_count, 0) < 1) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.reward_catalog
  SET enabled = true,
      version = version + 1,
      updated_at = now()
  WHERE id = catalog.id;
  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, reason, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'publish_reward', 'reward_catalog', catalog.id,
    commands.request_id(), p_reason, jsonb_build_object('kind', catalog.kind)
  );
  RETURN jsonb_build_object('id', catalog.id, 'enabled', true);
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

  IF commands.has_staff_permission(actor, 'rewards_approval') THEN
    queues := queues || jsonb_build_array(
      jsonb_build_object(
        'id', 'rewards_review',
        'label', 'Rewards verification',
        'href', '/admin/rewards',
        'count', (
          SELECT count(*)::integer
          FROM public.mentoring_logs
          WHERE state IN ('submitted', 'approved_awaiting_rating', 'reward_eligible')
        ) + (
          SELECT count(*)::integer
          FROM public.redemptions
          WHERE state IN ('reserved', 'fulfilling', 'failed')
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

GRANT SELECT, INSERT ON public.audit_events TO gsc_api_executor;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION commands.worker_tick_rewards() TO gsc_worker;
GRANT EXECUTE ON FUNCTION commands.visit_referral(text) TO gsc_api_executor;


