# Agent Handoff: sara-aminpour.com

## Goal

Create and deploy Sara Aminpour's personal website using GitHub as the source repository and Cloudflare Pages as the hosting target. Cloudflare currently exposes the zone as `sara-aminpour.com`; the originally requested `saraaminpour.com` was not available in the Cloudflare zone picker during setup.

## Current Status

- Workspace: `C:\Users\Sara\Documents\Codex\2026-07-01\chrome-plugin-chrome-openai-bundled-file`
- Resume source: `Z:\Internship\Resume\Sara_Aminpour_Resume_2026.pdf`
- Resume text extracted successfully from the PDF.
- Telegram updates are configured via environment variables and initial updates were sent.
- GitHub CLI is authenticated as `SaraAminpour`.
- GitHub repository created and pushed: `https://github.com/SaraAminpour/saraaminpour.com`.
- Cloudflare API token `saraaminpour-pages-deploy` was created with the following scope:
  - Account `Sarah.aminpoor@gmail.com's Account`: Cloudflare Pages Edit.
  - Zone `sara-aminpour.com`: DNS Edit and Zone Read.
- Cloudflare API token value must not be written to disk or chat.
- Chrome browser automation is available through the enabled Codex Chrome Extension.
- GitHub Actions repository secrets are set: `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- Cloudflare Pages project `saraaminpour` exists and has successful production deployments from `main`.
- Cloudflare custom domains and proxied CNAME records are configured for `sara-aminpour.com` and `www.sara-aminpour.com`.
- Public URLs verified with HTTP 200:
  - `https://sara-aminpour.com`
  - `https://www.sara-aminpour.com`
  - `https://saraaminpour.pages.dev`
- Local production build passed with `npm run build`.
- Local dev server was started at `http://127.0.0.1:5173/`.
- Desktop and mobile layout checks passed in the in-app browser; desktop portrait rail remains sticky while content scrolls, and mobile has no horizontal overflow.
- Deployment setup commit: `940da2d` (`Use Cloudflare zone domain`).
- Real portrait source copied unchanged into the site at `public/saraaminpour.JPG`.
- Quantum education sub-site added locally at `/quantum/`; it explains quantum computing basics, hybrid quantum machine learning, and pure quantum machine learning for beginners.

## Website Implementation

- Stack: Vite, React, TypeScript.
- Visual direction (redesigned 2026-07-01): editorial "research monograph" concept — Fraunces/Newsreader/Spline Sans Mono typography, § numbered sections, IEEE-style index terms, reference-list publications, scroll-reveal and ticker animations with `prefers-reduced-motion` support.
- Background: `public/backdrop-texture.png`, generated with the GPT image tool (codex-imagegen-sdk skill) to match the gray-mauve studio backdrop of the portrait (#8a8894). The portrait is framed as "Fig. 01" on this backdrop.
- Sticker accent: `public/little-sara-sticker.png`, an ink-and-watercolor derivative of Sara's childhood sticker (`C:\Users\Sara\Downloads\sticker.webp`), shown in the Correspondence section as "Fig. 02". Favicon, apple-touch-icon, and `og-image.jpg` are sharp-composited from these two generated assets (script kept in `tmp/make-icons.mjs`, gitignored).
- Design constraints from Sara: never edit `public/saraaminpour.JPG`; no hand-authored SVG artwork (raster art comes from the GPT image tool); avoid the generic AI look (Inter, purple gradients, glassmorphism).
- Local dev: port 5173 is often occupied by another process; `.claude/launch.json` runs Vite on 5186.
- Main files:
  - `src/main.tsx`
  - `src/styles.css`
  - `public/saraaminpour.JPG`
  - `public/_redirects`
  - `.github/workflows/deploy.yml`
  - `scripts/cloudflare-setup.mjs`
- Routing: `src/main.tsx` switches between the portfolio and the quantum primer using `window.location.pathname.startsWith("/quantum")`. `public/_redirects` maps `/quantum`, `/quantum/`, and `/quantum/*` back to `/index.html` so direct Cloudflare Pages URLs work.
- The portrait file at `public/saraaminpour.JPG` is the original uploaded image and should remain unchanged.
- If a generated/background-adjusted derivative is added later, save it as a separate asset and update `src/main.tsx` to use that derivative. Do not overwrite the original portrait.

## API And Authentication Notes

- Cloudflare API token:
  - Token name in Cloudflare: `saraaminpour-pages-deploy`.
  - Purpose: allow automation to deploy the static site to Cloudflare Pages and manage the required custom-domain DNS records.
  - Stored location: GitHub repository secret `CLOUDFLARE_API_TOKEN`; the raw token value is not stored in this repository and must never be added to `agents.md`, `.env.example`, README, commits, logs, or chat.
  - Required companion value: `CLOUDFLARE_ACCOUNT_ID`, also stored as a GitHub repository secret. This is the Cloudflare account identifier used by Wrangler and `scripts/cloudflare-setup.mjs`.
  - Granted permissions: Cloudflare Pages Edit on the selected Cloudflare account, plus DNS Edit and Zone Read only for the `sara-aminpour.com` zone.
  - Expected use: GitHub Actions passes the token to `cloudflare/wrangler-action@v3` in `.github/workflows/deploy.yml`; local setup can also use it through environment variables when running `npm run cloudflare:setup -- --apply`.
  - Security boundary: this token is intentionally limited to website deployment and DNS/domain setup for this site. It should not be used for billing, user management, unrelated zones, email, analytics, or any Cloudflare account administration outside this website setup.
- GitHub authentication:
  - GitHub CLI is authenticated locally as `SaraAminpour` using GitHub's device-login flow.
  - Purpose: create/update the repository, push commits, set GitHub Actions secrets, and trigger or inspect workflow runs.
  - Storage: the GitHub authentication token is managed by `gh` locally, not by this repository. Do not copy it into files or chat.
  - If future GitHub operations fail with an authentication error, run `gh auth status` first; if needed, re-authenticate with `gh auth login`.

## Deployment Plan

1. Authenticate GitHub CLI for Sara's intended GitHub account.
2. Create a public repository named `saraaminpour.com` unless Sara requests private.
3. Push the local site to `main`.
4. Completed: GitHub Actions repository secrets were stored.
5. Completed: Cloudflare Pages project `saraaminpour` was created.
6. Completed: `npm run cloudflare:setup -- --apply` created/checked the Pages project, apex/www custom domains, and proxied CNAME records for `sara-aminpour.com`.
7. Completed: GitHub Actions deployment succeeded and all public URLs above were verified.
8. Completed locally: Sara uploaded the real portrait and it was copied unchanged to `public/saraaminpour.JPG`.
9. For this and future visual changes, run `npm run build`, push to `main`, monitor the GitHub Actions deployment, and verify the public URLs after the workflow completes.

## Useful Sources Checked

- Cloudflare Pages direct upload with GitHub Actions.
- Cloudflare Pages custom domains.
- Cloudflare API token docs.
- shadcn/ui and Radix UI docs for minimalist accessible component direction.
- Public LinkedIn/search result for Sara Aminpour.

## Notes For Next Agent

- Do not write Cloudflare or GitHub tokens into `agents.md`, `.env.example`, README, or chat.
- Keep the repo clean of `.env` files.
- After every major setup step, send a Telegram status update using `C:\Users\Sara\.codex\skills\telegram\scripts\send_telegram.py`.
