## 2026-11-11 — Paso 6.02-1

- **Parte 1 de 3** (la escritura de mover). Plan: `.piloto/planes/6.02.md`; las respuestas a la auditoría, `.piloto/planes/6.02.respuestas.md`.
- **D1 · «Publicar sin mover la versión de la ficha» (duda 1 de la fila) no entra:** toca `vehiculos/features/vitrina`, fuera de este paso de base. Queda
  como abierto **6-2** (`vitrina_actualizado_en`), como dice la propia duda.
- **D2 · `for no key update` y no `for update`:** serializa a dos que mueven la misma unidad y no frena el `key share` de las FK de quien inserta hijos del
  vehículo (documentos, notas, transportes) mientras se mueve; `fase_id` y `fase_desde` no son clave de nadie. El acceso va antes del candado (como
  `_flujo_para_editar` del 5.01): quien no ve la unidad recibe 42501 sin esperar.
- **D3 · La esperada nula es estricta:** vale sólo para una unidad sin fase; con fase da PT409. Cierra la deuda aceptada «`cambiar_fase` acepta
  `p_fase_esperada` nulo» en vez de dejarla escrita. Nadie de `src/` llama todavía; `supabase/tests/humo.sql:230` pasa la esperada real.
- **D4 · Inexistente, en la papelera o sin `logistica.ver` (`repuestos.ver` para un ítem) dan un solo texto y 42501 (hint `acceso`)**, el mismo
  «… ya no está disponible: no existe o ya no tienes acceso.» de la interfaz del 6.01; sale de un ayudante, `_unidad_sin_acceso()`, que sólo ejecuta
  `service_role`. El nombre de quien movió (PT409) sólo llega a quien ya pasó el acceso.
- **D5 · El PT409 de mover no dice «Recarga»:** la interfaz ofrece recargar (patrón del 4.20-1).
- **D6 · `flujo_fuera_de_regla` no se ensancha a `logistica.ver`** (punto 4 de la fila): el 5.07 la dejó sólo para quien configura; lo de una unidad lo dará
  `logistica_unidad` (6.02-3). Ensanchar después es reversible; esconder, no.
- **D7 · Un lote mal formado no mueve nada** (22023, hint `p_unidades`): la forma es del llamador, no de una unidad. Un vehículo repetido se rechaza para que
  el resultado tenga una fila por unidad. Los ids se validan con `pg_input_is_valid` antes de convertir.
- **D8 · La vista previa del lote es invocadora:** sólo llama a la `definer` de una unidad, que ya mira el acceso.
- **D9 · Sin `flujos.mover` del origen da 23514 con hint `rol`**, como hasta ahora `_puede_mover`: la fila pide cuatro códigos de rechazo.
- **D10 · Sólo `vehiculos` deja de mover su versión al mover;** `repuestos_items` queda para la Fase 8.
- **D11 · La carrera vive en `supabase/tests/areas/mover/carreras.mjs`** (patrón del 5.01) y no en `scripts/carreras/mover.mjs`; `scripts/carreras.mjs` la
  importa y la llama.
- **D12 · El 6.02 se parte en 3:** 6.02-1 la escritura (Nivel 1), 6.02-2 la cadena (índice, Nivel 2), 6.02-3 la unidad y «dónde está».
- **D13 · «Documentos cargados» = vivos de cualquier estado y sólo frenan enviar a la papelera y la limpieza** (`p_al_enviar`). La purga de lo que ya está en
  la papelera no cambia: junta y encola las rutas de `documentos` a propósito, y frenarla dejaría para siempre a un vehículo ya borrado.
- **D14 · Los docs de esta parte van a `docs/pasos/6.02-1/`** (como 5.07-1 y 5.07-2).
- **D15 · El lote toma `assert_activo()` al principio:** una cuenta bloqueada aborta el lote entero en vez de devolver 200 filas sin código.
