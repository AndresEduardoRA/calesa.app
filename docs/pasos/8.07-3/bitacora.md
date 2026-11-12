## 2026-11-12 · Paso 8.07-3: las rutas api/portal/* y el e2e por HTTP (parte 3 de 3 del 8.07)

- **Hecho:**
  - **IP y origen.** `entities/portal/ip.ts` suma `ipDelPedido` (primera de `x-forwarded-for`, si no `x-real-ip`; supone Vercel, D1) y
    `entities/portal/origen.ts` `mismoOrigenDelPortal` (la puerta contra CSRF), con sus pruebas; salen por `areas/portal/index.ts`.
  - **Rutas.** `src/app/api/portal/{ingresar,estado,documentos/[id],clave,salir}` con `_comun.ts`: `connection()` antes que nada (D13), 503 sin
    `PORTAL_COOKIE_SECRETO`, `Origin` en los POST, el mismo 401 para todo fallo de ingreso, 429 con `Retry-After: 900`, sesión que no vale → 401
    y cookie borrada, documento → 302 a una URL firmada de 60 s. Contrato con el sitio en `decisiones.md`.
  - **e2e.** `e2e/portal-api.spec.ts` sin celular (6 pruebas) y su soporte; secreto de prueba en `playwright.config.ts`.
  - Auditoría del plan: bloquea (prerender del 503 con `cacheComponents`), corregida en el plan. Auditoría del informe: observaciones; el `fix`
    prueba el `Path` al borrar la cookie.
- **Commits:** `a38498cf` (IP), `e1b7be14` (origen), `2a34f0ec` (ingresar), `5142c294` (estado y documentos), `5ed4a9bf` (clave y salir),
  `80d5e272` (e2e) y el `fix` `3fb49e77`.
- **Verificación** (`.piloto/salidas/8.07-3/`): entities 9 ✓; `vitest related` 9 ✓; `scripts/guardas` 1.118 ✓; `typecheck` y lint sin avisos;
  `mapa.sh --check` 0; e2e `portal-api` en escritorio 6 ✓ (build de producción: las cinco rutas `ƒ`); `nivel.mjs`: nivel 1, sin disparadores
  (el paso es Nivel 2 por el `src/shared` de la 8.07-2).
- **Para el coordinador** (`docs/PLAN.md`): «8.07 hecho» (las tres partes). Se cierran los arrastrados «el límite por IP» y «`api/portal/*`, la cookie
  con `otorgado_en` y el ingreso según el contrato». El riesgo «La IP real tras la reescritura» pasa a abierto: «medir la IP que llega a
  `/api/portal/ingresar` cuando el sitio publique el portal; si es la del sitio, una cabecera firmada por el sitio; el límite supone Vercel»
  (`docs/pasos/8.07-3/decisiones.md`, D1).
- **Para la persona:** cargar `PORTAL_COOKIE_SECRETO` (≥ 32) en Vercel, producción y preview, antes de publicar el portal (sin él, 503).
- e2e completo: no (8.07-3, Nivel 2 por el PR: lo corre el CI; dirigido portal-api en escritorio)
