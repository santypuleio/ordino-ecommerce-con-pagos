# Google Apps Script (sin Google Cloud / sin tarjeta)

Tu backend puede escribir en **Egresos** y descontar **Stock** llamando a un **Web App** de Apps Script que vive en el mismo Google Sheet. No hace falta cuenta de servicio ni APIs de Google Cloud.

## Paso 1 — Abrí tu hoja “Gestor Stock”

Abrí el spreadsheet donde tenés las pestañas (ej. `ValidacionSTOCK`, `Egresos`).

## Paso 2 — Creá el script

1. Menú **Extensiones → Apps Script**.
2. Borrá el contenido por defecto y pegá **todo** el código del archivo `backend/scripts/google-apps-script/Code.gs` de este repo (o copialo desde abajo en la misma guía del README del backend).
3. En el script, editá **solo** estas constantes al inicio:
   - `SECRET`: una clave larga aleatoria (la misma que pondrás en `GOOGLE_APPS_SCRIPT_SECRET` en el `.env` del backend).
   - `SHEET_STOCK`: nombre exacto de la hoja donde está el stock (ej. `ValidacionSTOCK`).
   - `SHEET_EGRESOS`: normalmente `Egresos`.
   - `STOCK_RANGE`: rango a leer (ej. `A1:Z1000`).

Guardá (💾).

## Paso 3 — Desplegá como aplicación web

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. **Descripción**: por ejemplo `ordino-webhook-v1`.
4. **Ejecutar como**: **Yo** (tu cuenta).
5. **Quién tiene acceso**: **Cualquier usuario** (así tu servidor Node puede hacer `POST` con el `SECRET` en el cuerpo; la seguridad la da el secreto).
6. **Implementar** y copiá la **URL** (termina en `/exec`).

**Importante:** cada vez que cambiás el código del script, **no alcanza con Guardar**. Tenés que volver a **Implementar → Administrar implementaciones →** ícono **lápiz** en la implementación existente → **Versión: Nueva versión** → **Implementar**. Si no, la URL `/exec` sigue ejecutando el código viejo.

## Paso 4 — Configurá el backend

En `backend/.env`:

```env
# Apps Script (modo recomendado sin Cloud)
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
GOOGLE_APPS_SCRIPT_SECRET=la_misma_clave_que_SECRET_en_el_script

# Podés dejar vacíos si SOLO usás Apps Script (no hace falta Sheets API):
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_RANGE=
```

Reiniciá el backend.

## Paso 5 — Probar

Desde la carpeta `backend`:

```bash
npm run test:apps-script
```

Opcional en `backend/.env`: `APPS_SCRIPT_TEST_TITLE` y `APPS_SCRIPT_TEST_ID` (por defecto prueba con **Iphone 10** y precio 300000, alineado a una fila real de tu hoja **STOCK**). Antes el ejemplo usaba un producto inventado: si no coincidía con **Producto** en la hoja, el stock no se actualizaba o podía chocar con validaciones en otra fila/columna.

- Si todo está bien, el JSON incluye `"ok": true` y `"scriptBuild": "egresos-a1-phase-..."`.
- Si falla y **no** aparece `scriptBuild` en el JSON, la Web App **todavía usa una versión antigua** del script: repetí el despliegue con **Nueva versión** (arriba).

Luego podés probar con Mercado Pago: revisá logs del backend (`Venta sincronizada vía Apps Script`) y la hoja **Egresos** / stock.

## Seguridad

- Usá un `SECRET` largo y aleatorio (20+ caracteres).
- No subas el `.env` a Git.
- Si filtrás la URL del Web App, sin el secreto no deberían poder escribir; igual rotá el secreto si lo dudás.

## Problemas comunes

| Síntoma | Qué revisar |
|--------|-------------|
| 401 / unauthorized en logs | `SECRET` distinto entre script y `.env`. |
| No encuentra producto para stock | Nombres de columnas `id`/`Producto` y filas en `SHEET_STOCK`. |
| No agrega en Egresos | Nombre de pestaña `SHEET_EGRESOS` y que existan columnas A–G en fila 1. |
| Redirect HTML | La URL debe ser la de **Implementar**, no la del editor. |
| En el navegador: "No se encontró doGet" | Normal si el script solo tenía `doPost`. El `Code.gs` del repo incluye un `doGet` de prueba: pegá el código actualizado, **Nueva versión** e implementá de nuevo. Abrís la `/exec` y deberías ver JSON con `scriptBuild`. |
| Error “datos 1, rango 10152” y JSON **sin** `scriptBuild` | Código viejo aún desplegado: **Nueva versión** + Implementar. Revisá que no haya **otro archivo** `.gs` en el mismo proyecto con un `doPost` viejo (solo debe haber un `doPost`). |
| Error con `scriptBuild` y `"phase":"egresos"` | El fallo es al escribir **Egresos** (tabla/formato); probá sin tabla o contactá con el mensaje exacto. |
| Error con `phase":"stock"` | Egresos ya se escribió; revisá columnas **Stock** / **id** / **Producto** en la hoja de stock. |
| `infringen las reglas de validación de datos` en columna Stock | El script limpia validación en **toda la columna Stock** dentro de `STOCK_RANGE` (`clearDataValidations` + `setDataValidation(null)`) y vuelve a escribir. Reimplementá con el `Code.gs` más reciente (`scriptBuild` …`stock-colfix`). Si sigue fallando: revisá que la fila 1 tenga la columna **Stock** bien nombrada (no mezclar con **Producto** en B) y que la celda no esté **protegida**. |
