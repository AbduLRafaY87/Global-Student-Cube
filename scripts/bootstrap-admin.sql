-- One-time first-admin bootstrap.
-- Run ONLY as the project owner in the Supabase SQL editor (postgres), never from the app.
--
-- Steps:
-- 1. Sign up the intended admin as a normal student through the public /signup form.
-- 2. Replace REPLACE_WITH_ADMIN_EMAIL below with that account's email.
-- 3. Paste this entire script into the SQL editor and run it once.
-- 4. Confirm rows (requires migration 0031 for staff_permissions grants):
--      SELECT p.id, p.role, a.status, a.email_normalized
--      FROM public.user_profiles p
--      JOIN public.accounts a ON a.id = p.id
--      WHERE p.id = (SELECT id FROM auth.users WHERE email = 'REPLACE_WITH_ADMIN_EMAIL');
--      SELECT role, revoked_at FROM public.account_roles
--      WHERE account_id = (SELECT id FROM auth.users WHERE email = 'REPLACE_WITH_ADMIN_EMAIL');
--      SELECT permission FROM public.staff_permissions
--      WHERE account_id = (SELECT id FROM auth.users WHERE email = 'REPLACE_WITH_ADMIN_EMAIL');
-- 5. Do not leave this script in a shared dashboard tab. Further role changes use
--    public.set_user_role(uuid, text) as an already-authenticated admin.
--
-- This script does not call set_user_role(): that function requires is_admin().
-- It uses the same transaction-local GUC the trigger honors, then ensure_account
-- so create_invitation can use this user as inviter_id.

DO $$
DECLARE
  target_email text := 'REPLACE_WITH_ADMIN_EMAIL';
  target_id uuid;
  email_normalized text;
  email_confirmed boolean;
BEGIN
  IF target_email = 'REPLACE_WITH_ADMIN_EMAIL' OR position('@' in target_email) = 0 THEN
    RAISE EXCEPTION 'Set target_email to the signed-up admin account before running';
  END IF;

  SELECT id, lower(email), (email_confirmed_at IS NOT NULL)
  INTO target_id, email_normalized, email_confirmed
  FROM auth.users
  WHERE email = lower(target_email)
  LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for %. Sign up first, then re-run.', target_email;
  END IF;

  PERFORM commands.ensure_account(target_id, email_normalized);

  UPDATE public.accounts
  SET
    status = CASE WHEN email_confirmed THEN 'approved' ELSE status END,
    approved_at = CASE
      WHEN email_confirmed AND approved_at IS NULL THEN now()
      ELSE approved_at
    END,
    updated_at = now()
  WHERE id = target_id;

  INSERT INTO public.account_roles (account_id, role, granted_by, revoked_at)
  VALUES (target_id, 'admin', target_id, NULL)
  ON CONFLICT (account_id, role) DO UPDATE
    SET revoked_at = NULL,
        granted_by = EXCLUDED.granted_by;

  INSERT INTO public.staff_permissions (account_id, permission, granted_by)
  SELECT target_id, perm, '00000000-0000-4000-8000-000000000001'
  FROM unnest(ARRAY[
    'verification',
    'catalog_editorial',
    'case_oversight',
    'safety',
    'rewards_approval',
    'operations',
    'supervisor'
  ]) AS perm
  ON CONFLICT (account_id, permission) DO NOTHING;

  PERFORM set_config('gsc.role_change_allowed', 'on', true);

  UPDATE public.user_profiles
  SET role = 'admin', updated_at = now()
  WHERE id = target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No user_profiles row for %. Auth trigger may have failed.', target_email;
  END IF;
END;
$$;
