# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Mercado Pago + Stock en Google Sheets (Checkout Pro)

Este repo incluye:

- **Frontend (Vite + React)**: catálogo dinámico desde Google Sheets (CSV publicado) + carrito + botón “Pagar con Mercado Pago”.
- **Backend (Node + Express)** en `backend/`: crea preferencias de Mercado Pago y recibe webhooks para **descontar stock** en Google Sheets usando Google Sheets API.

### Frontend

1) Crear `.env` desde `.env.example`:

- `VITE_API_BASE_URL=http://localhost:4000`

2) Correr:

```bash
npm install
npm run dev
```

### Backend

Ver `backend/README.md`.

### Deploy (producción)

- **API (Render):** [`docs/DEPLOY_BACKEND_GRATIS.md`](docs/DEPLOY_BACKEND_GRATIS.md)
- **Front (Netlify):** [`docs/DEPLOY_NETLIFY.md`](docs/DEPLOY_NETLIFY.md) — variable `VITE_API_BASE_URL` al backend; luego `FRONTEND_ORIGIN` en Render = URL de Netlify.
