# Backend (Mercado Pago + Google Sheets)

## Requisitos

- Node.js 18+
- Un Google Sheet con pestañas de **stock** y **Egresos**

## Dos formas de escribir en Sheets

### Opción A — Google Apps Script (recomendada si no querés Google Cloud)

- Sin service account ni tarjeta en GCP.
- Guía paso a paso: **[`../docs/APPS_SCRIPT_SHEETS.md`](../docs/APPS_SCRIPT_SHEETS.md)**
- Código para pegar en el sheet: [`scripts/google-apps-script/Code.gs`](scripts/google-apps-script/Code.gs)
- En `.env`: `GOOGLE_APPS_SCRIPT_URL` + `GOOGLE_APPS_SCRIPT_SECRET`

### Opción B — Google Sheets API (service account)

- `GOOGLE_SHEETS_SPREADSHEET_ID` + `GOOGLE_SHEETS_RANGE` + credenciales JSON o `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`

Tenés que configurar **A o B** (el arranque valida eso).

## Configuración

1) Instalá dependencias:

```bash
cd backend
npm install
```

2) Creá `backend/.env` desde `backend/.env.example` y completá Mercado Pago + una de las opciones de Sheets.

3) Levantá el backend:

```bash
npm run dev
```

## Endpoints

- `POST /create-preference`
  - body: `{ items: [{ id, title, quantity, unit_price, picture_url? }] }`
  - responde: `{ init_point, preference_id }`

- `POST /webhook/mercadopago`
  - Mercado Pago envía notificaciones (configurá `MP_WEBHOOK_URL` y/o el webhook en tu panel)
  - Si el pago está `approved`:
    - **Apps Script:** un solo `POST` al Web App (stock + Egresos)
    - **API:** descuenta stock y agrega filas en `Egresos`

- `POST /payments/process-approved?payment_id=...`
  - Fallback para reprocesar un pago aprobado.

## Notas

- Para webhooks locales: ngrok + `MP_WEBHOOK_URL`.
- Duplicados de webhook: set en memoria; en producción conviene DB.
