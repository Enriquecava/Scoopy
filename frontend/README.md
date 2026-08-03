# Scoopy Frontend

Frontend application for Scoopy. It provides login, product listing, product detail pages, and a price history visualization.

## Why Vite + React + TypeScript

We intentionally chose **Vite + React + TypeScript** as the frontend foundation:

- **Vite** gives very fast startup and HMR, plus a clean build pipeline.
- **React** gives a component-based architecture that is easy to scale by domain.
- **TypeScript** adds static typing, reducing runtime bugs and improving refactor safety.

Additional core libraries in this app:

- **React Router** for navigation.
- **Axios** for API requests.
- **TanStack Query** for server-state handling.
- **Tailwind CSS v4** for UI styling.
- **Lucide React** for icons.

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+ (recommended)
- Scoopy backend API running (default: `http://localhost:3000`)

## Setup

From the repository root:

```bash
cd frontend
npm install
```

## Environment Variables

Create a `.env` file in `frontend/`:

```env
VITE_API_URL=http://localhost:3000
```

Notes:

- Client-exposed variables must start with `VITE_`.
- If `VITE_API_URL` is not set, the API client falls back to `http://localhost:3000`.

## Scripts

Run all commands inside `frontend/`.

- Start development server:

```bash
npm run dev
```

- Start on LAN / explicit project port:

```bash
npm run dev -- --host 0.0.0.0 --port 5137
```

- Build for production:

```bash
npm run build
```

- Preview production build locally:

```bash
npm run preview
```

- Run linting:

```bash
npm run lint
```

## Run Backend + Frontend

1. Start API (terminal 1):

```bash
cd scoopy-api
rails s
```

2. Start frontend (terminal 2):

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5137
```

3. Open:

- `http://localhost:5137`

## Project Structure

Main structure in `src/`:

```text
src/
  app/
    layouts/
      MainLayout.tsx
    providers/
      AuthProvider.tsx
    router.tsx
  features/
    auth/
      components/
        LoginForm.tsx
      pages/
        LoginPage.tsx
    products/
      pages/
        ProductsPage.tsx
        ProductDetailPage.tsx
  shared/
    api/
      client.ts
    i18n/
      index.ts
      provider.tsx
      translations.ts
      common.ts
      es/
      en/
  App.tsx
  main.tsx
  index.css
```

## App Bootstrap

- `main.tsx` mounts the app into `#root` inside `StrictMode`.
- `App.tsx` composes global providers in this order:

1. `QueryClientProvider`
2. `AuthProvider`
3. `LanguageProvider`
4. `BrowserRouter`
5. `AppRouter`

## Routing

Defined in `src/app/router.tsx`:

- `/login`: login page.
- `/products`: product list (protected route).
- `/products/:id`: product detail + price history (protected route).
- `/` and `*`: redirect to `/products`.

Protected pages use `ProtectedRoute`, which checks auth and shows a loading state while auth is hydrated.

## Authentication

Implemented in `src/app/providers/AuthProvider.tsx`.

- Token storage key: `scoopy:token` in `sessionStorage`.
- Token is normalized to support values with or without `Bearer` prefix.
- The provider injects `Authorization: Bearer <token>` into `apiClient`.
- `logout` clears session storage and auth state.

Expected login contract:

- `POST /users/sign_in`
- Body:

```json
{
  "user": {
    "email": "user@example.com",
    "password": "password"
  }
}
```

## API Usage

Axios client lives in `src/shared/api/client.ts`.

Current endpoints:

- `GET /products`
- `GET /products?filter=<term>`
- `GET /products/:id`
- `GET /products/:id/price_history`

UI logic currently tolerates multiple response shapes (`array`, `data`, `products`) and sanitizes invalid records before rendering.

## Internationalization

Implemented under `src/shared/i18n/`.

- Supported locales: `es`, `en`
- Storage key: `scoopy:locale` in `localStorage`
- Default fallback locale: `es`
- Main API: `useTranslation()` and `t(key, values?)`

## Styling

- Tailwind CSS v4 via Vite plugin `@tailwindcss/vite`
- Base styles in `src/index.css`
- Most styling is utility-first inside feature/layout components

## Frontend Conventions

Team conventions for this codebase:

- Keep domain logic inside `features/<domain>`.
- Keep app-wide wiring in `app/` (router, providers, layouts).
- Keep reusable cross-domain concerns in `shared/`.
- Prefer strongly typed models for API responses.
- Reuse the shared `apiClient`; avoid ad-hoc fetch/axios instances.
- Keep route guards and session logic centralized in `AuthProvider` + router guard.
- Add/maintain translation keys for any user-facing string.
- Keep components focused and single-purpose.

## Pull Request Checklist (Frontend)

Before opening or merging a PR, verify:

- [ ] Branch is up to date with `dev`.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] New UI strings are translated in `es` and `en`.
- [ ] API changes are reflected in TypeScript types.
- [ ] Auth-protected flows still redirect correctly.
- [ ] Main user flows are manually tested:
  - [ ] Login
  - [ ] Product list loading
  - [ ] Product search
  - [ ] Product detail and chart
- [ ] Screenshots or short video attached for visible UI changes.
- [ ] README/docs updated if behavior, setup, or architecture changed.

## Quick Troubleshooting

- `401` or auth issues:
  - Check backend is running and credentials are valid.
  - Check `scoopy:token` exists in session storage.
- CORS/network issues:
  - Validate `VITE_API_URL` and backend CORS config.
- Frontend cannot start on `5137`:
  - Port is strict; free the port or update Vite config.
- Locale does not persist:
  - Verify local storage access in browser settings.

## Suggested Next Improvements

- Add unit/integration tests for auth and product pages.
- Introduce a shared typed API contract between backend and frontend.
- Add centralized HTTP error handling with Axios interceptors.