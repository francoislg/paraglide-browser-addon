---
description: Run one or more example projects in development mode
allowed-tools:
  - Bash
---

Run the specified example projects in development mode. Each project will run on its own static port:
- vanilla: http://localhost:3210
- react-router (or react): http://localhost:3220
- sveltekit (or svelte): http://localhost:3230

## Usage

Run a single project:
```
/run vanilla
/run react
/run svelte
```

Run multiple projects (comma-separated, with or without spaces):
```
/run vanilla,react
/run vanilla, react, svelte
```

## Implementation

Parse the user's input to extract the project names. Accept both full names and shortcuts:
- "vanilla" → examples/vanilla
- "react-router" or "react" → examples/react-router
- "sveltekit" or "svelte" → examples/sveltekit

For each project:
1. Check if node_modules exists, if not run `npm install` or `pnpm install` first
2. Run `npm run dev` or `pnpm dev` in the background using the Bash tool

Display the URLs where each project is running after starting them.

IMPORTANT: Use run_in_background parameter when executing the dev commands so they run concurrently.
