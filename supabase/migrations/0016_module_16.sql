CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT DEFAULT '',
  hours_per_week NUMERIC NOT NULL,
  weeks_per_year NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activities_select_own ON public.activities;
CREATE POLICY activities_select_own
  ON public.activities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS activities_insert_own ON public.activities;
CREATE POLICY activities_insert_own
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS activities_update_own ON public.activities;
CREATE POLICY activities_update_own
  ON public.activities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS activities_delete_own ON public.activities;
CREATE POLICY activities_delete_own
  ON public.activities
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.activities
  TO authenticated;
