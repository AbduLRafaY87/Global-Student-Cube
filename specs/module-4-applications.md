# Module 4: Applications & Deadline Tracker Specs

## Table: public.applications
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `university_id`: UUID (Foreign Key references public.universities(id) ON DELETE CASCADE)
- `status`: TEXT (NOT NULL, CHECK: status IN ('draft', 'submitted', 'accepted', 'rejected'))
- `deadline`: DATE (NOT NULL)
- `created_at`: TIMESTAMPTZ (DEFAULT now())
- `updated_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/INSERT/UPDATE/DELETE**: Students can manage only their own applications (`auth.uid() = student_id`).