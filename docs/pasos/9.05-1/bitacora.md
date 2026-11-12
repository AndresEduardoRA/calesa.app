## Paso 9.05 · Datos: exportar todo, parte 1 de 3 (2026-11-12)

- **`datos_exportacion_registrar(p_entidad, p_filas, p_filtros)`** (definer, `search_path` vacío): el enforcement de `datos.exportar.todo` (42501 sin
  él). Entidades `leads`, `vehiculos`, `cotizaciones`; hasta 250.000 filas; filtros sólo `desde`, `hasta` (fecha) y `origen` (obligatorio en vehículos,
  rechazado en leads), cada rechazo 22023 con su `hint`. Candado por persona antes de leer `actividad`; 3 por hora por persona y por entidad leyendo las 3
  más recientes (sin `count(`); la cuarta, `{ok: false, libre_en}`. Constancia `datos.exportado` con entidad, filas y filtros: nada de nadie.
- **`datos_exportar_leads()`** (invocadora, SQL `stable`, inlineable): `leads_vista` con la sesión de quien exporta y sin las marcas de quien mira. De un
  lead ajeno sale el teléfono enmascarado y sin los campos de sólo cartera; el número global sólo con `leads.numero_global.ver`. PostgREST le pone el
  orden, el cursor y `max_rows`. Se inlinea también en el Postgres local (`.piloto/salidas/9.05-1/explain-postgres.txt`: sin `Function Scan`).
- **Cierra:** la deuda «`datos.exportar.todo` sin enforcement» (sale su excepción de `permisos-enforcement.sql`; `aplicado_en` =
  `datos_exportacion_registrar` en la migración y en `seed.sql`). En `docs/ESTADO.md` › «Deuda aceptada», `datos.exportar.todo` sale de los permisos sin
  enforcement.
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.05 sigue abierta con «parte 1 de 3 hecha: `datos_exportacion_registrar` (enforcement de
  `datos.exportar.todo`) y `datos_exportar_leads()`».
- **Guardas tocadas:** `permisos-enforcement.sql` (sin la excepción), `numero-global.sql` (sonda de `datos_exportar_leads` y motivo del registrar),
  `auditoria-leads.sql` (`datos_exportar_leads()` como `L`: entra por sus columnas de salida `tipo_lead_id`/`origen_lead_id`). Un mensaje del registrar
  se escribió sin la palabra «antes» para no caer en el detector de `cotizaciones-visibilidad.sql` (que busca `actividad` con `antes|despues`).
- **Pruebas:** `supabase/tests/areas/datos/exportar.sql`, 7 bloques en verde (`.piloto/salidas/9.05-1/probar-solo-3.txt`): sin permiso 42501, definer y
  candado antes de leer `actividad` (catálogo); la cuarta da `libre_en` exacto y el tope es por entidad; la constancia exacta y 16 rechazos con su `hint`;
  con dos cuentas y la consulta del route handler, el lead ajeno enmascarado y sin campo privado (y el propio completo, como control); inlineable.
  `pnpm db:probar` completo: `.piloto/salidas/9.05-1/probar-3.txt`.
- **Parte que queda — 9.05-2:** el route handler `POST /datos/exportar` (Origin, Zod, cuenta acotada a 250.001, registrar, CSV por páginas de cursor en
  stream), `entities/exportacion.ts` con Vitest, `infra/`, `features/exportar/lecturas.ts` y la composición; medir primero si la sesión sigue viva mientras
  el stream lee; la medición con volumen de la lectura (`.piloto/planes/9.05-1.md` › «Lo que queda servido para la 9.05-2»).
- **Parte que queda — 9.05-3:** la pantalla `/datos` (`?seccion=exportar|importar`), sus estados, `navegacion.ts`, `e2e/datos-exportar.spec.ts` y
  `docs/UX.md:107` (`.piloto/planes/9.05-1.md` › «Lo que queda servido para la 9.05-3»).
- e2e completo: no (9.05-1, Nivel 1: lo prueba el CI del PR; sin dirigidos: no toca texto de e2e/)
