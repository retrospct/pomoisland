# PomoIsland marketing site

Standalone Vite landing page for PomoIsland. The product screenshots in `public/assets/`
are the visual source of truth for the marketing surface.

The current display-name default is **PomoIsland**. Repository, package, and release URLs
remain lowercase `pomisland` / `pomoisland`.

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

The primary download links point to the latest GitHub release:
https://github.com/retrospct/pomoisland/releases/latest

## Vercel Web Analytics

The site injects Vercel Web Analytics from `main.js`. After deploying the site, enable Web
Analytics for the `pomoisland` project in the Vercel dashboard. Verify the integration by opening
the deployed site and checking the browser network panel for a request to the generated analytics
view endpoint.

Local development does not send production analytics events.
