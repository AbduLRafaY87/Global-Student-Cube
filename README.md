# Global Student Cube

Global Student Cube is a responsive Next.js application backed by Supabase.

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Authentication

Supabase URL Configuration must include:

```text
https://your-vercel-domain.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

Google OAuth must use Supabase's provider callback:

```text
https://your-project.supabase.co/auth/v1/callback
```

Public signup creates student accounts only. Parent, counselor, and admin accounts must be provisioned through an administrative workflow.

## Database migrations

Migrations are stored in `supabase/migrations`. Before applying `0025_identity_schema_cleanup.sql` to a database with existing data, verify that no production code or data still depends on `public.users`; that migration removes the duplicate identity table.

For a disposable local database:

```bash
supabase db reset
```

## Validation

```bash
npm run lint
npm run build
```

Before merging database changes, run `supabase db reset` from a clean local database and verify that a student cannot update their role or access `/admin`, `/counselor`, or `/parent-portal`.
