# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an NGO community website built as a full-stack application using React + Vite + Hono + Cloudflare Workers. The project uses a hybrid architecture where the React frontend and Hono backend are deployed together to Cloudflare's edge network.

## Development Commands

```bash
# Install dependencies
npm install

# Start local development server (includes both frontend and worker)
npm run dev

# Run linter
npm run lint

# Build for production (TypeScript compilation + Vite build)
npm run build

# Preview production build locally
npm run preview

# Type-check and build verification (includes dry-run deploy)
npm run check

# Deploy to Cloudflare Workers
npm run deploy

# Generate Cloudflare types from wrangler.json
npm run cf-typegen

# Monitor deployed worker logs
npx wrangler tail
```

## Architecture

### Project Structure

The codebase is split into three distinct TypeScript projects using TypeScript project references:

1. **React App** (`src/react-app/`)
   - Entry point: `src/react-app/main.tsx`
   - Main component: `src/react-app/App.tsx`
   - Config: `tsconfig.app.json`
   - Target: ES2020 with DOM libraries
   - Uses React 19 with StrictMode

2. **Cloudflare Worker** (`src/worker/`)
   - Entry point: `src/worker/index.ts`
   - Config: `tsconfig.worker.json` (extends `tsconfig.node.json`)
   - Uses Hono framework for routing
   - Main file specified in `wrangler.json`

3. **Build Config** (`vite.config.ts`)
   - Config: `tsconfig.node.json`
   - Target: ES2022

### Build and Deployment Flow

1. **Development**: `npm run dev` starts Vite dev server with Cloudflare plugin, providing HMR for both frontend and worker
2. **Build**: `tsc -b && vite build` compiles all TypeScript projects and bundles the app
3. **Deploy**: Wrangler deploys the worker to Cloudflare's edge network
   - Worker code: `src/worker/index.ts`
   - Static assets: `dist/client/` (built React app)
   - Configuration: `wrangler.json` defines worker name, compatibility date, and asset handling

### Frontend-Backend Communication

- Frontend makes API calls to `/api/*` routes
- Backend (Hono) handles these routes in `src/worker/index.ts`
- Both are served from the same Cloudflare Worker
- Static assets configured with SPA fallback (`not_found_handling: "single-page-application"`)

### TypeScript Configuration

The root `tsconfig.json` uses project references to coordinate three separate compilation contexts:
- `tsconfig.app.json`: React app with DOM types and JSX
- `tsconfig.worker.json`: Worker code with Cloudflare runtime types
- `tsconfig.node.json`: Build tools and Vite config

All projects use strict mode with `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` enabled.

## Key Dependencies

- **Hono**: Web framework for the Cloudflare Worker backend
- **React 19**: UI library
- **Vite**: Build tool and dev server
- **@cloudflare/vite-plugin**: Integrates Cloudflare Workers with Vite
- **Wrangler**: Cloudflare's CLI for Workers deployment

## Cloudflare Configuration

The `wrangler.json` file contains:
- Worker name and main entry point
- Compatibility date and flags (nodejs_compat enabled)
- Observability enabled
- Source map uploads enabled
- Static assets directory and SPA routing configuration

To modify worker bindings (KV, D1, R2, etc.), add them to `wrangler.json` and regenerate types with `npm run cf-typegen`.
