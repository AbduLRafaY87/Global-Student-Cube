-- MSG-01/02: case-scoped conversations, authorized Realtime, leftover backfill.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'receiver_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'leftover_messages'
  ) THEN
    ALTER TABLE public.messages RENAME TO leftover_messages;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.leftover_messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS messages_select_participants ON public.leftover_messages';
    EXECUTE 'DROP POLICY IF EXISTS messages_insert_sender ON public.leftover_messages';
    EXECUTE 'DROP POLICY IF EXISTS messages_update_receiver ON public.leftover_messages';
    REVOKE ALL ON TABLE public.leftover_messages FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  case_id uuid REFERENCES public.cases (id) ON DELETE RESTRICT,
  mentor_request_id uuid,
  kind text NOT NULL,
  closed_at timestamptz,
  CONSTRAINT conversations_kind_check CHECK (kind IN ('counselor', 'parent', 'mentor'))
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_one_open_counselor_per_case
  ON public.conversations (case_id)
  WHERE kind = 'counselor' AND closed_at IS NULL AND case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS conversations_case_kind_idx
  ON public.conversations (case_id, kind);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  can_send boolean NOT NULL DEFAULT true,
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, account_id)
);

CREATE INDEX IF NOT EXISTS conversation_members_account_idx
  ON public.conversation_members (account_id)
  WHERE left_at IS NULL;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE RESTRICT,
  sender_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  client_message_id uuid NOT NULL,
  body text,
  file_id uuid REFERENCES public.files (id) ON DELETE RESTRICT,
  removed_at timestamptz,
  delivery_state text NOT NULL DEFAULT 'sent',
  CONSTRAINT messages_sender_client_key UNIQUE (sender_id, client_message_id),
  CONSTRAINT messages_body_length CHECK (body IS NULL OR char_length(body) <= 4000),
  CONSTRAINT messages_body_or_file CHECK (body IS NOT NULL OR file_id IS NOT NULL),
  CONSTRAINT messages_delivery_check CHECK (delivery_state IN ('sent', 'delivered', 'failed'))
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  blocked_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE OR REPLACE FUNCTION public.can_read_conversation(p_account uuid, p_conversation uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  conv public.conversations%ROWTYPE;
  member public.conversation_members%ROWTYPE;
  assignment public.assignments%ROWTYPE;
  student_age integer;
  link public.parent_links%ROWTYPE;
BEGIN
  IF p_account IS NULL OR p_conversation IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO conv FROM public.conversations WHERE id = p_conversation;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT * INTO member
  FROM public.conversation_members
  WHERE conversation_id = p_conversation
    AND account_id = p_account
    AND left_at IS NULL;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF conv.kind = 'counselor' THEN
    IF conv.case_id IS NULL THEN
      RETURN true;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = conv.case_id AND c.student_account_id = p_account
    ) THEN
      RETURN true;
    END IF;
    SELECT * INTO assignment FROM commands.active_assignment(conv.case_id);
    IF FOUND AND assignment.counselor_id = p_account THEN
      RETURN true;
    END IF;
    SELECT * INTO link
    FROM public.parent_links
    WHERE case_id = conv.case_id
      AND parent_id = p_account
      AND status = 'active'
      AND revoked_at IS NULL;
    IF FOUND THEN
      student_age := (
        SELECT date_part('year', age(c.student_dob))::integer
        FROM public.cases c WHERE c.id = conv.case_id
      );
      IF student_age IS NOT NULL AND student_age < 18 THEN
        RETURN link.kind = 'verified_guardian';
      END IF;
      RETURN true;
    END IF;
    RETURN false;
  END IF;

  IF conv.kind = 'parent' THEN
    IF conv.case_id IS NULL THEN
      RETURN false;
    END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = conv.case_id AND c.student_account_id = p_account
    ) OR EXISTS (
      SELECT 1 FROM public.parent_links pl
      WHERE pl.case_id = conv.case_id
        AND pl.parent_id = p_account
        AND pl.status = 'active'
        AND pl.revoked_at IS NULL
    );
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_send_in_conversation(p_account uuid, p_conversation uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_read_conversation(p_account, p_conversation)
    AND EXISTS (
      SELECT 1 FROM public.conversation_members m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.conversation_id = p_conversation
        AND m.account_id = p_account
        AND m.left_at IS NULL
        AND m.can_send
        AND c.closed_at IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      JOIN public.conversation_members other
        ON other.conversation_id = p_conversation
       AND other.account_id <> p_account
       AND other.left_at IS NULL
      WHERE (b.blocker_id = p_account AND b.blocked_id = other.account_id)
         OR (b.blocked_id = p_account AND b.blocker_id = other.account_id)
    );
$$;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_select_members ON public.conversations;
CREATE POLICY conversations_select_members
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (public.can_read_conversation(auth.uid(), id));

DROP POLICY IF EXISTS conversation_members_select_self ON public.conversation_members;
CREATE POLICY conversation_members_select_self
  ON public.conversation_members
  FOR SELECT
  TO authenticated
  USING (public.can_read_conversation(auth.uid(), conversation_id));

DROP POLICY IF EXISTS messages_select_authorized ON public.messages;
CREATE POLICY messages_select_authorized
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (public.can_read_conversation(auth.uid(), conversation_id));

DROP POLICY IF EXISTS user_blocks_select_own ON public.user_blocks;
CREATE POLICY user_blocks_select_own
  ON public.user_blocks
  FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

REVOKE ALL ON public.conversations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.conversation_members FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.messages FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.user_blocks FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversation_members TO authenticated;
GRANT SELECT ON public.messages TO authenticated;
GRANT SELECT ON public.user_blocks TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.conversations TO gsc_api_executor;
GRANT SELECT, INSERT, UPDATE ON public.conversation_members TO gsc_api_executor;
GRANT SELECT, INSERT, UPDATE ON public.messages TO gsc_api_executor;
GRANT SELECT, INSERT, UPDATE ON public.user_blocks TO gsc_api_executor;
GRANT SELECT, INSERT ON public.safety_reports TO gsc_api_executor;
GRANT SELECT, INSERT ON public.outbox_events TO gsc_api_executor;
GRANT SELECT, INSERT ON public.audit_events TO gsc_api_executor;

ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION commands.sync_assignment_grants(p_assignment uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  row public.assignments%ROWTYPE;
  scope text;
BEGIN
  SELECT * INTO row FROM public.assignments WHERE id = p_assignment;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF row.state = 'active' THEN
    FOREACH scope IN ARRAY ARRAY[
      'profile.read', 'finance.read', 'shortlist.read',
      'booking.manage', 'report.read', 'task.read', 'task.write'
    ]
    LOOP
      INSERT INTO public.case_grants (case_id, account_id, scope, assignment_id)
      VALUES (row.case_id, row.counselor_id, scope, row.id)
      ON CONFLICT (case_id, account_id, scope) DO UPDATE
        SET revoked_at = NULL,
            assignment_id = row.id;
    END LOOP;
    UPDATE public.conversation_members m
    SET left_at = NULL,
        can_send = true
    FROM public.conversations c
    WHERE c.id = m.conversation_id
      AND c.kind = 'counselor'
      AND c.case_id = row.case_id
      AND m.account_id = row.counselor_id;
  ELSE
    UPDATE public.case_grants
    SET revoked_at = now()
    WHERE assignment_id = row.id
      AND revoked_at IS NULL;
    UPDATE public.conversation_members m
    SET left_at = now(),
        can_send = false
    FROM public.conversations c
    WHERE c.id = m.conversation_id
      AND c.kind = 'counselor'
      AND c.case_id = row.case_id
      AND m.account_id = row.counselor_id
      AND m.left_at IS NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION commands.authorize_message_channel(p_conversation uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN jsonb_build_object(
    'authorized', public.can_read_conversation(actor, p_conversation),
    'channel', 'conversation:' || p_conversation::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.authorize_inbox_channel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN jsonb_build_object(
    'authorized', true,
    'channel', 'inbox:' || actor::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.open_counselor_conversation(p_case uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  assignment public.assignments%ROWTYPE;
  student uuid;
  conv public.conversations%ROWTYPE;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO assignment FROM commands.active_assignment(p_case);
  IF NOT FOUND OR assignment.counselor_id <> actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT student_account_id INTO student FROM public.cases WHERE id = p_case;
  IF student IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT * INTO conv
  FROM public.conversations
  WHERE case_id = p_case AND kind = 'counselor' AND closed_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.conversations (case_id, kind)
    VALUES (p_case, 'counselor')
    RETURNING * INTO conv;
  END IF;

  INSERT INTO public.conversation_members (conversation_id, account_id, can_send)
  VALUES (conv.id, student, true)
  ON CONFLICT (conversation_id, account_id) DO UPDATE
    SET left_at = NULL, can_send = true;
  INSERT INTO public.conversation_members (conversation_id, account_id, can_send)
  VALUES (conv.id, actor, true)
  ON CONFLICT (conversation_id, account_id) DO UPDATE
    SET left_at = NULL, can_send = true;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'open_counselor_conversation', 'conversations', conv.id,
    commands.request_id(), jsonb_build_object('caseId', p_case)
  );

  RETURN jsonb_build_object('conversationId', conv.id, 'caseId', p_case);
END;
$$;

CREATE OR REPLACE FUNCTION commands.invite_parent_to_conversation(
  p_conversation uuid,
  p_parent uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  conv public.conversations%ROWTYPE;
  link public.parent_links%ROWTYPE;
  student_age integer;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO conv FROM public.conversations WHERE id = p_conversation;
  IF NOT FOUND OR conv.case_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF NOT public.can_send_in_conversation(actor, p_conversation) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO link
  FROM public.parent_links
  WHERE case_id = conv.case_id
    AND parent_id = p_parent
    AND status = 'active'
    AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  student_age := (
    SELECT date_part('year', age(c.student_dob))::integer
    FROM public.cases c WHERE c.id = conv.case_id
  );
  IF student_age IS NOT NULL AND student_age < 18 AND link.kind <> 'verified_guardian' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.conversation_members (conversation_id, account_id, can_send)
  VALUES (p_conversation, p_parent, true)
  ON CONFLICT (conversation_id, account_id) DO UPDATE
    SET left_at = NULL, can_send = true;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'invite_parent_to_conversation', 'conversations', p_conversation,
    commands.request_id(), jsonb_build_object('parentId', p_parent)
  );
  RETURN jsonb_build_object('conversationId', p_conversation, 'parentId', p_parent);
END;
$$;

CREATE OR REPLACE FUNCTION commands.message_notify_in_app(p_account uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  -- SET-02 / WP-17 preferences are not built. Default in-app on; email stays off.
  RETURN p_account IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION commands.send_message(
  p_conversation uuid,
  p_client_message_id uuid,
  p_body text,
  p_file_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  existing public.messages%ROWTYPE;
  created public.messages%ROWTYPE;
  trimmed text := nullif(btrim(coalesce(p_body, '')), '');
  file_row public.files%ROWTYPE;
  conv public.conversations%ROWTYPE;
  member record;
  recent integer;
BEGIN
  actor := commands.actor_id();
  IF p_client_message_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT * INTO existing
  FROM public.messages
  WHERE sender_id = actor AND client_message_id = p_client_message_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', existing.id,
      'conversationId', existing.conversation_id,
      'clientMessageId', existing.client_message_id,
      'duplicate', true
    );
  END IF;

  IF NOT public.can_send_in_conversation(actor, p_conversation) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO conv FROM public.conversations WHERE id = p_conversation;

  IF trimmed IS NOT NULL AND char_length(trimmed) > 4000 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF trimmed IS NULL AND p_file_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_file_id IS NOT NULL THEN
    SELECT * INTO file_row FROM public.files WHERE id = p_file_id AND state = 'clean';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
    IF file_row.purpose IN ('financial_proof', 'award_evidence')
       AND NOT (
         EXISTS (SELECT 1 FROM public.cases c WHERE c.id = conv.case_id AND c.student_account_id = actor)
         OR commands.has_case_scope(conv.case_id, actor, 'finance.read')
       )
    THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  SELECT count(*) INTO recent
  FROM public.messages
  WHERE sender_id = actor
    AND created_at > now() - interval '1 minute';
  IF recent >= 30 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;

  INSERT INTO public.messages (
    conversation_id, sender_id, client_message_id, body, file_id, delivery_state
  ) VALUES (
    p_conversation, actor, p_client_message_id, trimmed, p_file_id, 'sent'
  )
  RETURNING * INTO created;

  UPDATE public.conversations
  SET updated_at = now(), version = version + 1
  WHERE id = p_conversation;

  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = p_conversation AND account_id = actor;

  FOR member IN
    SELECT m.account_id
    FROM public.conversation_members m
    WHERE m.conversation_id = p_conversation
      AND m.account_id <> actor
      AND m.left_at IS NULL
  LOOP
    IF NOT public.can_read_conversation(member.account_id, p_conversation) THEN
      CONTINUE;
    END IF;
    IF commands.message_notify_in_app(member.account_id) THEN
      INSERT INTO public.outbox_events (
        aggregate_type, aggregate_id, aggregate_version, event_type, payload
      ) VALUES (
        'conversation',
        p_conversation,
        (SELECT version FROM public.conversations WHERE id = p_conversation),
        'message.received',
        jsonb_build_object(
          'messageId', created.id,
          'recipientId', member.account_id,
          'channel', 'in_app',
          'kind', conv.kind
        )
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'send_message', 'messages', created.id,
    commands.request_id(), jsonb_build_object('conversationId', p_conversation)
  );

  RETURN jsonb_build_object(
    'id', created.id,
    'conversationId', created.conversation_id,
    'clientMessageId', created.client_message_id,
    'duplicate', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.mark_conversation_read(p_conversation uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  IF NOT public.can_read_conversation(actor, p_conversation) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = p_conversation AND account_id = actor;

  UPDATE public.messages
  SET delivery_state = 'delivered'
  WHERE conversation_id = p_conversation
    AND sender_id <> actor
    AND delivery_state = 'sent'
    AND removed_at IS NULL;

  RETURN jsonb_build_object('conversationId', p_conversation, 'read', true);
END;
$$;

CREATE OR REPLACE FUNCTION commands.report_conversation(
  p_conversation uuid,
  p_message uuid,
  p_evidence text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  conv public.conversations%ROWTYPE;
  report_id uuid;
  detail text := btrim(coalesce(p_evidence, ''));
BEGIN
  actor := commands.actor_id();
  IF NOT public.can_read_conversation(actor, p_conversation) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF char_length(detail) < 2 OR char_length(detail) > 2000 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  SELECT * INTO conv FROM public.conversations WHERE id = p_conversation;
  INSERT INTO public.safety_reports (reporter_id, subject_id, case_id, evidence, state)
  VALUES (
    actor,
    (
      SELECT m.account_id FROM public.conversation_members m
      WHERE m.conversation_id = p_conversation AND m.account_id <> actor
      ORDER BY m.joined_at LIMIT 1
    ),
    conv.case_id,
    jsonb_build_object(
      'conversationId', p_conversation,
      'messageId', p_message,
      'detail', detail
    ),
    'open'
  )
  RETURNING id INTO report_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'report_conversation', 'safety_reports', report_id,
    commands.request_id(), jsonb_build_object('conversationId', p_conversation)
  );
  RETURN jsonb_build_object('id', report_id);
END;
$$;

CREATE OR REPLACE FUNCTION commands.block_account(p_blocked uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  IF p_blocked IS NULL OR p_blocked = actor THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (actor, p_blocked)
  ON CONFLICT DO NOTHING;

  UPDATE public.conversation_members m
  SET can_send = false
  FROM public.conversations c
  WHERE c.id = m.conversation_id
    AND c.kind <> 'counselor'
    AND m.account_id = actor
    AND EXISTS (
      SELECT 1 FROM public.conversation_members other
      WHERE other.conversation_id = m.conversation_id
        AND other.account_id = p_blocked
    );

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'block_account', 'user_blocks', p_blocked,
    commands.request_id(), jsonb_build_object('blockedId', p_blocked)
  );
  RETURN jsonb_build_object('blockedId', p_blocked);
END;
$$;

CREATE OR REPLACE FUNCTION commands.issue_conversation_file_download(p_file_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.files%ROWTYPE;
  conv_id uuid;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.files WHERE id = p_file_id AND state = 'clean';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  SELECT m.conversation_id INTO conv_id
  FROM public.messages m
  WHERE m.file_id = p_file_id
  LIMIT 1;
  IF conv_id IS NULL OR NOT public.can_read_conversation(actor, conv_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF row.purpose IN ('financial_proof', 'award_evidence')
     AND NOT (
       EXISTS (
         SELECT 1 FROM public.conversations c
         JOIN public.cases cs ON cs.id = c.case_id
         WHERE c.id = conv_id AND cs.student_account_id = actor
       )
       OR commands.has_case_scope(
         (SELECT case_id FROM public.conversations WHERE id = conv_id),
         actor,
         'finance.read'
       )
     )
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN jsonb_build_object(
    'id', row.id,
    'objectKey', row.object_key,
    'bucket', 'student-documents',
    'purpose', row.purpose,
    'state', row.state
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.message_inbox(
  p_case uuid,
  p_query text,
  p_unread_only boolean,
  p_cursor timestamptz,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  lim integer := LEAST(GREATEST(coalesce(p_limit, 20), 1), 50);
  q text := nullif(btrim(coalesce(p_query, '')), '');
BEGIN
  actor := commands.actor_id();
  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(slice.item ORDER BY slice.last_at DESC)
      FROM (
        SELECT ranked.item, ranked.last_at
        FROM (
        SELECT jsonb_build_object(
          'conversationId', c.id,
          'caseId', c.case_id,
          'kind', c.kind,
          'title', COALESCE(acc.gsc_id, counterpart.student_name, 'Conversation'),
          'gscId', acc.gsc_id,
          'lastPreview', COALESCE(left(last_msg.body, 140), 'Not provided'),
          'lastAt', COALESCE(last_msg.created_at, c.created_at),
          'unreadCount', (
            SELECT count(*)::int
            FROM public.messages msg
            WHERE msg.conversation_id = c.id
              AND msg.removed_at IS NULL
              AND msg.sender_id <> actor
              AND (m.last_read_at IS NULL OR msg.created_at > m.last_read_at)
          ),
          'canSend', public.can_send_in_conversation(actor, c.id)
        ) AS item,
        COALESCE(last_msg.created_at, c.created_at) AS last_at,
        (
          SELECT count(*)::int
          FROM public.messages msg
          WHERE msg.conversation_id = c.id
            AND msg.removed_at IS NULL
            AND msg.sender_id <> actor
            AND (m.last_read_at IS NULL OR msg.created_at > m.last_read_at)
        ) AS unread_count
        FROM public.conversation_members m
        JOIN public.conversations c ON c.id = m.conversation_id
        LEFT JOIN LATERAL (
          SELECT msg.body, msg.created_at
          FROM public.messages msg
          WHERE msg.conversation_id = c.id AND msg.removed_at IS NULL
          ORDER BY msg.created_at DESC
          LIMIT 1
        ) last_msg ON true
        LEFT JOIN LATERAL (
          SELECT other.account_id
          FROM public.conversation_members other
          WHERE other.conversation_id = c.id
            AND other.account_id <> actor
          ORDER BY other.joined_at
          LIMIT 1
        ) peer ON true
        LEFT JOIN public.accounts acc ON acc.id = peer.account_id
        LEFT JOIN public.cases counterpart ON counterpart.id = c.case_id
        WHERE m.account_id = actor
          AND m.left_at IS NULL
          AND public.can_read_conversation(actor, c.id)
          AND (p_case IS NULL OR c.case_id = p_case)
          AND (p_cursor IS NULL OR COALESCE(last_msg.created_at, c.created_at) < p_cursor)
          AND (
            q IS NULL
            OR acc.gsc_id ILIKE q
            OR counterpart.student_name ILIKE ('%' || q || '%')
            OR last_msg.body ILIKE ('%' || q || '%')
          )
      ) ranked
        WHERE (NOT coalesce(p_unread_only, false) OR ranked.unread_count > 0)
        ORDER BY ranked.last_at DESC
        LIMIT lim
      ) slice
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.message_thread(
  p_conversation uuid,
  p_before timestamptz,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  conv public.conversations%ROWTYPE;
  lim integer := LEAST(GREATEST(coalesce(p_limit, 50), 1), 100);
BEGIN
  actor := commands.actor_id();
  IF NOT public.can_read_conversation(actor, p_conversation) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO conv FROM public.conversations WHERE id = p_conversation;

  RETURN jsonb_build_object(
    'conversationId', conv.id,
    'caseId', conv.case_id,
    'kind', conv.kind,
    'closedAt', conv.closed_at,
    'canSend', public.can_send_in_conversation(actor, p_conversation),
    'permissionBanner', CASE
      WHEN NOT public.can_send_in_conversation(actor, p_conversation)
        THEN 'You can no longer send messages in this conversation.'
      ELSE NULL
    END,
    'peerAccountId', (
      SELECT m.account_id
      FROM public.conversation_members m
      WHERE m.conversation_id = conv.id AND m.account_id <> actor
      ORDER BY m.joined_at
      LIMIT 1
    ),
    'title', COALESCE((
      SELECT acc.gsc_id
      FROM public.conversation_members other
      JOIN public.accounts acc ON acc.id = other.account_id
      WHERE other.conversation_id = conv.id AND other.account_id <> actor
      LIMIT 1
    ), (SELECT student_name FROM public.cases WHERE id = conv.case_id), 'Conversation'),
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'accountId', m.account_id,
        'canSend', m.can_send,
        'leftAt', m.left_at
      ) ORDER BY m.joined_at)
      FROM public.conversation_members m
      WHERE m.conversation_id = conv.id
    ), '[]'::jsonb),
    'inviteableParents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'accountId', pl.parent_id,
        'kind', pl.kind
      ))
      FROM public.parent_links pl
      WHERE pl.case_id = conv.case_id
        AND pl.status = 'active'
        AND pl.revoked_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.conversation_members m
          WHERE m.conversation_id = conv.id
            AND m.account_id = pl.parent_id
            AND m.left_at IS NULL
        )
        AND (
          (SELECT date_part('year', age(cs.student_dob)) FROM public.cases cs WHERE cs.id = conv.case_id) >= 18
          OR pl.kind = 'verified_guardian'
        )
    ), '[]'::jsonb),
    'messages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', msg.id,
        'senderId', msg.sender_id,
        'body', msg.body,
        'fileId', msg.file_id,
        'createdAt', msg.created_at,
        'deliveryState', msg.delivery_state,
        'removedAt', msg.removed_at,
        'mine', msg.sender_id = actor
      ) ORDER BY msg.created_at)
      FROM (
        SELECT *
        FROM public.messages
        WHERE conversation_id = p_conversation
          AND (p_before IS NULL OR created_at < p_before)
        ORDER BY created_at DESC
        LIMIT lim
      ) msg
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.unanswered_counselor_messages()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := commands.actor_id();
  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'conversationId', c.id,
        'preview', COALESCE(left(msg.body, 140), 'Not provided'),
        'href', '/messages/' || c.id::text
      ) ORDER BY msg.created_at DESC)
      FROM public.conversation_members m
      JOIN public.conversations c ON c.id = m.conversation_id
      JOIN LATERAL (
        SELECT body, created_at, sender_id, removed_at
        FROM public.messages
        WHERE conversation_id = c.id AND removed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      ) msg ON true
      WHERE m.account_id = actor
        AND m.left_at IS NULL
        AND c.kind = 'counselor'
        AND public.can_read_conversation(actor, c.id)
        AND msg.sender_id <> actor
        AND (m.last_read_at IS NULL OR msg.created_at > m.last_read_at)
    ), '[]'::jsonb)
  );
