CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('student', 'parent', 'counselor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  target_major TEXT NOT NULL,
  target_country TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  gpa NUMERIC NOT NULL,
  test_scores JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  tuition_fee NUMERIC NOT NULL,
  acceptance_rate NUMERIC NOT NULL,
  minimum_gpa NUMERIC NOT NULL,
  ranking INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities (id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected')),
  deadline DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS student_profiles_user_id_idx
  ON public.student_profiles (user_id);

CREATE INDEX IF NOT EXISTS applications_student_id_idx
  ON public.applications (student_id);

CREATE INDEX IF NOT EXISTS applications_university_id_idx
  ON public.applications (university_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_own_records ON public.users;
CREATE POLICY users_own_records
  ON public.users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS student_profiles_own_records ON public.student_profiles;
CREATE POLICY student_profiles_own_records
  ON public.student_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS applications_own_records ON public.applications;
CREATE POLICY applications_own_records
  ON public.applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.student_profiles AS profiles
      WHERE profiles.id = student_id
        AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.student_profiles AS profiles
      WHERE profiles.id = student_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS universities_select_authenticated ON public.universities;
CREATE POLICY universities_select_authenticated
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.users, public.student_profiles, public.applications
  TO authenticated;

GRANT SELECT
  ON public.universities
  TO authenticated;
