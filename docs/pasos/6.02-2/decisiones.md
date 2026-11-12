## 2026-11-11 — Paso 6.02-2

- **Parte 2 de 3** (las lecturas de la cadena). Plan: `.piloto/planes/6.02-2.md`; las respuestas a la auditoría (bloqueó una vez: «Sin fase» sin origen),
  `.piloto/planes/6.02-2.respuestas.md`.
- **D1 · `security definer`, no invocadora** (la fila decía `security invoker`): las policies de `transportes` y `documentos` preguntan
  `puede_unidad(…, 'logistica.ver')` por fila; una invocadora que filtra por naviera, contenedor, booking o «por aprobar» pagaría un `puede_vehiculo` por fila
  recorrida, justo lo que la fila prohíbe. La definer resuelve el alcance una vez por origen y lo aplica a `vehiculos` con el predicado de su policy; toda
  consulta empieza por `origen_id = p_origen and eliminado_en is null`. Reversible sin cambiar la firma si las policies de las hijas dejan de ser por fila.
- **D2 · Se borra `vehiculos_origen_fase_idx`:** `vehiculos_cadena_idx (origen_id, fase_id, fase_desde, id)` lo cubre como prefijo con el mismo predicado y
  nadie lo nombra; la FK sigue cubierta por `vehiculos_fase_id_idx`.
- **D3 · Alcance = el menor de `logistica.ver` y `vehiculos.ver` del origen:** es lo que vería la invocadora (la policy de `vehiculos` más la regla de la
  fila). Quien tiene `logistica.ver` todos y `vehiculos.ver` propios ve sólo lo suyo (CA2).
- **D4 · Sin acceso, 42501 hint `acceso`** antes de leer nada, no una cadena vacía: la interfaz distingue «sin permiso» de «origen vacío».
- **D5 · «Sin fase» = `fase_id` nulo, por `id`; `fase_desde` existe si y sólo si hay fase:** lo asegura el check `vehiculos_fase_desde_coherente`, y el
  trigger `trg_0_fase_desde_coherente` completa a quien escribe sólo `fase_id` (los fixtures de las pruebas y `e2e/soporte/inventario-postgrest.ts` lo hacen;
  el check solo los rompería). Sin eso, una fila incoherente desaparecía del tablero sin aviso (auditoría, objeción 4).
- **D6 · Jubiladas y «Sin fase» sólo si traen tarjetas con los filtros aplicados;** las jubiladas al final. Una fase activa sin `es_logistica` no es columna.
- **D7 · Los filtros son de fila sobre el recorrido de la columna** (como la búsqueda del kanban): `q` contiene en título, VIN y lote y es prefijo en
  contenedor y booking, sin el GIN de trigramas (eso es de «dónde está», 6.02-3); `contenedor` y `booking` por igualdad sin mayúsculas; `naviera` por id.
- **D8 · `demorada` = el predicado de `alertas_demora`** (excluye la fase final y pide la regla `alerta_demora`); el filtro `demoradas` es rango del índice
  (`fase_desde < corte`). `demora_dias` de la columna son los días con que alerta (nulo si no alerta).
- **D9 · «Propios» es filtro de fila** con el predicado de la policy, sin rutas por cartera: una columna es una fase de un origen. Medido con Ana (informe).
- **D10 · El registro en `scripts/guardas/paginas-en-la-base.ts` pasa a 6.03:** `paginas.test.ts` cae con una entrada que nadie llama desde `src/`; la
  guarda de la base (`escala.sql`) ya exige `_acotar_pagina(p_tope, 50, 100)` desde esta parte.
- **D11 · `logistica_cadena_columna` lleva `p_origen` primero:** «Sin fase» (`p_fase` nulo) necesita el origen, y el alcance se resuelve sin leer la fase.
- **D12 · Entradas malas:** filtro desconocido o de otro tipo → 22023 hint `filtros`; fase de otro origen o sin `es_logistica` → 22023 hint `p_fase`; cursor
  sin `p_desde` → 22023 hint `cursor`; `q` sin 3 letras o dígitos seguidos se ignora.
