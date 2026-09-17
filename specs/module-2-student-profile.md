# Module 2: Student Profile Specs

## Table: public.student_profiles
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `user_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE, UNIQUE)
- `first_name`: TEXT (NOT NULL)
- `last_name`: TEXT (NOT NULL)
- `target_major`: TEXT (NOT NULL)
- `target_country`: TEXT (NOT NULL)
- `graduation_year`: INTEGER (NOT NULL)
- `gpa`: NUMERIC (NOT NULL)
- `test_scores`: JSONB (DEFAULT '{}'::jsonb)
- `created_at`: TIMESTAMPTZ (DEFAULT now())
- `updated_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/UPDATE**: Students can read and update their own record (`auth.uid() = user_id`).
- **INSERT**: Authenticated users can insert their own record (`auth.uid() = user_id`).