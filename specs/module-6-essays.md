# Module 6: Essay Manager Specs

## Table: public.essays
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `university_id`: UUID (Foreign Key references public.universities(id) ON DELETE CASCADE, NULLABLE)
- `title`: TEXT (NOT NULL)
- `prompt`: TEXT (NOT NULL)
- `content`: TEXT (NOT NULL, DEFAULT '')
- `word_limit`: INTEGER (NOT NULL)
- `status`: TEXT (NOT NULL, CHECK: status IN ('brainstorming', 'drafting', 'review', 'final'))
- `created_at`: TIMESTAMPTZ (DEFAULT now())
- `updated_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/INSERT/UPDATE/DELETE**: Students can manage only their own essays (`auth.uid() = student_id`).