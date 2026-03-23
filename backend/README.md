# Backend (Mercado Pago + Google Sheets)

## Requisitos

- Node.js 18+
- Un Sheet con headers que incluyan al menos `id` (o `ID`) y `Stock` (o `stock`)
- Service Account de Google con acceso al Spreadsheet

## Configuración

1) Instalá dependencias:

```bash
cd backend
npm install
```

2) Creá `backend/.env` desde `backend/.env.example` y completá:

- `MP_ACCESS_TOKEN`
- `MP_PUBLIC_KEY` (no se usa en backend, pero lo dejamos para coherencia)
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_RANGE` (incluyendo fila de headers, ej `Productos!A1:Z1000`)
- Google Auth:
  - recomendado: `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` (ruta absoluta al JSON)

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
  - El backend consulta el pago y si está `approved` descuenta stock en Google Sheets.

## Notas

- Para webhooks locales necesitás exponer el backend con ngrok o similar y setear `MP_WEBHOOK_URL`.
- Este ejemplo usa un set en memoria para ignorar duplicados de webhooks. En producción conviene persistir en DB.

