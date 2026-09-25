-- Fold leftover write grants. Parked tables stay, SELECT-only for RLS tests.
-- Notification mark-read / clear moves onto the command layer.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.essays FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.recommendations FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.interview_sessions FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.admission_offers FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.visa_checklists FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.housing_options FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.counselor_assignments FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.parent_student_links FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.notifications FROM PUBLIC, anon, authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.leftover_scholarships FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.leftover_tasks FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.leftover_messages FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.leftover_alumni_profiles FROM PUBLIC, anon, authenticated, service_role;

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;

CREATE OR REPLACE FUNCTION commands.mark_notifications_read(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  touched integer;
BEGIN
  actor := commands.actor_id();
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = actor
    AND is_read = false
    AND (p_id IS NULL OR id = p_id);
  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN jsonb_build_object('updated', touched);
END;
$$;

CREATE OR REPLACE FUNCTION commands.clear_notifications(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commands
AS $$
DECLARE
  actor uuid;
  touched integer;
BEGIN
  actor := commands.actor_id();
  DELETE FROM public.notifications
  WHERE user_id = actor
    AND (p_id IS NULL OR id = p_id);
  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN jsonb_build_object('deleted', touched);
END;
$$;

REVOKE ALL ON FUNCTION commands.mark_notifications_read(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION commands.clear_notifications(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION commands.mark_notifications_read(uuid) TO gsc_api_executor;
GRANT EXECUTE ON FUNCTION commands.clear_notifications(uuid) TO gsc_api_executor;
