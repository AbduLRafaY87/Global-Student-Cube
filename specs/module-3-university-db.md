# Module 3: University Search & Database Specs

Implementation note only. See `specs/README.md`.

The leftover `universities` prototype stored a numeric rate column. That column was dropped in `0033_catalog_reference_and_universities.sql` (D5). Catalog reads use sourced publication fields, never a rate used as an admission claim.

Current catalog tables and provenance live in later migrations (`0033` onward), not in this note.
