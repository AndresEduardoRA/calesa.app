## 2026-11-11 — Paso 6.02-1: mover en la base, el candado, el conflicto con nombre y el lote por unidad (parte 1 de 3)

- **Hecho:** `cambiar_fase` mira el acceso, toma la unidad `for no key update` y recién entonces lee la vista previa; la fase esperada vieja da PT409 con quién y
  cuándo (`_fase_conflicto`), y cada rechazo lleva su código en `hint` (`acceso`, `unidad`, `conflicto`, `transicion`, `rol`, `requisitos`, `nota`).
  `previsualizar_cambio_fase` suma `codigos`, exige `repuestos.ver` para un ítem y cuenta la nota obligatoria de la transición. `cambiar_fase_lote(p_unidades
jsonb, …)` reemplaza la de `uuid[]`, con la esperada por unidad y un resultado por unidad; nace `previsualizar_cambio_fase_lote`. `evaluar_requisitos` y
  `unidad_llego_a_fase` dejan de ser de `authenticated` y el `detalle` trae `tipo_documento_id` y `clave_dato`. Mover no mueve la versión de la ficha ni
  audita `vehiculos.update`. Un vehículo con documentos vivos no va a la papelera. Migraciones `20261112023125_fases_mover_candado`,
  `231804_fases_mover_lote`, `232006_fases_requisitos_sin_execute`, `232044_fases_mover_sin_version`, `232107_fases_papelera_con_documentos`; pruebas
  `supabase/tests/areas/mover/{mover,permisos,lote,version}.sql` y la carrera `supabase/tests/areas/mover/carreras.mjs` (K1, K2).
- **Auditoría:** plan con observaciones (atendidas); informe bloqueado por una edición posterior a las corridas: se volvieron a correr `db:reset`,
  `db:probar` y `db:carreras`, y P3 y P5 suman la esperada vieja sin acceso y el caso positivo del repuesto.
- **Verificación** (`.piloto/salidas/6.02-1/`): `db:probar` entero, `db:carreras` y las guardas en verde (los números, en el informe del paso).
- **Para 6.02-2:** la cadena va sobre las firmas de hoy; `logistica_unidad` (6.02-3) no puede ser invocadora porque `authenticated` ya no ejecuta
  `evaluar_requisitos`: será `security definer` con un `puede_vehiculo(…, 'logistica.ver')`.
- **Para el coordinador:** en `docs/PLAN.md`, la fila 6.02 queda «Partido en 3: 6.02-1 (escritura, hecha), 6.02-2 (la cadena), 6.02-3 (unidad y dónde está)»;
  nace el abierto **6-2** «publicar sin mover la versión de la ficha (`vitrina_actualizado_en`)» en «Abiertos que caen aquí»; los puntos 1, 2, 11 y 12 de
  «lo que la base no hace» (`docs/PLAN.md:1070-1089`) quedan cerrados; el punto (4) de la fila 6.02 se corrige: `flujo_fuera_de_regla` sigue sólo para quien
  configura (D6); el «Lugar» de su carrera pasa a `supabase/tests/areas/mover/carreras.mjs` (D11). En `docs/ESTADO.md` salen el arrastre «la papelera manual no
  mira `documentos`», la mitad «mover» del de la versión (queda «publicar» como 6-2) y la deuda «`cambiar_fase` acepta `p_fase_esperada` nulo».
- e2e completo: no (6.02-1, Nivel 1 sin e2e dirigidos: lo prueba el CI del PR)
