-- One-time first-admin bootstrap.
-- Run ONLY as the project owner in the Supabase SQL editor (postgres), never from the app.
--
-- Steps:
-- 1. Sign up the intended admin as a normal student through the public /signup form.
-- 2. Replace REPLACE_WITH_ADMIN_EMAIL below with that account's email.
-- 3. Paste this entire script into the SQL editor and run it once.
-- 4. Confirm the row: SELECT id, role FROM public.user_profiles WHERE id = (
--      SELECT id FROM auth.users WHERE email = 'REPLACE_WITH_ADMIN_EMAIL'
--    );
-- 5. Do not leave this script in a shared dashboard tab. Further role changes use
--    public.set_user_role(uuid, text) as an already-authenticated admin.
--
-- This script does not call set_user_role(): that function requires is_admin().
-- It uses the same transaction-local GUC the trigger honors.

DO $$
DECLARE
  target_email text := 'REPLACE_WITH_ADMIN_EMAIL';
  target_id uuid;
BEGIN
  IF target_email = 'REPLACE_WITH_ADMIN_EMAIL' OR position('@' in target_email) = 0 THEN
    RAISE EXCEPTION 'Set target_email to the signed-up admin account before running';
  END IF;

  SELECT id
  INTO target_id
  FROM auth.users
  WHERE email = lower(target_email)
  LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for %. Sign up first, then re-run.', target_email;
  END IF;

  PERFORM set_config('gsc.role_change_allowed', 'on', true);

  UPDATE public.user_profiles
  SET role = 'admin', updated_at = now()
  WHERE id = target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No user_profiles row for %. Auth trigger may have failed.', target_email;
  END IF;
END;
$$;
