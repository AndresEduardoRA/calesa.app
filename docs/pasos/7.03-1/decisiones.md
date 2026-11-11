## 2026-11-11 — Paso 7.03-1: push web, la base

- **D1 · Un pase y no un secreto compartido** (duda 1 de la fila): la base no guarda secretos. `push_disparar()` crea un pase de un uso (10 min) atado a
  la notificación y lo manda por `pg_net`; la función lo canjea con `push_abrir()`.
- **D2 · El envío va con Web Crypto (RFC 8291/8292) en la 7.03-2** (duda 2): el contrato lo importa Vitest desde Node y un `npm:web-push` no carga ahí.
  Se verifica ese día con `pnpm funciones`.
- **D3 · El push lleva título, cuerpo y `ruta`, nada más** (duda 3): `push_abrir()` no devuelve tipo, ids ni referencia.
- **D4 · Tope de 10 por persona: se borra la menos reciente** en vez de rechazar (quien cambia de navegador no queda trabado; cambiarlo por un 22023 es una
  línea). El candado consultivo del tope no lleva carrera en `scripts/carreras/`: si fallara quedarían 11, sin dinero ni datos ajenos; el canje de un uso
  lo serializa el `update … where usado_en is null`.
- **D5 · `push_desuscribir` no exige el permiso:** quien perdió el rol tiene que poder quitar las suyas; sin el permiso igual no recibe nada.
- **D6 · `push_pases` es tabla propia, no `cola_gc_pases`:** el pase queda atado a su notificación (cascade) y `storage_gc_abrir` no puede quemar uno de push.
- **D7 · Un pase y un pedido por notificación** (`for each row`): la función manda a lo sumo 10 por invocación. Un lote de 200 avisos de un job encola hasta
  200 pedidos `pg_net` si todos tienen push; se acepta (asíncronos tras el commit).
- **D8 · Sin `url_proyecto` el disparo calla** (sin warning): corre por cada notificación y los jobs ya avisan de la falta.
- **D9 · `fallos` sólo cuenta;** se borran sólo las 404/410 (un servicio caído no tira suscripciones buenas). 7.04 puede mostrar `fallos`.
- **D10 · Las pruebas van en `areas/push/push.sql` y `disparo.sql`** (tope de 300 líneas por archivo).
- **D11 · `push_abrir` y `push_resultado` entran en la 7.03-1** (la fila los ponía en la parte 2): son SQL y se prueban con `db:probar`; la 7.03-2 no toca la base.
- **D12 · Sin caso en `humo.sql`** (desvío de `.claude/rules/migraciones.md`): las policies tocadas tienen su prueba de área con usuario simulado (S2, S4).
- **D13 · Dos defensas contra el proxy abierto:** la base valida el endpoint (`_push_endpoint_valido()`: `https`, sin `\`, espacios ni control, host de la
  lista justo tras `https://`), borra al migrar las filas que no pasan (antes cualquiera insertaba la suya) y `push_abrir` sólo devuelve las válidas; el
  adaptador de la 7.03-2 vuelve a validar con `new URL()` y no hace `fetch` si no pasa.
- **D14 · La preferencia de push por tipo es un objeto** (check `preferencias_push_por_tipo`, `not valid` para no frenar la migración por una fila previa).
