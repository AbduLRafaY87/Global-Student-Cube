# Module 7: Recommendation Letters Specs

## Table: public.recommendations
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `recommender_name`: TEXT (NOT NULL)
- `recommender_email`: TEXT (NOT NULL)
- `recommender_title`: TEXT (NOT NULL)
- `relationship`: TEXT (NOT NULL)
- `status`: TEXT (NOT NULL, CHECK: status IN ('requested', 'accepted', 'submitted'))
- `deadline`: DATE (NOT NULL)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/INSERT/UPDATE/DELETE**: Students manage their own requests (`auth.uid() = student_id`).