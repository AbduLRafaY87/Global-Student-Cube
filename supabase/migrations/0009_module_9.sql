CREATE TABLE IF NOT EXISTS public.test_scores_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (
    test_type IN ('SAT', 'ACT', 'TOEFL', 'IELTS', 'GRE', 'GMAT')
  ),
  score NUMERIC NOT NULL,
  test_date DATE NOT NULL,
  is_official BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.test_scores_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS test_scores_log_select_own ON public.test_scores_log;
CREATE POLICY test_scores_log_select_own
  ON public.test_scores_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS test_scores_log_insert_own ON public.test_scores_log;
CREATE POLICY test_scores_log_insert_own
  ON public.test_scores_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS test_scores_log_update_own ON public.test_scores_log;
CREATE POLICY test_scores_log_update_own
  ON public.test_scores_log
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS test_scores_log_delete_own ON public.test_scores_log;
CREATE POLICY test_scores_log_delete_own
  ON public.test_scores_log
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.test_scores_log
  TO authenticated;
