# Module 1: Auth & Registration Specs

## Table: public.user_profiles
- `id`: UUID (Primary Key, references auth.users.id ON DELETE CASCADE)
- `first_name`: TEXT (NOT NULL)
- `last_name`: TEXT (NOT NULL)
- `phone`: TEXT (NULLABLE)
- `role`: TEXT (NOT NULL, CHECK: 'student', 'parent', 'counselor', 'admin')
- `onboarding_completed`: BOOLEAN (DEFAULT false)
- `created_at`: TIMESTAMPTZ (DEFAULT now())
- `updated_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- Users can view their own profile (`auth.uid() = id`).
- Users can update their own profile (`auth.uid() = id`).
- Profile is inserted automatically via trigger on `auth.users` signup or during initial onboarding.