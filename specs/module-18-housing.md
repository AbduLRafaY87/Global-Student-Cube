# Module 18: Housing Specs

## Table: public.housing_options
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `university_id`: UUID (Foreign Key references public.universities(id) ON DELETE CASCADE)
- `title`: TEXT (NOT NULL)
- `housing_type`: TEXT (NOT NULL, CHECK: housing_type IN ('on_campus', 'off_campus', 'shared_apartment'))
- `monthly_cost`: NUMERIC (NOT NULL)
- `address`: TEXT (NOT NULL)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT**: Authenticated users can view options.
- **INSERT/UPDATE/DELETE**: Admin role only.