# Claude Code Hooks Configuration

This document explains the automated quality checks configured for Claude Code development sessions.

## Overview

This project has automated quality checks that run automatically during Claude Code sessions. These hooks provide real-time feedback without manual intervention.

**How It Works:**

When working with Claude Code in this repository, quality checks run automatically:

1. **After every file edit/write**: `npm run lint -- --fix` (auto-fixes formatting and linting issues)
2. **After TypeScript file changes**: `npm run build` (type-checking and compilation)
3. **When Claude finishes responding**: `npm run test` (full test suite)

## Configuration

Hooks are configured in `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint -- --fix",
            "timeout": 30,
            "statusMessage": "Running linter..."
          }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run build",
            "timeout": 60,
            "statusMessage": "Type-checking..."
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npm test",
            "timeout": 120,
            "statusMessage": "Running tests..."
          }
        ]
      }
    ]
  }
}
```

## What Each Hook Does

| Trigger | Command | Purpose | Timeout |
|---------|---------|---------|---------|
| After Edit/Write | `npm run lint -- --fix` | Auto-fix linting issues (formatting, simple fixes) | 30s |
| After .ts/.tsx edit | `npm run build` | Type-check and compile (catches type errors) | 60s |
| When Claude stops | `npm test` | Full test suite (ensures nothing broke) | 120s |

## Manual Quality Check

If you want to manually run all quality checks at once:

```bash
npm run quality-check     # Lints with auto-fix, runs tests, and builds
```

## If a Hook Fails

Hook failures are reported in the Claude Code session. When a hook fails:

1. Read the error message in the session
2. Fix the issues following the error details
3. Hooks will re-run on your next file edit
4. The session continues to provide feedback on subsequent changes

## Performance Tips

- Hooks use reasonable timeouts to avoid excessive delays
- Linting is fast (only checks changed files)
- Build type-checks all three TypeScript projects
- Tests run full suite; consider `npm run test:watch` for iterative development during long sessions
- Hooks run in the background and don't block your workflow

## Disabling Hooks

If hooks are interfering with your development, you can temporarily disable them by editing `.claude/settings.local.json` and removing the hooks configuration. However, manual quality checks are still recommended before committing.

## Best Practices

1. **Review hook output** - Pay attention to linting suggestions and build errors
2. **Fix issues early** - Addressing problems as they're reported keeps tests passing
3. **Commit frequently** - When hooks pass, it's a good time to commit your work
4. **Run manual checks** - Before final commit, run `npm run quality-check` to ensure all systems pass

## Troubleshooting

**Hook timeout exceeded:**
- Check if build or tests are hanging
- Look for infinite loops or missing dependencies
- Try running the command manually: `npm run lint` or `npm run test`

**Hook command not found:**
- Ensure `npm install` has been run: `npm install`
- Verify all npm scripts exist in `package.json`
- Check that the working directory is correct

**Hooks not running:**
- Verify `.claude/settings.local.json` exists and is properly formatted
- Check that hooks configuration matches the structure shown above
- Restart Claude Code session if changes to hooks configuration were made
