## 2026-11-11 — Paso 6.02-3: mover en la base, la unidad y «dónde está» (parte 3 de 3, cierra el 6.02)

- **Hecho:** `logistica_unidad(p_vehiculo)` (demorada, fuera de regla con lo que le falta a su fase actual, quién la movió) y `logistica_donde_esta(p_buscar,
p_tope)` (hasta 10 unidades de los orígenes cuya logística veo, con la regla `logistica` activa, por título, VIN o lote), las dos `security definer` con el
  acceso de la cadena. Índice `notas_vehiculo_vivas_idx (vehiculo_id, creado_en desc, id desc) where eliminado_en is null`. Migraciones
  `20261112020400_fases_notas_indice`, `020500_fases_unidad`, `020600_fases_donde_esta`; pruebas `supabase/tests/areas/mover/unidad.sql` (U1, U2) y
  `donde-esta.sql` (DE1, DE2); dos entradas `L` en `supabase/tests/auditoria-leads.sql`; medición en `supabase/tests/medir-escala.sql` › «Dónde está».
- **Antes:** se unió `origin/main` (choque en `scripts/carreras.mjs`, quedan las dos carreras). Los rojos del CI de la parte 1 los arregló main.
- **Auditoría:** plan e informe con observaciones, atendidas (sin bloqueo).
- **Verificación** (`.piloto/salidas/6.02-3/`): `db:probar` entero, `db:lint`, la medición con volumen (dónde está: VIN 6,6 ms, título común 10,4, sin
  resultados 6,4, Ana 10,8), las guardas y dos mutaciones del acceso que caen.
- **Para 6.03:** registrar `logistica_donde_esta(p_tope)` en `scripts/guardas/paginas-en-la-base.ts` con un tope de 10 nuevo en `src/shared/lib/paginacion.ts`,
  junto con `logistica_cadena(p_tope)` y `logistica_cadena_columna(p_tope)`. La regla `logistica` ya viene activa en todo origen (`origen_crear_flujo`). `titulo`
  llega sin el campo principal (D9).
- **Para 6.04:** la lista de notas del panel va por `notas_vehiculo_vivas_idx` (su consulta lo nombra y se mide); `logistica_unidad` da «Fuera de regla» y `faltan`.
- **Para el coordinador:** en `docs/PLAN.md`, la fila 6.02 pasa a «Partido en 3: 6.02-1 (escritura), 6.02-2 (la cadena), 6.02-3 (unidad y dónde está),
  hecho»; su punto (7): `logistica_donde_esta` es `security definer` y sólo de orígenes con la regla `logistica` activa (D3), y su registro de páginas va a la
  fila 6.03. Lo de la fila que no se hizo en el 6.02, ya decidido: publicar sin mover la versión (abierto 6-2), el ensanche de `fuera_de_regla(p_flujo)`,
  `scripts/carreras/mover.mjs` vive en `supabase/tests/areas/mover/carreras.mjs`. La entrada «Fuera de regla» de `docs/GLOSARIO.md` se ensancha: «y, de una
  unidad, quien la ve en logística, por `logistica_unidad`». Fila nueva para `docs/RENDIMIENTO.md`: «Dónde está (`logistica_donde_esta`): 10 (máximo 10),
  trigramas de `titulo`, `vin`, `lote` y hasta 1.000 candidatas (más las propias por `vehiculos_creador_idx` donde se tiene “propios”); la consulta 0,2 ms
  (25), un VIN 6,6 (30), un título común 10,4 (50), sin resultados 6,4 (30), Ana 10,8 (50) (`medir-escala.sql`). Con más de 1.000 coincidencias de título,
  1.000 cualesquiera; con “propios”, el rescate trae sólo lo creado por quien busca.»
- e2e completo: no (6.02-3, Nivel 2 por el índice: lo corre el CI del PR; sin e2e dirigidos)
