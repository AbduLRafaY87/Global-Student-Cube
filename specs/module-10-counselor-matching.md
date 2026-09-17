# Module 10: Counselor Matching Specs

## Table: public.counselor_assignments
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE, UNIQUE)
- `counselor_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `assigned_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT**: Visible to the assigned student (`auth.uid() = student_id`) and assigned counselor (`auth.uid() = counselor_id`).
- **INSERT/DELETE**: Admin role only.