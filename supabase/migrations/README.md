# Database migrations

Files in this folder apply in filename order on the linked **remote** project through `supabase db push` or `supabase migration up --linked`. This repo does not run a local/Docker database; never use `supabase start` or `supabase db reset`.

## Rules

- Never edit a migration that has already been applied to a shared database. Add a new numbered file instead.
- `0000_initial_schema.sql` still creates `public.users` and older foreign keys. Later files correct that:
  - `0002` / `0004` add columns and retarget FKs where `CREATE TABLE IF NOT EXISTS` was a no-op.
  - `0025_identity_schema_cleanup.sql` drops `public.users` and points `student_profiles.user_id` and `applications.student_id` at `auth.users`.
  - `0026_role_change_guard.sql` asserts that final shape and fixes admin role changes.

## 0013

`0013_reserved.sql` is a no-op. There is no `0013` migration with real DDL in this repository. **History of any 0013 that may have existed is unknown** and needs the project owner.

## Role changes

`user_profiles.role` cannot be updated by a direct client `UPDATE`. `set_user_role(target_user_id, target_role)` is `SECURITY DEFINER`, checks `is_admin()`, then sets transaction-local `gsc.role_change_allowed = on` so the trigger allows that statement only.

The first administrator cannot be created through `set_user_role` (there is no admin yet). Use `scripts/bootstrap-admin.sql` in the Supabase SQL editor as the project owner.
