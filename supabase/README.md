# MATWANA Backend (Supabase)

This directory contains the Phase 2 MVP backend for MATWANA, encompassing Postgres logic, Realtime data logic, Row-Level Security, and Storage buckets.

## Prerequisites

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Authenticate the CLI: `supabase login`
3. Link to your deployed project: `supabase link --project-ref <your-project-ref>`

## Running Migrations & Seeding Data

1. **Deploy Schema**: 
   ```bash
   supabase db push
   ```
   This command automatically runs all files located inside `supabase/migrations/` in ascending alphabetical order. It will enable PostGIS, create all the tables in the `public` schema, and set up Row Level Security.

2. **Seed the Database**:
   - The repository includes a `seed.sql` file containing structured corridors, geographic location exact-coordinate stages (e.g., Roysambu, Tuskys Rongai), and a variety of tagged nganyas.
   - Run via the Dashboard: You can copy and paste the `seed.sql` contents directly into the Supabase Dashboard SQL Editor and hit run.
   - Or run locally (if using a local instance): `supabase db reset`

## Testing Row Level Security (RLS)

You can easily test the rules applied directly in the Supabase Dashboard SQL editor:

**As Anon (Public User)**
```sql
-- Public view endpoints
SELECT name FROM corridors; -- Should return 6 records
SELECT name FROM stages; -- Should return 12 records
SELECT count(*) FROM follows; -- Should return 0
```

**As Authenticated Fan**
*(To test this quickly, use the "Impersonate Role" feature in the dashboard SQL Editor and choose `authenticated`).*
```sql
-- Follow an existing nganya 
INSERT INTO follows (user_id, nganya_id)
VALUES (auth.uid(), '20000000-0000-0000-0000-000000000001');

-- Attempt an admin action (should fail)
INSERT INTO corridors (name) VALUES ('Test');
```

## Realtime Channels Integration

The Typescript UI wrapper methods are exported from `src/lib/queries/live.ts` and `src/lib/queries/sightings.ts`:
- `subscribeToLive(corridorId, callback)` listens for updates when the Crew dynamically pins their seats_left / location values.
- `subscribeToSightings(corridorId, callback)` listens for fan-submitted sightings instantly.
