## 2026-11-11 — Paso 6.02-2: mover en la base, las lecturas de la cadena (parte 2 de 3)

- **Hecho:** `logistica_cadena(p_origen, p_tope, p_filtros)` (una columna por fase activa de logística, «Sin fase» primera y jubiladas al final sólo con
  tarjetas; por columna `p_tope` tarjetas y `hay_mas`) y `logistica_cadena_columna(p_origen, p_fase, p_desde, p_id, p_tope, p_filtros)` por cursor
  `(fase_desde, id)`, las dos `security definer` con el alcance resuelto una vez por origen (el menor de `logistica.ver` y `vehiculos.ver`; sin él, 42501 hint
  `acceso`). Filtros `q`, `demoradas`, `por_aprobar`, `contenedor`, `booking`, `naviera`; `demorada` con el criterio de `alertas_demora`. Índice
  `vehiculos_cadena_idx (origen_id, fase_id, fase_desde, id)` en lugar de `vehiculos_origen_fase_idx`; check y trigger `vehiculos_fase_desde_coherente`
  (`fase_desde` existe si y sólo si hay fase). Migraciones `20261112023130_fases_cadena_indice`, `002914_fases_desde_coherente`, `002928_fases_cadena_columna`,
  `002931_fases_cadena`; pruebas `supabase/tests/areas/mover/cadena.sql` (CA1–CA5) y `fase-desde.sql` (CA6); medición en `supabase/tests/medir-escala.sql` › «La cadena».
- **Auditoría:** el plan bloqueó una vez («Sin fase» sin origen ni papelera en una definer); corregido en el plan antes de escribir (las cuatro consultas
  empiezan por el origen y fuera de la papelera; CA2 lo prueba con otro origen y la papelera, en fase y sin fase).
- **Verificación** (`.piloto/salidas/6.02-2/`): `db:probar` entero, la medición con volumen y las guardas (los números, en el informe del paso).
- **Ojo en la nube:** la migración de coherencia le pone `fase_desde` (su última edición) a las unidades con fase y sin `fase_desde`; hasta hoy no entraban
  en `alertas_demora()` y desde ahora sí: puede salir una tanda de alertas de demora la primera vez.
- **Para 6.02-3:** `_logistica_alcance(p_origen)`, `_logistica_dias(p_fase)` y `_logistica_filtros(jsonb)` existen (sólo `service_role`):
  `logistica_donde_esta` (definer) puede usar el alcance por cada origen de `origenes_con_alcance('logistica.ver', 'propios')` en vez de un `puede_vehiculo` por
  fila. Tampoco entra al registro de páginas hasta que `src/` la llame (6.03); su `p_tope` va por `_acotar_pagina`. Los trigramas de `titulo`, `vin` y `lote`
  son para ella, no para la cadena.
- **Para el coordinador:** en `docs/PLAN.md`, la fila 6.02 pasa a «Partido en 3: 6.02-1 (escritura, hecha), 6.02-2 (la cadena, hecha), 6.02-3 (unidad y
  dónde está)»; su punto (7) se corrige a `security definer` (D1), con `p_origen` primero en `logistica_cadena_columna` (D11), y «registradas en
  `scripts/guardas/paginas-en-la-base.ts`» pasa a la fila 6.03 (D10: 6.03 suma `logistica_cadena(p_tope)` y `logistica_cadena_columna(p_tope)` con
  `pideElCodigo: TAMANO_DE_COLUMNA`). `docs/PLAN.md:1057` nombra `vehiculos_origen_fase_idx`, que ya no existe: es `vehiculos_cadena_idx`. «Cadena» (de
  logística) y «demorada» no tienen entrada en `docs/GLOSARIO.md`. Fila nueva para `docs/RENDIMIENTO.md`: «Cadena de logística (`logistica_cadena`,
  `logistica_cadena_columna`): 50 por columna (`TAMANO_DE_COLUMNA`, máximo 100), `vehiculos_cadena_idx`; la consulta < 0,1 ms (25), el tablero 3,3 ms (30),
  «Ver más» 1,6 (15), buscar sin resultados 10,7 (50), Ana 3,2 (30), con 3.333 vehículos en la columna (`medir-escala.sql`). «Propios» y buscar sin resultados
  recorren la columna entera (crecen con ella).»
- e2e completo: no (6.02-2, Nivel 2 por el índice: lo corre el CI del PR; sin e2e dirigidos)
