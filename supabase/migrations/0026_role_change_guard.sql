-- Allow role changes only when the current transaction has opted in.
-- Direct client UPDATEs of user_profiles.role must still fail.

CREATE OR REPLACE FUNCTION public.prevent_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('gsc.role_change_allowed', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'User roles can only be changed through the admin role function';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, target_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  IF target_role NOT IN ('student', 'parent', 'counselor', 'admin') THEN
    RAISE EXCEPTION 'Invalid user role';
  END IF;

  PERFORM set_config('gsc.role_change_allowed', 'on', true);

  UPDATE public.user_profiles
  SET role = target_role, updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No user profile found for the given id';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated;

DO $$
DECLARE
  users_reg regclass;
  student_fk text;
  application_fk text;
BEGIN
  users_reg := to_regclass('public.users');
  IF users_reg IS NOT NULL THEN
    RAISE EXCEPTION 'public.users must not exist after identity cleanup';
  END IF;

  SELECT c.confrelid::regclass::text
  INTO student_fk
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid
   AND a.attnum = c.conkey[1]
  WHERE c.conrelid = 'public.student_profiles'::regclass
    AND c.contype = 'f'
    AND a.attname = 'user_id'
  LIMIT 1;

  IF student_fk IS DISTINCT FROM 'auth.users' THEN
    RAISE EXCEPTION 'student_profiles.user_id must reference auth.users, found %', student_fk;
  END IF;

  SELECT c.confrelid::regclass::text
  INTO application_fk
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid
   AND a.attnum = c.conkey[1]
  WHERE c.conrelid = 'public.applications'::regclass
    AND c.contype = 'f'
    AND a.attname = 'student_id'
  LIMIT 1;

  IF application_fk IS DISTINCT FROM 'auth.users' THEN
    RAISE EXCEPTION 'applications.student_id must reference auth.users, found %', application_fk;
  END IF;
END;
$$;
