## 2026-11-11 — Paso 6.05: documentos en la base

- **Hecho:** los documentos se escriben sólo por RPC `security definer`:
  - `documento_registrar` registra, después de subir, para 1 a 100 vehículos (N filas, la misma ruta) o para un repuesto. Pide la clave de subir en
    cada unidad y es idempotente por `p_id`.
  - `documento_revisar` aprueba o rechaza (con motivo).
  - `documento_editar` cambia fechas, nota y `visible_portal`; este último, sólo quien aprueba.
  - `documento_eliminar` hace un borrado suave y encola el objeto si ya ninguna fila viva lo usa.

  Las tres de edición piden la versión (`PT409`), y el permiso va antes que la versión. Además:
  - Nadie nace aprobado.
  - La tabla perdió las policies «crear» y «editar» y el `insert`/`update`/`delete` de `authenticated`.
  - El trigger `documento_exigido` impide quitar (eliminar, rechazar o vencer a mano) el documento que hace cumplir un requisito bloqueante de la fase
    actual (`23514`), con un candado por unidad y tipo.
  - `storage_refcount` cuenta sólo las filas vivas.
  - El objeto compartido lo lee quien ve alguna fila viva con esa ruta.
  - El portal oculta los tipos que ya no lo permiten.
  - Hay dos índices nuevos: `documentos (ruta)` y el parcial de la bandeja por revisar.

- **Para PLAN (coordinador):**
  - Se cierra `DECISIONES.md:2348`, punto 4 (falta el índice de `documentos.ruta`).
  - La fila 6.02 (1) suma la carrera de D12: con `cambiar_fase` tomando la unidad antes de evaluar, el trigger de 6.05 ya serializa.
  - El 6.05 se hizo en una parte (la fila estimaba 3).
- **Verificación** (`.piloto/salidas/6.05/`):
  - `pnpm db:probar` entero tras unir main y el fix: 1001 ✓, 0 ✗ (`probar-final2.log`). Antes de unir, 932 ✓, 0 ✗ (`probar-todo-final.log`).
  - El área `supabase/tests/areas/documentos/` tiene 6 archivos:
    - `registrar.sql`: 4 bloques más los ayudantes;
    - `revisar.sql`: 3;
    - `exigido.sql`: 2;
    - `objeto-compartido.sql`: 1;
    - `portal.sql`: 1;
    - `carreras.mjs`: K1.
  - `humo.sql` suma un caso: la dueña registra, lee el objeto y su escritura directa da `42501`.
  - `pnpm db:carreras`: todas en verde; K1 de documentos ✓ (`db-carreras-final.log`).
  - `pnpm db:lint`: sin avisos en lo nuevo (`db-lint-final.log`).
  - `pnpm db:types`: sin diferencias tras unir main.
  - `typecheck` ok. Las guardas (`vitest run scripts/guardas`) dan 1061 ✓, y `carriles.mjs` da 16 archivos ✓.
  - `nivel.mjs` sobre el diff da `{"nivel":2,"disparadores":[{"id":"rls",…},{"id":"estructura",…}],"toca_interfaz":false}` (`nivel.json`).
    e2e completo: no (6.05, Nivel 2: lo corre el CI del PR; sin interfaz, sin dirigidos)
- **Commits:**
  - `b8e1379c` registrar;
  - `652b8020` revisar, editar y eliminar;
  - `6ba53197` sin escritura directa;
  - `44800d88` el que exige la fase;
  - `28ccc5fa` el objeto compartido;
  - `08efae5c` el portal;
  - `d3f9682d` el fix de la auditoría del informe (reintentar tras eliminar da `23505/id`);
  - y el de docs.
- **Tras unir main otra vez (a9f1cbd7):** choque en `scripts/carreras.mjs` (se juntan las carreras de documentos y las del principal del
  origen). Las seis migraciones pasan a `20261112011255`–`…260` (`5bc5ceed`). Main dejó `fases_requisitos.bloqueante` en `false` por omisión
  (5.07) y dos pruebas de `exigido.sql` cayeron porque su requisito nacía no bloqueante: ahora lo crean bloqueante (`8edca51b`). El rojo del CI
  anterior era la S5 del tope de push, arreglada en main (#130). `db:reset`, `db:types` sin diff, `db:probar` 1084 ✓ (`probar-final.log`),
  `db:carreras` en verde con la K1 de documentos (`carreras-tras-main.log`).