END;
$$;

-- Lossless leftover backfill: keep leftover_messages; copy into spec tables.
DO $$
DECLARE
  leftover record;
  pair_key text;
  conv_id uuid;
  student uuid;
  counselor uuid;
  case_id uuid;
  assignment_id uuid;
BEGIN
  IF to_regclass('public.leftover_messages') IS NULL THEN
    RETURN;
  END IF;

  FOR leftover IN
    SELECT DISTINCT
      LEAST(lm.sender_id, lm.receiver_id) AS a,
      GREATEST(lm.sender_id, lm.receiver_id) AS b
    FROM public.leftover_messages lm
  LOOP
    student := NULL;
    counselor := NULL;
    case_id := NULL;
    assignment_id := NULL;

    SELECT c.id, c.student_account_id
    INTO case_id, student
    FROM public.cases c
    WHERE c.student_account_id IN (leftover.a, leftover.b)
    LIMIT 1;

    IF case_id IS NOT NULL THEN
      counselor := CASE WHEN leftover.a = student THEN leftover.b ELSE leftover.a END;
    ELSE
      student := leftover.a;
      counselor := leftover.b;
    END IF;

    SELECT asg.id INTO assignment_id
    FROM public.assignments asg
    WHERE case_id IS NOT NULL
      AND asg.case_id = case_id
      AND asg.counselor_id IN (leftover.a, leftover.b)
    ORDER BY asg.started_at DESC
    LIMIT 1;

    IF assignment_id IS NULL AND to_regclass('public.counselor_assignments') IS NOT NULL THEN
      SELECT ca.student_id, ca.counselor_id
      INTO student, counselor
      FROM public.counselor_assignments ca
      WHERE (ca.student_id = leftover.a AND ca.counselor_id = leftover.b)
         OR (ca.student_id = leftover.b AND ca.counselor_id = leftover.a)
      LIMIT 1;
      IF student IS NOT NULL THEN
        SELECT c.id INTO case_id FROM public.cases c WHERE c.student_account_id = student;
      END IF;
    END IF;

    pair_key := leftover.a::text || ':' || leftover.b::text;

    SELECT c.id INTO conv_id
    FROM public.conversations c
    JOIN public.conversation_members m1 ON m1.conversation_id = c.id AND m1.account_id = leftover.a
    JOIN public.conversation_members m2 ON m2.conversation_id = c.id AND m2.account_id = leftover.b
    WHERE c.kind = 'counselor'
      AND (case_id IS NULL OR c.case_id = case_id)
    LIMIT 1;

    IF conv_id IS NULL THEN
      INSERT INTO public.conversations (case_id, kind)
      VALUES (case_id, 'counselor')
      RETURNING id INTO conv_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.accounts WHERE id = leftover.a) THEN
      INSERT INTO public.conversation_members (conversation_id, account_id, can_send)
      VALUES (conv_id, leftover.a, true)
      ON CONFLICT DO NOTHING;
    END IF;
    IF EXISTS (SELECT 1 FROM public.accounts WHERE id = leftover.b) THEN
      INSERT INTO public.conversation_members (conversation_id, account_id, can_send)
      VALUES (conv_id, leftover.b, true)
      ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO public.messages (
      id, created_at, conversation_id, sender_id, client_message_id, body, delivery_state
    )
    SELECT
      lm.id,
      COALESCE(lm.created_at, now()),
      conv_id,
      lm.sender_id,
      lm.id,
      lm.content,
      CASE WHEN lm.read THEN 'delivered' ELSE 'sent' END
    FROM public.leftover_messages lm
    WHERE LEAST(lm.sender_id, lm.receiver_id) = leftover.a
      AND GREATEST(lm.sender_id, lm.receiver_id) = leftover.b
      AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = lm.sender_id)
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.conversation_members m
    SET last_read_at = src.read_at
    FROM (
      SELECT lm.receiver_id AS account_id, max(lm.created_at) AS read_at
      FROM public.leftover_messages lm
      WHERE LEAST(lm.sender_id, lm.receiver_id) = leftover.a
        AND GREATEST(lm.sender_id, lm.receiver_id) = leftover.b
        AND lm.read = true
      GROUP BY lm.receiver_id
    ) src
    WHERE m.conversation_id = conv_id
      AND m.account_id = src.account_id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION commands.register_conversation_file_upload(
  p_conversation uuid,
  p_size_bytes bigint,
  p_mime text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  conv public.conversations%ROWTYPE;
  file_id uuid;
  object_key text;
BEGIN
  actor := commands.actor_id();
  IF NOT public.can_send_in_conversation(actor, p_conversation) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO conv FROM public.conversations WHERE id = p_conversation;
  IF conv.case_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_size_bytes IS NULL OR p_size_bytes <= 0 OR p_size_bytes > 20 * 1024 * 1024 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_mime IN (
    'text/html', 'image/svg+xml', 'application/xhtml+xml', 'application/x-msdownload'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_mime NOT IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  object_key := conv.case_id::text || '/' || gen_random_uuid()::text;
  INSERT INTO public.files (
    owner_id, case_id, purpose, object_key, size_bytes, declared_mime, state
  ) VALUES (
    actor, conv.case_id, 'other', object_key, p_size_bytes, p_mime, 'pending'
  )
  RETURNING id INTO file_id;

  INSERT INTO public.audit_events (
    actor_id, action, resource_type, resource_id, request_id, safe_diff
  ) VALUES (
    commands.audit_actor(actor), 'register_conversation_file_upload', 'files', file_id,
    commands.request_id(), jsonb_build_object('conversationId', p_conversation)
  );
  RETURN jsonb_build_object(
    'id', file_id,
    'objectKey', object_key,
    'bucket', 'student-documents'
  );
END;
$$;

CREATE OR REPLACE FUNCTION commands.complete_conversation_file_upload(
  p_file_id uuid,
  p_detected_mime text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  row public.files%ROWTYPE;
  next_state text;
BEGIN
  actor := commands.actor_id();
  SELECT * INTO row FROM public.files WHERE id = p_file_id;
  IF NOT FOUND OR row.owner_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_detected_mime IN ('text/html', 'image/svg+xml') THEN
    next_state := 'rejected';
  ELSE
    next_state := 'clean';
  END IF;
  UPDATE public.files
  SET detected_mime = nullif(p_detected_mime, ''),
      state = next_state
  WHERE id = p_file_id;
  RETURN jsonb_build_object('id', p_file_id, 'state', next_state);
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.files TO gsc_api_executor;

GRANT EXECUTE ON FUNCTION public.can_read_conversation(uuid, uuid) TO authenticated, gsc_api_executor;
GRANT EXECUTE ON FUNCTION public.can_send_in_conversation(uuid, uuid) TO authenticated, gsc_api_executor;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA commands TO gsc_api_executor;
