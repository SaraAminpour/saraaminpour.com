# saraaminpour.com

Personal website for Sara Aminpour, built as a static React/Vite site and deployed to Cloudflare Pages.

## Local Development

```powershell
npm install
npm run dev
```

## Production Build

```powershell
npm run build
```

## Cloudflare Pages

The GitHub Actions workflow deploys `dist/` to the Cloudflare Pages project named `saraaminpour`.

Required GitHub Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Recommended Cloudflare API token scope:

- Account > Cloudflare Pages > Edit, scoped to the account that owns the Pages project.
- Zone > Zone > Read, scoped to `saraaminpour.com`.
- Zone > DNS > Edit, scoped to `saraaminpour.com`, only if DNS records must be managed by automation.

Do not commit `.env` files or token values.

After loading the two secret values into the shell environment, check the planned Cloudflare changes:

```powershell
npm run cloudflare:setup
```

Apply the setup:

```powershell
npm run cloudflare:setup -- --apply
```
