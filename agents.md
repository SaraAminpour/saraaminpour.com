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

## Website Implementation

- Stack: Vite, React, TypeScript, lucide-react.
- Visual direction: minimalist white/gray editorial layout with a large sticky portrait rail.
- Main files:
  - `src/main.tsx`
  - `src/styles.css`
  - `public/portrait-placeholder.svg`
  - `.github/workflows/deploy.yml`
  - `scripts/cloudflare-setup.mjs`
- The portrait is currently a placeholder at `public/portrait-placeholder.svg`.
- When Sara uploads the real portrait, preserve the original portrait file unchanged. Add any generated/background-adjusted derivative as a separate file, then point `src/main.tsx` to the derivative.

## Deployment Plan

1. Authenticate GitHub CLI for Sara's intended GitHub account.
2. Create a public repository named `saraaminpour.com` unless Sara requests private.
3. Push the local site to `main`.
4. Completed: GitHub Actions repository secrets were stored.
5. Completed: Cloudflare Pages project `saraaminpour` was created.
6. Completed: `npm run cloudflare:setup -- --apply` created/checked the Pages project, apex/www custom domains, and proxied CNAME records for `sara-aminpour.com`.
7. Completed: GitHub Actions deployment succeeded and all public URLs above were verified.
8. Remaining: Sara needs to upload the real portrait. Preserve the original portrait file unchanged; create any background-expanded derivative as a separate asset and update `src/main.tsx` to use that derivative.

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
