# Aftertone Studio

Aftertone is a Next.js music catalog and download site with a PostgreSQL-backed publishing dashboard. On Discover, visitors can filter by record label, genre, subgenre, release type, or date and sort by newest releases or top downloads. The Labels directory supports partial name searches and links to each label's published catalog. The public site also includes music search, release pages, a preview queue, and saved releases on the current browser.

If you’re upgrading an existing PostgreSQL installation, run `npm run db:migrate` before starting the updated app. Migration 003 adds track host links and Premium passes. Existing releases keep their uploaded masters. Add a host link to each track you want free listeners to download.

## Run on Windows

Install Node.js 22 or newer and run these commands from the extracted `aftertone` directory.

```powershell
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The bundled catalog works in read-only demo mode until you configure a database. If your previous Aftertone server is using port 3000, stop it or run the new server with `npm run dev -- --port 3001`.

## Set up PostgreSQL and Studio

1. Create an empty PostgreSQL database and a login role that owns it. With Docker installed, `docker compose up -d --wait postgres` starts a local development database matching the values in `.env.example`. If you already run PostgreSQL, use your existing service and create a dedicated database for Aftertone.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to your database connection string. Use a URL-encoded password if it contains reserved URL characters. Set `SITE_ORIGIN` to the exact browser origin, including the port if it differs from 3000.
3. Add `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to `.env.local`. Use a unique password with at least 12 characters.
4. Initialize and start the app.

```powershell
npm run db:migrate
npm run db:seed
npm run admin:create
npm run dev
```

`db:seed` is optional. It imports the nine original demo tracks, skips existing slugs, and keeps your current featured release. You can archive the demos from Studio when you’re ready. The migration command records applied files and can be rerun. Delete `ADMIN_PASSWORD` from `.env.local` after creating the first administrator.

Open [http://localhost:3000/studio](http://localhost:3000/studio) and sign in with the account you created.

## Publish music

1. In Studio, select **New release**, then enter the title, artist, genre, and release date. Add a record label and subgenre if they apply, and select the release type. Publishing a labeled release automatically lists that label in the directory.
2. Choose the cover art and add your tracks. Upload the original under **Premium download file**. Add a short separate **Public preview clip** to enable playback, and paste the track’s external pay-per-download URL into **Free download link**. You supply the host's link after placing the file with that provider. A blank link leaves the track available for direct Premium downloads only.
3. Set **Status** to **Draft** to save privately or **Published** to show the release in the catalog. Administrators can also select **Featured on Discover**.
4. Open the Releases table to edit, unpublish, or archive your post. Archiving removes it from public browsing and public track URLs. A staff member with access can restore it by changing the status.
5. To add a contributor, open **Team** and create an Editor account. Editors manage their own releases. Administrators manage all releases and staff accounts. Staff can change their passwords from **Account**.

Artwork supports JPG, PNG, and WebP up to 15 MB per file. Audio supports MP3, WAV, FLAC, Ogg, Opus, and M4A up to 120 MB per file. Use MP3 for the widest preview compatibility. Uploads and downloads stream through the server, and the player can seek through audio using byte ranges.

## Free and Premium downloads

Free listeners can browse and preview without an account. **Download options** shows the external host's domain. **Continue to free host** opens the pay-per-download link. The provider handles ads and delivery there. For an additional advertisement on your own free download page, set `DOWNLOAD_SPONSOR_NAME` and `DOWNLOAD_SPONSOR_URL` in `.env.local`, then restart the app. The sponsor placement appears only on a free download page with an available host link.

In **Studio → Premium passes**, an administrator enters a member name or reference, chooses a duration, and copies the issued code. Send the code privately. The listener activates it at `/premium`, then uses **Direct download** on any published track. The server checks expiry and revocation on every original-file request, including byte ranges. Revoking a pass removes access across devices. Signing out ends the current device session.

Pass issuance is manual. Optionally set `PREMIUM_JOIN_URL` to your membership information or checkout page. A checkout link alone does not collect payment inside Aftertone or activate membership. In this version, issue the pass after confirming payment through your chosen provider.

Original uploads stay in `MEDIA_DIRECTORY`. Built-in demo masters live in `content/demo-audio`, and `public/audio` contains eight-second excerpts. Deploy both folders on upgrades. If you previously copied full tracks to a CDN or published directly accessible URLs, update those copies separately. Catalog download counts include successful direct download starts and free-host handoffs. The external provider reports completed transfers and revenue.

### Upgrade the existing edmsync.com VPS

Upload the updated ZIP to `/root/aftertone-nextjs.zip` on your VPS. From a root shell, extract it into a fresh temporary folder and copy the packaged source over the installation:

```bash
stage=$(mktemp -d)
unzip -q /root/aftertone-nextjs.zip -d "$stage" &&
cp -R "$stage/aftertone/." /srv/edmsync/ &&
chown -R edmfull:"$(id -gn edmfull)" /srv/edmsync &&
cd /srv/edmsync &&
runuser -u edmfull -- npm run db:migrate &&
runuser -u edmfull -- npm run build &&
systemctl restart aftertone
```

The archive contains `.env.example`; your existing `.env.local`, PostgreSQL records and external upload directory carry forward. Open Studio to add your host links. Test one track in a private window, then activate a pass in a second browser and download the same track directly.

## Deploy behind Nginx

Run the app as a Node.js service on your Ubuntu server. Point `SITE_ORIGIN` at your HTTPS domain, set `DATABASE_URL`, and choose an absolute `MEDIA_DIRECTORY` writable by the service account. Keep it outside the Nginx document root and on persistent storage. Back up that directory together with PostgreSQL.

```sh
npm ci
npm run db:migrate
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Run the service under your existing process manager. In your HTTPS Nginx server block, proxy requests to the Node.js service.

```nginx
client_max_body_size 125m;

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_request_buffering off;
    proxy_read_timeout 120s;
}
```

Run the Node.js commands from the app directory so built-in demo assets resolve correctly. Deploy the application source and build it on the server. Releases, tracks, roles, sessions, and download counts are stored in PostgreSQL. Uploaded files live in `MEDIA_DIRECTORY`.

## Verify the build

```sh
npm test
npm run build
```
