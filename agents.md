# Agent Handoff: saraaminpour.com

## Goal

Create and deploy Sara Aminpour's personal website at `saraaminpour.com`, using GitHub as the source repository and Cloudflare Pages as the hosting target.

## Current Status

- Workspace: `C:\Users\Sara\Documents\Codex\2026-07-01\chrome-plugin-chrome-openai-bundled-file`
- Resume source: `Z:\Internship\Resume\Sara_Aminpour_Resume_2026.pdf`
- Resume text extracted successfully from the PDF.
- Telegram updates are configured via environment variables and initial updates were sent.
- GitHub CLI is installed but not authenticated yet.
- Cloudflare API credentials are not present in the environment yet.
- Chrome is running, but the Codex Chrome Extension is disabled in the selected Chrome profile, so browser automation cannot currently use the logged-in Chrome sessions.
- Local production build passed with `npm run build`.
- Local dev server was started at `http://127.0.0.1:5173/`.
- Desktop and mobile layout checks passed in the in-app browser; desktop portrait rail remains sticky while content scrolls, and mobile has no horizontal overflow.
- Initial local git commit: `2aacb9b` (`Initial personal website`).
- GitHub device login is pending user approval. Do not store the one-time code here.

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
4. Create a least-privilege Cloudflare API token:
   - Account > Cloudflare Pages > Edit, scoped to the account that owns the Pages project.
   - Zone > Zone > Read, scoped to `saraaminpour.com`.
   - Zone > DNS > Edit, scoped to `saraaminpour.com`, only if automation will manage DNS records.
5. Store `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as GitHub Actions repository secrets.
6. Create/deploy Cloudflare Pages project `saraaminpour`.
7. Run `npm run cloudflare:setup -- --apply` once `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are available in the shell environment. This creates/checks the Pages project, apex/www custom domains, and proxied CNAME records.
8. Cloudflare docs warn that a raw CNAME alone is not enough; the Pages custom domain API/dashboard association is required too.

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
