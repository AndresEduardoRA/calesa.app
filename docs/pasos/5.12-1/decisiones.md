# Paso 5.12-1 — «Revisar», la base de `revisar_flujo()`

5.12-1 es parcial: el PR no marca `integrado 5.12`; la pantalla (la franja) sigue en 5.12-2.

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas: la duda del PLAN, con su recomendada. El plan: `.piloto/planes/5.12-1.md`.

- **D1** «Revisar» no frena: avisa y enlaza, nunca impide guardar (un flujo se arma por pasos y a medio armar siempre tiene avisos).
- **D2** Quien no configura el flujo recibe cero filas, no `42501` (lo pide el assert de la fila; además sólo quien configura ve la franja). Un flujo
  inexistente o nulo, también cero filas.
- **D3** `rol_sin_personas` sólo cuando **ninguno** de los roles de la lista tiene persona activa: un rol vacío al lado de uno con gente no impide mover.
  No replica la precedencia de `_puede_mover`: la lista de la fase cuenta aunque cada entrada tenga la suya, y no mira `flujos.mover.cualquiera` (un aviso
  de más ahí es tolerable: es sólo un aviso).
- **D4** `sin_salida` e `inalcanzable` no cambian: una fase cuya única salida va a una jubilada recibe `salida_a_jubilada` y no además `sin_salida`.
- **D5** Persona activa = `perfiles.activo and not perfiles.bloqueado`, la misma de la dominancia de equipo. No se usa `_estado_de_persona(…)` a propósito:
  ése separa «invitada» de «activa», y aquí una invitación sin aceptar cuenta como persona (menos avisos falsos; reversible).
- **D6** `entrada_no_automatica` sólo en flujos de vehículos (espejo de `_vehiculo_fase_de_entrada`, que sólo existe para vehículos). Con una sola inicial,
  cualquier requisito bloqueante cuenta (sin un vehículo no se puede evaluar si se cumple): por eso es `info` y dice «pueden nacer».
- **D7** La salida no promete orden (lo ordena `entities/revisar/avisos.ts` en la 5.12-2); los textos de los ocho códigos de antes no cambian.
