CREATE TABLE IF NOT EXISTS public.housing_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  housing_type TEXT NOT NULL CHECK (
    housing_type IN ('on_campus', 'off_campus', 'shared_apartment')
  ),
  monthly_cost NUMERIC NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.housing_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS housing_options_select_authenticated ON public.housing_options;
CREATE POLICY housing_options_select_authenticated
  ON public.housing_options
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS housing_options_insert_admin ON public.housing_options;
CREATE POLICY housing_options_insert_admin
  ON public.housing_options
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

DROP POLICY IF EXISTS housing_options_update_admin ON public.housing_options;
CREATE POLICY housing_options_update_admin
  ON public.housing_options
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

DROP POLICY IF EXISTS housing_options_delete_admin ON public.housing_options;
CREATE POLICY housing_options_delete_admin
  ON public.housing_options
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
  ON public.housing_options
  TO authenticated;
