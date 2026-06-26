export const LOCAL_BLOB_SETUP_HELP = `Local Blob access failed (OIDC is not enabled for the Development environment).

Fix one of the following:

1. Enable Development on your Blob store (recommended for OIDC projects):
   Vercel Dashboard → Storage → your Blob store → Projects →
   edit the project link → include the "Development" environment.

2. Paste a read-write token manually into .env.local:
   Storage → your Blob store → copy BLOB_READ_WRITE_TOKEN →
   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

   Note: \`vercel env pull\` leaves this empty when OIDC is enabled.

3. Skip local seeding — deploy to Preview/Production and the app lazy-seeds
   from data/family-tree.ged on the first page load.`;

export function isBlobOidcEnvironmentError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "BlobOidcEnvironmentNotAllowedError" ||
    error.message.includes("OIDC is enabled for this project, but not for the")
  );
}
