CREATE TABLE IF NOT EXISTS public.scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  country TEXT NOT NULL,
  minimum_gpa NUMERIC NOT NULL,
  deadline DATE NOT NULL,
  application_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scholarships_select_authenticated ON public.scholarships;
CREATE POLICY scholarships_select_authenticated
  ON public.scholarships
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS scholarships_insert_admin ON public.scholarships;
CREATE POLICY scholarships_insert_admin
  ON public.scholarships
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

DROP POLICY IF EXISTS scholarships_update_admin ON public.scholarships;
CREATE POLICY scholarships_update_admin
  ON public.scholarships
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

DROP POLICY IF EXISTS scholarships_delete_admin ON public.scholarships;
CREATE POLICY scholarships_delete_admin
  ON public.scholarships
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
  ON public.scholarships
  TO authenticated;
