<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

**Product:** Family Tree Visualizer — a single Next.js app that renders an interactive genealogy tree from the static GEDCOM file at `data/family-tree.ged`. No backend, database, or environment variables.

**Services:** Only the Next.js dev server is required. Start with `npm run dev` (http://localhost:3000). See `README.md` for GEDCOM editing notes.

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server with HMR |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

**Node:** Requires Node.js >= 20.9.0. Use **npm** (`package-lock.json`).

**Tests:** No test suite is configured.

**Lint caveat:** `npm run lint` currently reports one pre-existing error in `components/family-tree/TimePlayer.tsx` (ref updated during render). `npm run build` succeeds regardless.
