# Module 20: Offer Comparison Specs

## Table: public.admission_offers
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `university_id`: UUID (Foreign Key references public.universities(id) ON DELETE CASCADE)
- `financial_aid_amount`: NUMERIC (DEFAULT 0)
- `tuition_cost`: NUMERIC (NOT NULL)
- `deposit_deadline`: DATE (NOT NULL)
- `status`: TEXT (NOT NULL, CHECK: status IN ('pending', 'accepted', 'declined'))
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/INSERT/UPDATE/DELETE**: Own-row only (`auth.uid() = student_id`).