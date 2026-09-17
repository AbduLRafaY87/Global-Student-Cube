CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  target_major TEXT NOT NULL,
  target_country TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  gpa NUMERIC NOT NULL,
  test_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_user_id_fkey;

ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_profiles_set_updated_at ON public.student_profiles;
CREATE TRIGGER student_profiles_set_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_profiles_own_records ON public.student_profiles;
DROP POLICY IF EXISTS student_profiles_select_own ON public.student_profiles;
CREATE POLICY student_profiles_select_own
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS student_profiles_update_own ON public.student_profiles;
CREATE POLICY student_profiles_update_own
  ON public.student_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS student_profiles_insert_own ON public.student_profiles;
CREATE POLICY student_profiles_insert_own
  ON public.student_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE
  ON public.student_profiles
  TO authenticated;
