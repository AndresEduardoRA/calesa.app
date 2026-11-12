## 2026-11-12 · Paso 8.07-2: la cookie firmada y la capa infra del portal (parte 2 de 3 del 8.07)

- **Hecho:**
  - **Secreto.** `PORTAL_COOKIE_SECRETO` opcional (≥ 32) en el esquema del servidor, `.env.example` y `docs/ENTORNOS.md`.
  - **Ruta pública.** `esRutaPublica` deja pasar `/api/portal/` (no `/api/portal` ni `/api/portalx`).
  - **Cookie.** `infra/portal/cookie.ts`: HMAC-SHA256 de `node:crypto` sobre `{l, o, e}`; firma comparada como texto base64url en tiempo
    constante, 7 días, `otorgado_en` tal cual. `entities/portal/sesion.ts`: tipo, constantes, opciones de la cookie y el Zod de `otorgado_en`.
  - **IP.** `entities/portal/ip.ts`: `agruparIp` (IPv4 canónica, IPv6 a su /64, mapeada → IPv4). Cierra la observación 3 del 8.07-1.
  - **RPC.** `infra/portal/rpc.ts`, el tercer archivo con el cliente admin (lint, `admin.ts`, `datos.md`, ficha de `shared`): sólo `web.portal_*` y la
    URL firmada de `documentos`; lo que vuelve pasa por Zod con nulo donde la base lo da (observación 4 del 8.07-1).
  - **Área.** `areas/portal/composicion.ts` ata el secreto: salen `portalDisponible()`, `firmarSesionDelPortal()`, `leerSesionDelPortal()` y las
    seis RPC `…DelPortal`.
  - `acciones.md` sin `jose`. Auditoría del plan: observaciones, atendidas. Auditoría del informe: observaciones; el `fix` suma las pruebas que no
    caían y rechaza una hora inválida.
- **Commits:** `2627f087` (secreto), `5a985545` (ruta pública), `4ecec756` (cookie), `c93ced89` (IP), `cbc5cdac` (RPC y admin), `bdb296ef`
  (`acciones.md`) y el `fix` `cbae5dc0`.
- **Falta (8.07-3):**
  - los handlers `src/app/api/portal/{_comun.ts,ingresar,estado,documentos/[id],clave,salir}`, con Zod de `codigo`, `clave` y `documentoId` (D12);
  - `ipDelPedido(headers)` tras medir D6 del 8.07-1, con sus casos en `entities/portal/ip.test.ts`;
  - `PORTAL_COOKIE_SECRETO` de prueba en `playwright.config.ts` y `e2e/portal-api.spec.ts` sin celular;
  - el contrato con el sitio. Ojo: la URL firmada del 302 lleva la ruta del documento en su path (la de Supabase es así); el e2e comprueba que
    la ruta no va en el cuerpo, no en el `Location`.
- **Verificación** (`.piloto/salidas/8.07-2/`):
  - `cookie.test.ts` 6 ✓ (y 3 ✗ sin sus guardas, a propósito); `ip.test.ts` 3 ✓; `rutas.test.ts` con K7.
  - `vitest related` de los archivos tocados: 1.248 ✓; `scripts/guardas`: 1.117 ✓; `typecheck` y lint sin avisos; `mapa.sh --check` 0.
  - `nivel.mjs`: `{"nivel":2,"disparadores":[{"id":"shared",…}],"toca_interfaz":false}`. Sin e2e dirigidos (ningún spec nombra `api/portal`).
- e2e completo: no (8.07-2, Nivel 2 por shared: lo corre el CI del PR)
