# Module 19: Alumni Directory Specs

## Table: public.alumni_profiles
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `name`: TEXT (NOT NULL)
- `university_id`: UUID (Foreign Key references public.universities(id) ON DELETE CASCADE)
- `graduation_year`: INTEGER (NOT NULL)
- `current_company`: TEXT (NOT NULL)
- `linkedin_url`: TEXT (NOT NULL)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT**: Authenticated users can search alumni records.
- **INSERT/UPDATE/DELETE**: Admin role only.