## 2026-11-11 — Paso 5.05

- **Las transiciones y quién mueve se escriben sólo por RPC con la versión del flujo:** `transicion_crear`, `transicion_guardar`, `transicion_eliminar`,
  `fase_roles_poner` y `transicion_roles_poner`, todas por `_flujo_para_editar()`/`_flujo_tocar()` del 5.01, y sin escritura directa en `fases_transiciones`,
  `fases_roles` ni `fases_transiciones_roles`. Plan: `.piloto/planes/5.05.md`. La auditoría del plan dio observaciones; aplicadas abajo (D8, D14, D15 y la nota de
  `rbac_eliminar_rol` en la bitácora).

- D1 · Poner roles no exige `rol_dominado`: no otorga nada, sólo acota quién mueve (sigue haciendo falta `flujos.mover`, y `flujos.mover.cualquiera` salta las
  listas). Es la recomendada de la fila.
- D2 · Sólo el **destino** de una transición nueva tiene que estar activo: un origen jubilado puede tener salida (las unidades que siguen ahí necesitan salir).
  Guardar no revalida el destino y una fase jubilada acepta roles: ninguna de las dos abre un camino nuevo (`previsualizar_cambio_fase` ya rechaza el destino jubilado).
- D3 · Una fase que no existe es una pantalla vieja → `PT409`; una fase de otro flujo es un dato errado → `22023` con `hint` (`de_fase_id` o `a_fase_id`).
- D4 · La acción es el texto del botón: hasta 40 caracteres, recortada, vacía = sin acción (`null`).
- D5 · Poner la misma lista de roles mueve la versión igual (toda RPC de configuración devuelve la nueva) pero no escribe actividad. Tope de 100 roles por lista
  (el de `leerRolesParaElegir()` del 5.02); los repetidos se colapsan; un rol inexistente → `22023` con `hint roles`.
- D6 · Las transiciones ya se auditan por su `trg_auditar` (`fases_transiciones.<op>`): las RPC no duplican. Los roles, por `registrar_actividad()` con
  `fase.roles_cambiados` y `transicion.roles_cambiados`, `{roles: [uuid ordenados]}` antes y después (vacío = `[]`). Los roles que caen en cascada al borrar una
  transición no se registran aparte.
- D7 · Sin carrera nueva: el candado es el de `_flujo_para_editar()` (K1 del 5.01). `_roles_de_lista()` toma los roles con `for key share`, así un rol que se borra
  a la vez espera y no deja un `23503` crudo.
- D8 · El `23503` de un cambio de fase hacia una fase que se está borrando (D21 del 5.01-2, «lo traduce 5.05») no entra aquí: la fila del 5.05 excluye tocar
  `cambiar_fase`. **Para el coordinador, a PLAN:** en la fila del **6.02** (que recrea `cambiar_fase` y `cambiar_fase_lote`): «traducir el `23503` de
  `vehiculos_fase_id_fkey`/`historial_fases` de un cambio de fase hacia una fase que se borra a la vez, a `PT409` «Esa fase ya no existe. Recarga e intenta de
  nuevo.» (D21 del 5.01-2, D8 del 5.05)». El mismo caso en un vehículo que **nace** en esa fase (`vehiculo_crear`) va a la fila que recree `vehiculo_crear`
  (módulo vehículos; ninguna de la Fase 5 lo hace): hasta entonces queda como abierto.
- D9 · `transicion_guardar` no cambia origen ni destino: cambiar el destino es eliminar y crear (los roles propios de la transición no se arrastran a otro destino).
- D10 · Los errores de la lista de roles van después del permiso: un solo ayudante (`_roles_de_lista`) que también mira que los roles existan; quien no puede
  recibe `42501` primero.
- D11 · `transicion_eliminar` devuelve sólo la versión (`timestamptz`): a diferencia de `fase_eliminar`, tiene un único resultado.
- D12 · Los mensajes dicen «transición» (GLOSARIO); «salidas» es sólo el título del bloque del inspector (5.06).
- D13 · La ficha `src/modules/flujos/CLAUDE.md` no cambia aquí (este paso no tiene `src/modules/` entre sus módulos). **Para el coordinador, a la fila del 5.06:**
  sumar a la ficha la línea «RPC:» con las cinco nuevas y que «la configuración no se escribe directo» nombre también transiciones y roles.
- D14 · La fila dice «lista vacía = cualquiera con `flujos.mover`» para las dos RPC; en la de la transición, vacía significa que **manda la lista de la fase
  destino** (es lo que hace `_puede_mover`, que este paso no toca, y lo que dice la fila del 5.06: «vacío hereda los de la fase destino»). T5 lo prueba.
- D15 · `transicion_guardar` rechaza `{"nota_obligatoria": null}` con `22023` «no tiene el formato esperado» (`hint nota_obligatoria`), no con el `23502` crudo
  de la columna `not null`.
