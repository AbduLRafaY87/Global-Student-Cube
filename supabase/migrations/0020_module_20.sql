CREATE TABLE IF NOT EXISTS public.admission_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities (id) ON DELETE CASCADE,
  financial_aid_amount NUMERIC DEFAULT 0,
  tuition_cost NUMERIC NOT NULL,
  deposit_deadline DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admission_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admission_offers_select_own ON public.admission_offers;
CREATE POLICY admission_offers_select_own
  ON public.admission_offers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS admission_offers_insert_own ON public.admission_offers;
CREATE POLICY admission_offers_insert_own
  ON public.admission_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS admission_offers_update_own ON public.admission_offers;
CREATE POLICY admission_offers_update_own
  ON public.admission_offers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS admission_offers_delete_own ON public.admission_offers;
CREATE POLICY admission_offers_delete_own
  ON public.admission_offers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.admission_offers
  TO authenticated;
