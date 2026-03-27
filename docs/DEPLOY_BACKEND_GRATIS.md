# Subir el backend gratis (Render.com)

Opción recomendada: **[Render](https://render.com)** — HTTPS gratis, suficiente para **webhooks de Mercado Pago** y tu API Node.

**Limitación del plan gratis:** el servicio “se duerme” si no recibe tráfico un rato. El **primer** request después puede tardar ~30–60 s. Mercado Pago **reintenta** webhooks si falla, así que suele funcionar igual; si querés evitar el cold start, más adelante podés pasar a un plan de pago.

## 1. Cuenta y repositorio

1. Entrá a [render.com](https://render.com) y registrate (GitHub es lo más cómodo).
2. Conectá el repo **`ordino-ecommerce-con-pagos`** (o el que uses).

## 2. Crear el Web Service

1. **Dashboard → New → Web Service**.
2. Elegí el repo.
3. Configuración sugerida:

| Campo | Valor |
|--------|--------|
| **Name** | `ordino-backend` (o el que quieras) |
| **Region** | Oregon / Frankfurt (el más cercano a tus usuarios) |
| **Branch** | `main` |
| **Root Directory** | `backend` ← **importante** (monorepo) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance type** | **Free** |

4. **Advanced → Health Check Path:** `/health`

5. **Create Web Service**.

Render te dará una URL tipo: `https://ordino-backend.onrender.com`

## 3. Variables de entorno (Environment)

En el servicio: **Environment → Environment Variables**. Agregá **todas** las que usás en local (mirá `backend/.env.example`).

Mínimo para que arranque con **Apps Script** (tu caso):

| Variable | Ejemplo / notas |
|----------|------------------|
| `NODE_ENV` | `production` |
| `PORT` | **No hace falta** en Render (inyecta `PORT` solo). Si falla, poné `10000`. |
| `FRONTEND_ORIGIN` | URL **pública** del front (Vercel/Netlify/GitHub Pages), ej. `https://tu-app.vercel.app` |
| `BACKEND_BASE_URL` | `https://ordino-backend.onrender.com` (sin barra final) |
| `MP_PUBLIC_KEY` | Tu clave pública MP (producción o test según uses) |
| `MP_ACCESS_TOKEN` | Token de acceso MP |
| `GOOGLE_APPS_SCRIPT_URL` | Tu Web App `/exec` |
| `GOOGLE_APPS_SCRIPT_SECRET` | Mismo `SECRET` que en `Code.gs` |

**Webhooks MP (recomendado explícito):**

| Variable | Valor |
|----------|--------|
| `MP_WEBHOOK_URL` | `https://TU-SERVICIO.onrender.com/webhook/mercadopago` |

Así MP siempre apunta al path correcto. Si no la ponés, el backend arma la URL con `BACKEND_BASE_URL + /webhook/mercadopago` (tiene que ser **HTTPS**).

**Clave multilínea (Google service account):** en Render, en “value”, pegá la private key con los saltos de línea reales o usá `\n` según indique la UI.

Guardá; Render redeploya solo.

## 4. Mercado Pago

1. En el panel de MP, configurá la **URL de notificación** (webhook) a:  
   `https://TU-SERVICIO.onrender.com/webhook/mercadopago`
2. Las **preferencias nuevas** deben crearse **después** de tener `BACKEND_BASE_URL` / `MP_WEBHOOK_URL` bien en Render (el `notification_url` se manda al crear el checkout).

## 5. Frontend

En el proyecto Vite/React, la API debe apuntar al backend en Render (variable `VITE_*` o la que uses), no a `localhost:4000`.

`FRONTEND_ORIGIN` en Render debe ser **exactamente** el origen del navegador (protocolo + host, sin path), para que **CORS** permita las llamadas.

## 6. Probar

- Navegador: `https://TU-SERVICIO.onrender.com/health` → `{"ok":true}`
- Logs en Render → **Logs** si algo falla al arrancar (casi siempre falta alguna env o Sheets mal configurado).

## Blueprint (opcional)

En la raíz del repo está `render.yaml`: podés usar **New → Blueprint** y conectar el repo para crear el servicio con menos clics (igual tenés que cargar los **secrets** a mano en el panel).

## Otras opciones gratis

- **[Fly.io](https://fly.io/docs/js/the-basics/)** — también tiene cupo gratis; un poco más técnico (CLI).
- **Oracle Cloud “Always Free”** — VPS; tenés que instalar Node, PM2, nginx, certificado SSL vos mismo.

Para este proyecto, **Render + doc anterior** suele alcanzar.
