# Buy Lands India — Frontend

Next.js app for [Buy Lands India](https://www.buylandsindia.com).

## Brand assets & SEO icons

Site favicons, PWA icons, Open Graph image, and the brand logo are generated from the Buy Lands India logo:

```bash
npm run generate:icons
```

This writes files under `public/`:

- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`
- `og-image.png`, `brand/logo.png`
- `site.webmanifest`

These assets are linked in `src/app/layout.tsx` and exposed to search engines via `robots.txt` so Google and other crawlers can index the Buy Lands India logo.

## Build

```bash
npm run build:export
```

Deploy the `out/` folder to your host.
