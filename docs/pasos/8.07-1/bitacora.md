## 2026-11-12 · Paso 8.07-1: el límite por IP del portal, en la base (parte 1 de 3 del 8.07)

- **Hecho:**
  - **Tabla.** `interno.portal_intentos`: una fila por huella, con su ventana de 15 minutos y su cuenta (tope 11). Tiene RLS, no tiene grants y no
    guarda la IP.
  - **Sal.** `portal:sal` en Vault, al azar y una sola vez.
  - **Límite.** `web.portal_intento(p_ip)` (`security definer`, sólo `service_role`) calcula la huella HMAC-SHA256 de la IP con la sal y la cuenta con
    un solo `insert … on conflict`. Da `false` desde el 11.º intento de la ventana.
  - **Purga.** `portal_intentos_purgar()` borra de a 10.000 las ventanas vencidas; el job `portal-intentos-purgar` la corre cada 5 minutos.
  - **Origen del sitio.** `web.portal_direccion_publica()` (sólo `service_role`) lee la dirección del sitio para el `Origin` de los POST.
  - Decisiones en `decisiones.md`. La auditoría del plan dio observaciones, todas atendidas: D6 queda como pendiente de medir, L5 se prueba también
    por catálogo, y la purga va con `row_count` y `limit`.
- **Commits:** `f20348f7` (el límite), `3bdca792` (la purga), `6101dd35` (la dirección) y `57a65059`, el `fix` que pidió la auditoría del informe
  (observaciones): L4 exige RLS en la tabla y L5 que las tres funciones sean `security definer` con `search_path` vacío, porque las guardas generales
  sólo miran `public`.
- **Falta (8.07-2):** `PORTAL_COOKIE_SECRETO`, `esRutaPublica` con `/api/portal/`, la cookie firmada con `node:crypto` y su `cookie.test.ts`, y
  `infra/portal/rpc.ts`, el único archivo con el cliente admin. De la auditoría del informe: `ipDelPedido` normaliza una IPv6 a su /64 antes de
  llamar a `portal_intento` (si no, un atacante recorre su /64 y nunca llega al tope, y cada dirección es una fila que la purga no alcanza), y el
  envoltorio de `portal_direccion_publica` la trata como `string | null` (los tipos generados dicen `string`).
- **Falta (8.07-3):**
  - los route handlers `api/portal/{ingresar,estado,documentos/[id],clave,salir}`;
  - `e2e/portal-api.spec.ts`, sin celular;
  - `acciones.md` sin `jose`;
  - el contrato con el sitio;
  - medir qué IP llega detrás de la reescritura (D6).
- **Verificación** (`.piloto/salidas/8.07/`):
  - `SOLO=areas/portal/limite-por-ip.sql pnpm db:probar`: L1–L7 en verde.
  - `db:probar` completo: 1.286 ✓, ningún ✗.
  - `db:lint`: sin avisos de las funciones nuevas.
  - `scripts/guardas`: 1.116 ✓.
  - `nivel.mjs`: nivel 2 (`rls`, `estructura`).
- e2e completo: no (8.07-1, Nivel 2 por rls y estructura: lo corre el CI del PR)
