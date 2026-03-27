# Front en Netlify

## 1. Nuevo sitio

1. [Netlify](https://www.netlify.com) → **Add new site** → **Import an existing project**.
2. Conectá **GitHub** y el repo **ordino-ecommerce-con-pagos**.
3. Netlify suele detectar Vite; si no, configurá:
   - **Base directory:** (vacío = raíz del repo)
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

El archivo `netlify.toml` en la raíz ya define build y redirects para el SPA.

## 2. Variable de entorno (obligatoria para el API)

**Site configuration → Environment variables → Add a variable**

| Key | Value |
|-----|--------|
| `VITE_API_BASE_URL` | `https://ordino-ecommerce-con-pagos.onrender.com` |

(Sin barra al final; misma URL que tu backend en Render.)

Guardá y volvé a **Deploy** (o **Trigger deploy**) para que el build embeba la URL en el bundle.

## 3. Backend en Render (CORS)

En **Render → Environment** del servicio API:

| Key | Value |
|-----|--------|
| `FRONTEND_ORIGIN` | `https://TU-SITIO.netlify.app` |

Copiá la URL exacta que te da Netlify (HTTPS, sin path). Guardá → redeploy del backend si hace falta.

## 4. Mercado Pago

Las **back_urls** del checkout usan `FRONTEND_ORIGIN`; con el sitio en Netlify, los retornos a `/checkout/success` etc. deben apuntar al dominio Netlify. Asegurate de que `FRONTEND_ORIGIN` en Render sea la URL de Netlify (paso 3).

## 5. Dominio propio (opcional)

Netlify → **Domain settings** → dominio personalizado. Actualizá `FRONTEND_ORIGIN` en Render y cualquier config en MP si hace falta.
