# Wings Over L.A. — PR #2 local preview

This is a complete static snapshot of the draft PR branch, not the production site.

## Run on macOS / Linux
1. Unzip the GitHub Actions artifact, then unzip `Wings-Over-LA-PR2-Local-Preview.zip`.
2. In Terminal, change directory into the extracted website folder (the directory containing `index.html`).
3. Run: `python3 -m http.server 4173`.
4. Open http://localhost:4173/ in Chrome or Safari.
5. To stop the server, press Ctrl+C in Terminal.

## Run on Windows
After extracting the website ZIP, open PowerShell in the folder containing `index.html`, run `py -m http.server 4173`, and browse to http://localhost:4173/.

## What works locally
Navigation, training pathways, hero video, galleries, responsive layout, pricing cards, contact layout, and client-side form validation.

## Limitations
- The CRM lead endpoint is a Cloudflare Pages Function (`functions/api/lead.js`). The Python static preview cannot execute it. Forms therefore display the email-draft fallback locally. A successful CRM lead submission must be tested on Cloudflare Pages *after* server-side environment variables are configured.
- The corrected videos and D95A high-resolution cockpit image will be preferred automatically when these three exact files are uploaded in this PR:
  - `assets/hero-flight-rudder-corrected.mp4`
  - `assets/hero-flight-mobile-rudder-corrected.mp4`
  - `assets/d95a-cockpit-hd.png`
  Until then, the earlier local media displays. Do not mark the rudder correction visually approved until the replacements are uploaded and viewed.
- GitHub PR #2 is draft. The snapshot is not merged or published to the production domain.
