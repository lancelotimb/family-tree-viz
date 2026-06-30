This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Family data (GEDCOM)

The live family tree is stored in **Vercel Blob** at `gedcom/family-tree.ged`.
`data/family-tree.ged` in the repo is a **seed / backup** only — it bootstraps
Blob on first read when the object does not exist yet.

`INDI` records are people and `FAM` records are marriage/union nodes —
`HUSB`/`WIFE` are the partners and `CHIL` the children. Modelling unions as
records (rather than a single `spouseId`) is what lets the tree represent
remarriages, divorces, and half-siblings.

### Editing in the browser (admin mode)

1. Set `ADMIN_SECRET` in your environment (see `.env.example`).
2. Open [`/admin`](http://localhost:3000/admin) and sign in with that password.
3. Your browser remembers the password locally so you stay signed in on return visits.
4. Use **Edit** in profile panels or **Add person** on the map — changes save to Blob immediately.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Required for **local** scripts and `next dev` when OIDC is enabled |
| `BLOB_STORE_ID` | Set automatically when Blob is linked (used by OIDC on Vercel) |
| `ADMIN_SECRET` | Admin sign-in password for `/admin` |

Blob vars are scoped to **Preview** and **Production** by default. Pull preview vars for local use:

```bash
vercel env pull .env.local --environment=preview --yes
```

**OIDC note:** if your Blob store uses OIDC (the default for new stores), `vercel env pull` downloads an empty `BLOB_READ_WRITE_TOKEN=""`. Local tools cannot use OIDC unless the store is also linked to the **Development** environment. For local dev, either:

1. **Enable Development** on the Blob store project link (Dashboard → Storage → Blob → Projects), then re-run `vercel env pull`, or
2. **Copy `BLOB_READ_WRITE_TOKEN` manually** from the store settings into `.env.local`

On Vercel deployments (Preview/Production), OIDC works automatically — no token needed.

Without Blob credentials locally, the app falls back to reading/writing `data/family-tree.ged` on disk.

### Manual Blob seed

After Blob is configured, upload the repo seed file once:

```bash
npm run seed-gedcom-blob
```

If the seed script fails with an OIDC / Development error, use one of the fixes above, or deploy to Preview and let the app lazy-seed on first visit.

### Importing photos from an ancestor PDF

Large source PDFs should be processed locally, then only the reviewed image files
should be uploaded to Blob. The import scripts use the existing GEDCOM media
model (`OBJE` records tagged with `_TAG @personId@`) and the existing media Blob
store.

Install Poppler once so the scripts can inspect and extract embedded images:

```bash
brew install poppler
```

Extract the PDF into an ignored local workspace:

```bash
npm run pdf-media:extract -- --pdf "/path/to/ancestors.pdf" --out data/pdf-media-import
```

This writes extracted image files plus `data/pdf-media-import/manifest.json`.
Review that manifest before applying it:

- Set `accepted` to `true` for images you want to import.
- Fill `taggedPersonIds` with existing GEDCOM person IDs.
- Edit `legend` if the extracted page text is too noisy.
- If the script reports page-sized images, the PDF is probably flattened scans
  and the images should be cropped manually before applying.

Preview the import without writing anything:

```bash
npm run pdf-media:apply -- --manifest data/pdf-media-import/manifest.json --dry-run
```

Apply the reviewed manifest:

```bash
npm run pdf-media:apply -- --manifest data/pdf-media-import/manifest.json
```

Accepted images are uploaded through the same Vercel Blob helper used by the
admin gallery. The GEDCOM file is then re-serialized with new `OBJE` records so
the images appear in the existing media manager and person galleries.

### API

- `GET /api/gedcom` — returns the canonical GEDCOM text
- `PUT /api/gedcom` — replace the document (`Authorization: Bearer $ADMIN_SECRET`)
- `POST /api/admin/session` — set an HttpOnly admin cookie (`{ "key": "..." }`)
- `POST /api/media` — upload an admin gallery/avatar image to Blob or local fallback

`components/family-tree/gedcom.ts` parses GEDCOM into a graph; generations are derived
automatically and the layout is computed with
[ELK](https://github.com/kieler/elkjs)'s layered algorithm
(`components/family-tree/elkLayout.ts`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
