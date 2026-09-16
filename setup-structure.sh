#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Creating directory structure..."

# Create Cursor Rules directories
mkdir -p .cursor/rules

# Create Specs directory
mkdir -p specs

# Create App Router routes
mkdir -p src/app/\(auth\)
mkdir -p src/app/\(dashboard\)
mkdir -p src/app/api

# Create Component sub-directories
mkdir -p src/components/ui
mkdir -p src/components/forms
mkdir -p src/components/layout

# Create Lib, Types, and Supabase Migration directories
mkdir -p src/lib/supabase
mkdir -p src/types
mkdir -p supabase/migrations

echo "📄 Creating files and boilerplate..."

# 1. Cursor Rules Setup
cat << 'EOF' > .cursor/rules/stack.mdc
---
description: Global Tech Stack Constraints
globs: **/*
---
- Stack: Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Auth, Database, Storage), Node.js.
- Never write raw CSS; use Tailwind CSS.
- Never write plain JavaScript; use strict TypeScript types.
- Break UI into small, reusable components in `src/components/`.
- Optimize for web-only desktop and mobile viewports.
EOF

cat << 'EOF' > .cursor/rules/supabase.mdc
---
description: Supabase Database and Authorization Constraints
globs: src/lib/supabase/**/*, src/app/api/**/*
---
- Use `@supabase/ssr` for Next.js App Router authentication.
- Always implement Row Level Security (RLS) policies for user data protection.
- Database primary keys must be UUIDs.
EOF

# 2. Supabase Client & Server helper placeholders
cat << 'EOF' > src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
EOF

cat << 'EOF' > src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handled in Middleware
          }
        },
      },
    }
  )
}
EOF

# 3. Utility and Type placeholders
cat << 'EOF' > src/lib/utils.ts
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF

touch src/types/index.ts
touch supabase/migrations/0000_initial_schema.sql

# 4. Modular Specs Placeholders
cat << 'EOF' > specs/database-schema.md
# Database Schema & Models
Define tables, RLS policies, and relationships here.
EOF

cat << 'EOF' > specs/module-1-registration.md
# Module 1: Auth & Registration Specs
EOF

cat << 'EOF' > specs/module-2-student-profile.md
# Module 2: Student Profile Specs
EOF

cat << 'EOF' > specs/module-7-university-db.md
# Module 7: University Database Specs
EOF

echo "✅ Project scaffolding complete!"