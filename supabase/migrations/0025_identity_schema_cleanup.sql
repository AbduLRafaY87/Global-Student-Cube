-- Normalize legacy foreign keys before removing the duplicate identity table.
ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_user_id_fkey;

ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_student_id_fkey;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES auth.users (id) ON DELETE CASCADE;

DROP TABLE IF EXISTS public.users;