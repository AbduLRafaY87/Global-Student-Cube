CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recommender_name TEXT NOT NULL,
  recommender_email TEXT NOT NULL,
  recommender_title TEXT NOT NULL,
  relationship TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'submitted')),
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendations_student_id_idx
  ON public.recommendations (student_id);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recommendations_select_own ON public.recommendations;
CREATE POLICY recommendations_select_own
  ON public.recommendations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS recommendations_insert_own ON public.recommendations;
CREATE POLICY recommendations_insert_own
  ON public.recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS recommendations_update_own ON public.recommendations;
CREATE POLICY recommendations_update_own
  ON public.recommendations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS recommendations_delete_own ON public.recommendations;
CREATE POLICY recommendations_delete_own
  ON public.recommendations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.recommendations
  TO authenticated;
