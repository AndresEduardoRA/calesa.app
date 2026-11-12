## Paso 9.05 · Datos: exportar todo, parte 2 de 4 (2026-11-12)

- **`POST /datos/exportar`** (`src/app/(app)/datos/exportar/route.ts`, `datos.exportar.todo`): `Origin` de esta app, el pedido por `esquemaDelPedido`
  (hoy sólo `leads`, con `desde`/`hasta`), y `exportarTodo` en este orden: el permiso efectivo → la sesión → el layout y los catálogos → el conteo
  hasta 250.001 ids → **`datos_exportacion_registrar`** → el flujo. 403 sin el permiso o con 42501, 429 `{libreEn}` con el cupo gastado, 409
  `{tope}` y 404 sin registrar, 401 sin sesión. Cumple la condición de la auditoría del informe 9.05-1 (punto 6): ninguna fila se lee antes de la
  constancia (`route.test.ts`, T1–T8 y T12).
- **El flujo** (`features/exportar/flujo.ts`): un `ReadableStream` con `highWaterMark` 0, una página de 1.000 por cursor `(creado_en, id)` cuando el
  navegador tira; corta en las filas registradas (el conteo y la lectura usan el mismo instante de corte); una página que falla o un token a menos de
  30 s de vencer lo cortan con error (una descarga fallida, nunca un CSV que parezca entero).
- **La sesión del flujo** (`infra/cliente-del-flujo.ts`): un cliente de supabase-js con `accessToken` fijo (nunca refresca: rotar el refresh token
  después de responder cerraría la sesión por reuso). El token sale de `getSession()` y se verifica **ese mismo** con `getClaims(token)`; `exp` de los
  claims; con menos de 5 min, `refreshSession()` dentro del pedido, antes de la `Response`. Es la única excepción a «nunca getSession()» (ficha › «Ojo»).
- **Las columnas de leads** (`features/exportar/columnas-de-leads.ts`): `N.º` (con `leads.numero_global.ver`), Nombre, Teléfono (el de un lead
  ajeno, enmascarado tal cual lo da la base), Tipo, Origen, Dueño, Creado, Último seguimiento y los campos activos, con las celdas de la exportación
  propia de `leads` (reexportadas de forma aditiva desde `src/modules/leads/index.ts`).
- **Medido** (`supabase/tests/medir-datos-exportar.sql`, `MEDIR_SOLO=medir-datos-exportar pnpm db:medir:volumen`, 200.000 leads): la página de
  1.000 171 ms por `leads_listado_idx` sin `Function Scan`; la de ids 1 ms; el conteo entero 0,3 s; la lectura entera 33,9 s (42,3 s a 250.000). El
  tope queda en 250.000 (`.piloto/salidas/9.05-2/medir-1.txt`).
- **Fuera de `modulos`:** `src/modules/leads/index.ts` y su ficha (reexportaciones aditivas) y `scripts/mediciones.mjs`, `scripts/medir-listado.mjs`
  (la medición y sus variables).
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.05 sigue abierta con «parte 2 de 4 hecha: `POST /datos/exportar` con la fuente de leads (flujo con
  token fijo, constancia antes del primer byte); quedan 2b (vehículos y cotizaciones) y 3 (pantalla)». «Partes estimadas»: de 3 a 4. `parcial: true`.
- **Parte que queda — 9.05-2b:** las fuentes de vehículos (`vehiculos_inventario`, exige origen, layout del origen) y cotizaciones
  (`cotizaciones_listado`, de a 100), cada una con su `fuente-de-<entidad>.ts`, sus columnas con test y su medición; sin tocar el flujo ni el orden
  (`.piloto/planes/9.05-2.md` › «Lo que queda servido para la 9.05-2b»).
- **Parte que queda — 9.05-3:** la pantalla `/datos`, `navegacion.ts`, el e2e y `docs/UX.md` (`.piloto/planes/9.05-1.md` › «Lo que queda servido para
  la 9.05-3»).
- e2e completo: no (9.05-2, Nivel 1: lo prueba el CI del PR; sin dirigidos: ningún spec nombra /datos)
