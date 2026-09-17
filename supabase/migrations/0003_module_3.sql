CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  tuition_fee NUMERIC NOT NULL,
  acceptance_rate NUMERIC NOT NULL,
  minimum_gpa NUMERIC NOT NULL,
  ranking INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS universities_select_authenticated ON public.universities;
CREATE POLICY universities_select_authenticated
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS universities_insert_admin ON public.universities;
CREATE POLICY universities_insert_admin
  ON public.universities
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

DROP POLICY IF EXISTS universities_update_admin ON public.universities;
CREATE POLICY universities_update_admin
  ON public.universities
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

DROP POLICY IF EXISTS universities_delete_admin ON public.universities;
CREATE POLICY universities_delete_admin
  ON public.universities
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
  ON public.universities
  TO authenticated;
