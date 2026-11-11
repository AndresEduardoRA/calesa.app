## 2026-11-11 — Paso 5.03: la base de «Tipos de documento»

- **Hecho:** los tipos de documento se escriben sólo por RPC `security definer`: `tipo_documento_crear`, `_guardar`, `_mover`, `_eliminar` y
  `tipos_documento_con_uso`. El grupo global pide `logistica.catalogos.gestionar`; el de un flujo, `puede_configurar_flujo()`. Tienen versión por fila
  (trigger propio, ordenar no la mueve), `PT409` y validación de nombre, formatos y vencimiento con su `hint`. Achicar los formatos que pide un requisito
  falla, y `fase_requisito_validar()` lee los formatos `for share`. En uso, el tipo se desactiva; sin uso, se borra. Sin las policies «crear» y «editar» y
  sin `insert`, `update` ni `delete` para `authenticated`. El vencimiento queda explicado con `comment on column`. «Tipo de documento» entra en GLOSARIO.
- **Para PLAN (coordinador):** el 5.03 se hizo en una parte (la fila estimaba 2). Hay que sumar a la fila 6.05 este pendiente: apagar
  `visible_portal_permitido` no oculta los documentos que ya se muestran en el portal, porque el portal lee `documentos.visible_portal` (D8 del paso).
- **Verificación** (`.piloto/salidas/5.03/`):
  - `pnpm db:probar` entero en HEAD: 774 ✓, 0 ✗ (`probar-final.log`).
  - El área: `supabase/tests/areas/flujos/tipos-de-documento.sql`, con 9 bloques (permisos, versión, uso, formatos y escritura directa), y
    `tipos-de-documento-datos.sql`, con 3.
  - `db:lint`: sin avisos en lo nuevo.
  - Guardas de migraciones y carriles: 44 ✓.
  - `nivel.mjs` sobre el diff da `{"nivel":2,"disparadores":[{"id":"rls",…}],"toca_interfaz":false}` (`nivel.log`).
    e2e completo: no (5.03, Nivel 2: lo corre el CI del PR)
- **Commits:** `3821303c` crear · `f7c26d12` guardar · `b471de06` ordenar · `a79a1183` eliminar o desactivar · `f0f4c173` sin escritura directa · docs.
