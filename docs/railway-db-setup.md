# Railway: keep the database on a real disk

Do this in the Railway dashboard so training data survives redeploys.  
Local Mac development already keeps `training.db` on your laptop — this is only for the **live** site.

> **Do this before merging the “require DB_PATH on Railway” PR.**  
> Once the app refuses to boot without `DB_PATH`, a deploy will fail until the volume and env vars below exist.

---

## Step 1 — Attach a volume

1. Open your project on [railway.app](https://railway.app)
2. Click the Product Education / training **web service**
3. Find **Volumes**
4. Add a volume with mount path: **`/data`**

That creates a permanent disk at `/data` inside the container. Without this, app files vanish on every deploy.

---

## Step 2 — Point the app at that disk

In the same service → **Variables**, add:

```text
DB_PATH=/data/training.db
BACKUP_DIR=/data/backups
BACKUP_RETENTION_DAYS=14
```

Live database and daily snapshots both live under `/data` (the volume). Snapshots protect against mistakes; they do **not** protect against deleting the volume itself.

---

## Step 3 — Redeploy and verify

Redeploy the service (or push a commit). In **Deploy Logs**, confirm lines like:

```text
Database: /data/training.db (… KB)
Backup written: /data/backups/training-….db
```

If you still see `Database: …/training.db` under the app folder (not `/data`), the volume/env vars are not applied.

---

## Step 4 — Off-box copies (disaster recovery)

`/data/backups` is still the **same disk** as the live DB (same filing cabinet).

Once a week (or after big changes):

1. Copy a snapshot off Railway (CLI shell, or download if available)
2. Store that `.db` in Google Drive / Dropbox / a secure folder  
   Example name: `training-2026-08-14.db`

Keep the last few. That is your “other building” copy.

---

## Related

- PR that enforces `DB_PATH` on Railway: check repo PRs titled *Require DB_PATH on Railway*
- Owner summary: [owner-briefing.md](./owner-briefing.md)
