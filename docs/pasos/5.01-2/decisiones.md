## 2026-11-11 — Paso 5.01-2

- **El 5.01 queda entero con el 5.01-2:** el 5.01-1 (la versión del flujo y su contrato, `fase_crear`, `fase_guardar`, sin escritura directa) y el 5.01-2 (`fase_mover`,
  `fase_impacto` y `_fase_uso`, `fase_eliminar` con versión y sin la firma vieja, `fase_reactivar`, el flujo de repuestos por migración, K4) hechos. Este PR marca
  `integrado 5.01` (`parcial: false`) y desbloquea 5.04, 5.05, 5.07 y 5.10. Plan: `.piloto/planes/5.01-2.md`.
- **Lo que pidió la auditoría del plan (observaciones), aplicado:** A2 deshabilita `trg_flujo_regla_apagar_validar` en su bloque revertido; D21 dice que un cambio de
  fase hacia la fase que se borra recibe el `23503`; la semilla no vuelve a meter reglas en un flujo de repuestos existente; `fase_impacto` no devuelve versión (D15).

- D15 · `fase_impacto` y `fase_eliminar` comparten `_fase_uso()`: lo que la pantalla anuncia es lo que eliminar hace. Tope fijo de 50 (lee 51) dentro de la
  función y sin parámetro: no es una página y un `p_tope` pediría `_acotar_pagina`. `fase_impacto` no devuelve versión: es una lectura sin candado (la versión la
  tiene la pantalla).
- D16 · Las paradas cuentan también las unidades en la papelera: la FK `restrict` de `vehiculos.fase_id` no las distingue y el borrado caería.
- D17 · Impiden borrar todas las esperas que apuntan a la fase: la FK `restrict` frena cualquiera. Una espera siempre viene del otro ámbito (vehículos ↔ repuestos: lo exige
  el trigger de `fases_requisitos`); el mensaje no dice «otro flujo».
- D18 · El resultado de `fase_eliminar` conserva los participios del viejo (`jubilada | eliminada`); `fase_impacto` usa los verbos de la fila (`jubilar | eliminar | bloqueada`), que anuncian.
- D19 · Una fase ya jubilada con historial o unidades no tiene nada que hacer: impacto `bloqueada`/`ya_jubilada` y eliminar `22023`. Una jubilada sin nada se borra.
- D20 · «Única inicial» se mira sólo si la fase está activa: una inicial jubilada no sostiene el flujo.
- D21 · `fase_eliminar` toma la fase `for update` antes de contar: espera al cambio de fase en curso hacia ella y cuenta lo que dejó (jubila en vez de un `23503`
  crudo). Jubilar sólo escribe `activa` (`no key update`): después no frena a nadie. Queda un caso: un cambio de fase hacia F (`cambiar_fase`, `cambiar_fase_lote` o un vehículo que nace en F) que llega mientras se
  borra recibe el `23503` de la FK (lo traduce 5.05).
- D22 · `fase_mover` renumera todas las fases del flujo (activas y jubiladas) de 10 en 10 por (posición, nombre, id), escribe sólo las que cambian y siempre mueve
  la versión (también sin cambio): una regla sola, como `categoria_mover`.
- D23 · `fase_reactivar` valida las reglas del flujo sobre la fila (`_fase_validar` con claves vacías); ya activa → `22023`. Sin evento de actividad nuevo
  (`trg_auditar` lo registra); jubilar y eliminar conservan `fase.jubilada` y `fase.eliminada`. Una regla apagada con una fase jubilada que la usa sólo se
  alcanza por escritura directa (`trg_flujo_regla_apagar_validar` cuenta también las jubiladas): la validación de reactivar queda como defensa.
- D24 · El flujo de repuestos por migración se crea sólo si falta, y las 7 reglas sólo con el flujo que crea: uno existente no se toca (sus reglas son de la
  empresa). `seed.sql` toma el flujo existente y siembra fases sólo si no tiene ninguna.
- D25 · Carrera nueva sólo K4 (eliminar contra un cambio de fase que entra): dos `fase_mover` o `fase_reactivar` con la misma versión los serializa el mismo
  `_flujo_para_editar` que K1 ya prueba.
- D26 · `p_despues_de` igual a la fase → `22023` con hint `despues_de` (es la forma del pedido); un ancla de otro flujo o que ya no existe → `PT409` «Recarga» (D7).
- D27 · El `42501` de las seis dice «No tienes permiso para configurar este flujo.» (cierra D8: la vieja «Sin permiso…» desaparece con su firma).
- D28 · (auditoría del informe, menor) Si ya había `orden` repetido y el ancla lo comparte con otra fase de nombre posterior, la movida cae detrás de esa otra (modelo
  `categoria_mover`). Tras el primer movimiento no quedan repetidos; queda para 5.04 si hace falta (desempatar por la posición renumerada del ancla).
