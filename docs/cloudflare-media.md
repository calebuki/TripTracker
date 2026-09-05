# Crumbs media storage

Accounts, trips, moments, captions, comments, locations, sharing, and access rules
remain in Supabase. R2 stores file bytes. The database keeps each file's URL and
an `r2:`-prefixed storage key; old Supabase URLs continue to work during rollout.

## Configuration

Create a dedicated `crumbs-media` R2 bucket using Standard storage. Keep its
`r2.dev` URL disabled. Deploy `cloudflare/media-worker.mjs` with its R2 binding
using `wrangler deploy --config cloudflare/wrangler.jsonc`. Its HTTPS
`workers.dev` URL can serve media without changing the site's DNS. A Cloudflare
custom domain can be attached later. The Worker allows only GET and HEAD, and
supports video byte ranges, ETags, and browser caching. The Workers free plan has
its own request limits; check usage before enabling this for a larger audience.
Cloudflare's edge Cache API requires a custom domain; this Worker does not claim
edge caching on workers.dev.

Create an R2 Object Read & Write S3 key restricted to this bucket. Store the
following as server-only Vercel environment variables:

- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME=crumbs-media`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_URL`: the Worker or custom-domain HTTPS origin, without a path

Apply `cloudflare/cors.json` to the bucket. Preview deployments need their exact
origin added before testing direct uploads; do not allow arbitrary origins.

Deploy with `NEXT_PUBLIC_CRUMBS_MEDIA_STORAGE=supabase` first. After the Worker,
CORS, and signed uploads pass live verification, change this to `r2` and rebuild.
When enabled, the server validates the Supabase session and trip ownership, then
issues a 15-minute PUT signature bound to a new object key, media type, file
length, cache headers, and no-overwrite condition. Files travel directly to R2.
An R2 error is surfaced to the user instead of silently writing to Supabase.

## Existing files

`scripts/migrate-media-to-r2.mjs` defaults to inventory only. Use Node 22 or newer:

```powershell
node --env-file=.env.migration.production --env-file=.env.r2.local scripts/migrate-media-to-r2.mjs
node --env-file=.env.migration.production --env-file=.env.r2.local scripts/migrate-media-to-r2.mjs --copy
node --env-file=.env.migration.production --env-file=.env.r2.local scripts/migrate-media-to-r2.mjs --switch
```

If production secrets cannot be exported, obtain a complete objects/moments
manifest with the authorized Supabase SQL connector, and run:

```powershell
node --env-file=.env.r2.local scripts/migrate-media-to-r2.mjs --manifest=.media-migration/source.json --copy
```

Manifest mode never changes database rows. Apply its verified link mapping with
the same connector, matching both original URL and original storage path so
concurrent changes are not overwritten. Include hidden moments and unreferenced
storage objects in the source inventory. The script copies every listed object,
checks SHA-256 against R2 and the public delivery endpoint, and writes an ignored
local inventory and append-only log under `.media-migration/`.

Before switching, compare a fresh source inventory to the verified report and
copy any uploads that arrived meanwhile. After switching, verify owner/shared
views, hidden moments, photos, video seeking, and a new authenticated upload.
Reconcile all database links and storage objects again before reclaiming space.

The script deliberately never deletes Supabase source objects. Reclaim them only
after successful live validation, with a retained manifest and verified R2
copies. Keep source files while old clients may still hold Supabase URLs; force
those clients to refresh before deleting. Perform any source deletion through
the Storage API, never SQL deletion from `storage.objects`.

Rollback before source deletion: restore the recorded original URL/path pairs
with conditional updates, set the upload provider back to `supabase`, and
redeploy. Existing R2 links must remain available even after this flag changes.

The existing app's public media access model is retained: possession of a file
URL permits reading it. The bucket cannot be listed or written through the
delivery Worker. This migration does not change the app's hide/delete behavior;
deleting a moment still removes its database record, with object cleanup handled
separately.

## Checks

## Production configuration (September 5, 2026)

New uploads use the private `crumbs-media` R2 bucket and the read-only delivery
Worker at `https://crumbs-media.crumbs-app.workers.dev`. Supabase continues to
handle authentication and journal records. Production has
`NEXT_PUBLIC_CRUMBS_MEDIA_STORAGE=r2`; upload credentials are server-only and
restricted to this bucket.

The original inventory contains 618 files (2,210,410,759 bytes), including 21
files not currently referenced by a moment. All are included in the migration.
The copy command overlaps network requests with bounded concurrency and writes
a verified report only after every object passes both R2 and public-delivery
SHA-256 checks. Reports and original link mappings are retained locally in the
ignored `.media-migration/` directory.

The live authenticated upload endpoint, ownership denial, signed upload,
download checksum, CORS, overwrite protection, and range responses have passed.
The temporary verification account, trip, and media were removed afterward.

After reclaiming source storage, rollback requires restoring the files from R2
to Supabase before restoring the old URL/path pairs. Clients holding old media
URLs should refresh after cutover.

## Validation commands

```powershell
node --test tests/r2-config.test.mjs tests/media-worker.test.mjs
npm run lint
npm run typecheck
npm run build
git diff --check
```

References: [R2 signed URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/),
[R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/),
[CORS](https://developers.cloudflare.com/r2/buckets/cors/).
