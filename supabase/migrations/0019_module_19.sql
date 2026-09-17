CREATE TABLE IF NOT EXISTS public.alumni_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  university_id UUID NOT NULL REFERENCES public.universities (id) ON DELETE CASCADE,
  graduation_year INTEGER NOT NULL,
  current_company TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alumni_profiles_select_authenticated ON public.alumni_profiles;
CREATE POLICY alumni_profiles_select_authenticated
  ON public.alumni_profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS alumni_profiles_insert_admin ON public.alumni_profiles;
CREATE POLICY alumni_profiles_insert_admin
  ON public.alumni_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles AS profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS alumni_profiles_update_admin ON public.alumni_profiles;
CREATE POLICY alumni_profiles_update_admin
  ON public.alumni_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles AS profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles AS profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS alumni_profiles_delete_admin ON public.alumni_profiles;
CREATE POLICY alumni_profiles_delete_admin
  ON public.alumni_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles AS profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.alumni_profiles
  TO authenticated;
