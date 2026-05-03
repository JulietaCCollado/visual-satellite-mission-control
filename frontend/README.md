# VSMC Frontend

Next.js 15 + TypeScript + Tailwind. 3D Earth globe rendering live satellite positions from the FastAPI backend.

## Quick start

```powershell
# From the frontend folder:
npm install
npm run dev
```

Then open <http://localhost:3000>.

The backend must be running on <http://127.0.0.1:8000>. The Next.js dev server proxies `/api/*` requests to it (see `next.config.js`).

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **react-globe.gl** for the 3D Earth (wraps Three.js)
- **Tailwind CSS** with a custom mission-control palette
- **JetBrains Mono** + **Major Mono Display** via `next/font`

## Aesthetic

Mission-control terminal: deep void backgrounds, phosphor-green readouts, monospace typography, scanline overlay, bracketed panels. Not a SaaS dashboard.

## Structure

```
frontend/
├── app/
│   ├── layout.tsx        # Fonts + metadata
│   ├── page.tsx          # Main orchestrator
│   └── globals.css       # Tailwind + custom CSS
├── components/
│   ├── GlobeView.tsx     # react-globe.gl wrapper (client-only)
│   ├── TopBar.tsx        # Title, status, UTC clock
│   ├── SatelliteList.tsx # Searchable + filterable catalog
│   └── SatelliteDetail.tsx # Detail card for selected sat
└── lib/
    ├── api.ts            # Typed backend client
    └── categories.ts     # Color/label per category
```

## Configuration

Set `NEXT_PUBLIC_BACKEND_URL` to point at a non-default backend (e.g. for deployment):

```powershell
$env:NEXT_PUBLIC_BACKEND_URL="https://my-backend.fly.dev"
npm run dev
```
