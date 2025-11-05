# Troubleshooting Guide

This document provides solutions for common development issues in the Lead Forward Platform.

## Quick Reference

| Issue | Solution |
|-------|----------|
| `Cannot find module 'react'` | Run `npm install` to ensure all dependencies are installed |
| `D1 database not found` | Run `npm run db:migrate` to apply migrations |
| Tests failing with "Cannot find X" | Check that test files import from correct path using `@/` alias |
| API returning 401 | Check JWT token in localStorage, may be expired (7 day default) |
| Component showing Chinese text instead of English | Set i18n language via LanguageSwitcher or check localStorage `i18nextLng` |
| Type errors in TypeScript | Run `npm run build` to check all three tsconfig projects |

## Debugging Techniques

### Local Logging

Use `console.log/error()` in Worker code (visible in terminal with `npm run dev`).

```typescript
// In src/worker/index.ts
app.get('/api/v1/users', async (c) => {
  console.log('Request received:', c.req.path);
  // ... rest of handler
});
```

Watch output in terminal running `npm run dev`.

### Production Logging

Stream logs from production Cloudflare Workers:

```bash
npx wrangler tail                    # Stream all logs
npx wrangler tail --status error     # Only error logs
```

### Database Inspection

View schema:
```bash
npm run db:schema                    # Local database
npm run db:schema:prod              # Production database
```

Execute queries directly:
```bash
wrangler d1 execute platform-db-local --local --command "SELECT * FROM users LIMIT 5;"
wrangler d1 execute platform-db --command "SELECT * FROM users LIMIT 5;"
```

### Frontend Debugging

1. **Check AuthContext** in React DevTools
2. **Verify token storage**: `localStorage.getItem('authToken')`
3. **Check network tab** for API requests and responses
4. **Browser console** for JavaScript errors

### Performance Analysis

1. **Database queries**: Select only needed columns (avoid `SELECT *`). Check indexes on frequently queried columns.
2. **Bundle size**: After build, analyze `dist/` directory size
3. **Slow API responses**: Check database indexes, use `EXPLAIN QUERY PLAN` in SQLite

## Common Issues & Solutions

### Authentication Issues

**Problem: API returning 401**
- Check JWT token exists in localStorage
- Verify token hasn't expired (default 7 days)
- Verify token format: should start with "Bearer " in Authorization header
- Check that apiClient.ts properly sends the token

**Problem: Components not updating after login**
- Ensure components use `useAuth()` hook
- Check that AuthContext.tsx is at top of component tree
- Verify token is set in localStorage before redirecting

### Database Issues

**Problem: Migration fails or doesn't run**
- Check migration file syntax (SQLite, not PostgreSQL)
- Verify `IF NOT EXISTS` clauses for idempotency
- For local: Check `.wrangler/state/d1/` folder exists
- For production: Verify binding in `wrangler.json`

**Problem: Query returns wrong data types**
- SQLite booleans are 0/1, need conversion: `Boolean(dbValue)`
- JSON fields stored as strings, need parsing: `JSON.parse(dbValue)`
- Timestamps are Unix seconds, not milliseconds
- Use normalization functions like `normalizeMentorProfile()`

### Testing Issues

**Problem: Tests fail with import errors**
- Check `@/` alias is configured in `tsconfig.json`
- Verify test file is in correct `__tests__` directory
- Ensure test environment is correct (`jsdom` for React, `node` for Worker)

**Problem: Tests timeout**
- Increase timeout: `it('test', async () => { ... }, { timeout: 10000 })`
- Check for infinite loops or unresolved promises
- Verify mock data is correct (especially database mocks)

**Problem: Tests pass locally but fail in CI**
- Ensure all dependencies are properly mocked
- Check for environment-specific code paths
- Verify NODE_ENV is set correctly

### Type Errors

**Problem: TypeScript compiler errors**
```bash
npm run build                       # Check all three projects
npm run build -- --project=react   # Check React only
npm run build -- --project=worker  # Check Worker only
```

**Problem: Type mismatch in data from database**
- Database returns different types than TypeScript expects
- Use normalization functions (see "Common Development Patterns" in CLAUDE.md)
- Ensure data types match after parsing/conversion

### Deployment Issues

**Problem: Worker deployment fails**
```bash
npm run check                       # Dry-run deployment
npm run build                       # Check build succeeds
wrangler publish --dry-run         # Test deployment
```

**Problem: Static assets not loading in production**
- Verify `wrangler.json` has correct asset configuration
- Check `dist/client/` directory exists and has files
- Ensure SPA routing is configured: `not_found_handling: "single-page-application"`

**Problem: Environment variables not set**
```bash
wrangler secret put GOOGLE_CLIENT_ID    # Set production secrets
wrangler secret list                    # List all secrets
```

### Build Issues

**Problem: Build is slow**
- Check for large dependencies: `npm ls --depth=0`
- Consider code splitting for large features
- Verify incremental build is working

**Problem: Bundle size increased unexpectedly**
- Check what changed recently: `git diff --stat`
- Analyze bundle: `npm run build && npm run preview`
- Remove unused dependencies: `npm prune`

## Development Workflow

### Starting Development

```bash
npm install                         # Install dependencies once
npm run db:migrate                  # Apply migrations once per database reset
npm run dev                         # Start dev server (HMR enabled)
```

Then in separate terminals:
```bash
npm run test:watch                  # Run tests as you develop
npm run lint -- --watch            # Optional: watch linting
```

### Before Committing

```bash
npm run quality-check               # Run lint, test, and build all-in-one
```

If any checks fail, fix the issues and re-run `quality-check`.

### After Committing

```bash
git push origin branch-name         # Push to remote
# Create pull request via GitHub UI
```

## Getting More Help

1. **Check logs** - Terminal output and `npx wrangler tail` often reveal the issue
2. **Search errors** - Error messages are usually specific and searchable
3. **Check documentation** - Review relevant docs (../CLAUDE.md, POINTS_SYSTEM.md, RBAC.md, I18N.md)
4. **Isolate the problem** - Narrow down which system is failing (frontend, API, database, auth)
5. **Try minimal reproduction** - Create simplest test case that shows the issue

## Performance Monitoring

### Local Development

Use `npm run dev` terminal output to monitor:
- HMR rebuild times
- Worker request handling times
- Database query execution

### Production

Monitor with:
```bash
npx wrangler tail                   # Real-time logs
npm run db:schema:prod              # Check production schema
```

Check Cloudflare Dashboard for:
- Worker invocation counts and errors
- Request latency
- D1 query performance

## Database Optimization

### Adding Indexes

When you frequently query by a column:

```sql
CREATE INDEX idx_mentor_profiles_user_id ON mentor_profiles(user_id);
CREATE INDEX idx_matches_mentee_id ON matches(mentee_id);
```

Check existing indexes:
```bash
npm run db:schema                   # Shows all indexes
```

### Query Optimization

Always specify needed columns:
```typescript
// Good: Select only needed columns
const result = await db.prepare('SELECT id, name, email FROM users').all();

// Bad: Selects unnecessary data
const result = await db.prepare('SELECT * FROM users').all();
```

Use indexes in WHERE clauses:
```typescript
// Good: Uses index on user_id
const result = await db.prepare('SELECT * FROM mentor_profiles WHERE user_id = ?').bind(userId).first();

// Bad: No index on this column
const result = await db.prepare('SELECT * FROM mentor_profiles WHERE bio LIKE ?').bind('%term%').all();
```
