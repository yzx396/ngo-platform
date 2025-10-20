# Local D1 Database Setup

This guide explains how to work with the local D1 database for development.

## Overview

Your project is now configured to use a **local D1 database** for development instead of the cloud database. This means:

- ✅ Your local changes don't affect production data
- ✅ Database is stored locally in `.wrangler/state/v3/d1/` (ignored by git)
- ✅ Tests use mocked database (no local DB needed for tests)
- ✅ Migrations are automatically applied on startup

## Quick Start

### Start Development Server

```bash
npm run dev
```

This starts `wrangler dev --env local`, which:
1. Uses the local D1 database configuration from `wrangler.json`
2. Applies all migrations on first run
3. Serves frontend at `http://localhost:8787`
4. Provides hot reload for both frontend and worker code

### Common Database Commands

```bash
# View all tables in local database
npm run db:schema

# Re-run all migrations (useful if you reset the database)
npm run db:migrate

# Run a custom SQL query
npx wrangler d1 execute platform-db-local --local --env local --command="SELECT COUNT(*) as user_count FROM users;"

# View database file size
ls -lh .wrangler/state/v3/d1/
```

## Database Structure

Your local database has three tables:

### users
- Base table for all users (mentors and mentees)
- Fields: `id`, `email`, `name`, `created_at`, `updated_at`

### mentor_profiles
- Stores mentor-specific information
- Uses **bit flags** for `mentoring_levels` and `payment_types` (for database efficiency)
- Foreign key: `user_id` references `users(id)`

### matches
- Tracks mentor-mentee match requests
- Status flow: `pending` → `accepted` → `active` → `completed`
- Composite unique constraint prevents duplicate requests

## Resetting the Database

If you need to start fresh:

```bash
# Remove the local database
rm -rf .wrangler/state/v3/d1/

# Re-run migrations (will auto-create database)
npm run db:migrate

# Or just restart dev server
npm run dev
```

## Migrations

Migrations are SQL files in the `migrations/` directory, numbered sequentially:

1. `0001_create_users_table.sql` - Base users table
2. `0002_create_mentor_profiles_table.sql` - Mentor profiles with bit flags
3. `0003_create_matches_table.sql` - Match tracking

When adding new features that need database changes:

1. Create a new migration file: `migrations/000N_describe_change.sql`
2. Run `npm run db:migrate` to apply locally
3. Test with your feature
4. Commit the migration file

Example new migration:
```sql
-- migrations/0004_add_ratings_table.sql
CREATE TABLE ratings (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  rater_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ratings_match ON ratings(match_id);
```

## Testing with Local Database

**Important**: Tests use a **mocked D1 database**, not the local one. This keeps tests:
- Fast (no real database I/O)
- Isolated (each test starts fresh)
- Reliable (no external dependencies)

Run tests with:
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode (reruns on file changes)
npm run test:coverage    # View coverage report
npm run test:ui          # Interactive test dashboard
```

Tests mock the database in `src/worker/__tests__/` using Vitest's `vi.fn()`.

## Accessing Database in Worker Code

In `src/worker/index.ts`:

```typescript
app.get('/api/v1/users', async (c) => {
  // Access the local D1 database
  const db = c.env.platform_db;

  const result = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  return c.json(result);
});
```

The `platform_db` binding matches the name in `wrangler.json` environment configuration.

## Production vs Development

| Aspect | Development | Production |
|--------|------------|-----------|
| Database | Local D1 (`.wrangler/`) | Cloud D1 (`database_id`) |
| Environment | `--env local` | (default) |
| Data persistence | Local machine only | Cloudflare managed |
| Access | Direct via Wrangler | Via deployed worker |

## Environment Configuration

Your `wrangler.json` has:

```json
{
  "d1_databases": [
    {
      "binding": "platform_db",
      "database_name": "platform-db",
      "database_id": "8363158a-596f-468b-8faa-cbefac50b9f2"  // Production DB
    }
  ],
  "env": {
    "local": {
      "d1_databases": [
        {
          "binding": "platform_db",
          "database_name": "platform-db-local",
          "database_id": "LOCAL"  // Uses local SQLite file
        }
      ]
    }
  }
}
```

When running `npm run dev`:
- Uses `--env local` flag
- Overrides default database binding with local one
- Keeps production database untouched

## Troubleshooting

### Error: "Couldn't find a D1 DB with the name..."
- Make sure you're using the correct environment: `--env local`
- Verify `wrangler.json` has the local environment configured

### Database seems empty after migrations
- Try: `npm run db:schema` to verify tables exist
- If not, run: `npm run db:migrate` to reapply migrations

### Want to use production database for dev (temporary)
```bash
# Start without --env local (uses default/production)
npx wrangler dev

# But be careful - this modifies production data!
```

### Local database file is corrupted
```bash
# Remove and recreate
rm -rf .wrangler/state/v3/d1/
npm run db:migrate
```

## Resources

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Local migrations: `migrations/` directory
- Test database mocks: `src/worker/__tests__/`
