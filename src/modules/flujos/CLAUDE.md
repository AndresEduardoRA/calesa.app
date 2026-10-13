# flujos

Motor único de flujos: fases, transiciones, requisitos (documento | dato | espera), roles por fase y transición, reglas por flujo, jubilar/eliminar, revisión de coherencia y la RPC `cambiar_fase` que mueve vehículos y repuestos.

## Entra y sale

- Entra: configuración del dueño en `/configuracion/flujos` (un flujo por origen + el de repuestos); llamadas a mover desde `logistica` y `repuestos`.
- Sale hoy por `index.ts`: `leerFasesDeOrigen(origenId)` → `FaseResumen[]` (id, nombre, color, orden, inicial, final, activa; también las jubiladas). Por `client.ts`: el tipo `FaseResumen`. Lo consume `vehiculos` para mostrar la fase y filtrar por ella.
- Saldrá con su fase del plan (todavía no existe): `transicionesDisponibles()`, `previsualizarCambio()`, `cambiarFase()`, `cambiarFaseLote()`, `<BadgeFase>`. Lo consumirán `logistica`, `repuestos`, `web` (fases públicas).
- Depende de: `origenes`.

## Archivos clave

- `entities/fase.ts` — `FaseResumen`, `fasesDesde()`. `infra/queries/fases.ts` — `getFasesDeOrigen()`. `composicion.ts`.
- Todavía no existen (fases 5 y 6 del plan): `entities/transiciones.ts` — máquina de estados pura (espejo de `_puede_mover`), sólo para UX; la RPC es el candado.
- `entities/revisar.ts` — tipos de los avisos de `revisar_flujo()` (sin salida, inalcanzable, esperas cruzadas, roles que nadie tiene).
- `features/configuracion/` (camino / lista / historial, inspector por fase), `features/requisitos/`, `features/reglas/`.

## Tablas

`flujos`, `flujos_reglas`, `fases`, `fases_transiciones`, `fases_roles`, `fases_transiciones_roles`, `tipos_documento`, `fases_requisitos`, `historial_fases`.
RPC: `cambiar_fase`, `cambiar_fase_lote`, `previsualizar_cambio_fase`, `evaluar_requisitos`, `revisar_flujo`, `fase_eliminar`, `fuera_de_regla`, `unidad_llego_a_fase`, `claves_dato_requisito`.

## No se rompe

- `cambiar_fase` es la única que **mueve** (`fase_id` de vehículos e ítems de repuesto): secuencia viva → destino activo → transición o inicial → rol → requisitos bloqueantes → historial + nota + actividad, con `FOR UPDATE` y `PT409` si la fase esperada cambió.
- Una fase con historial no se elimina: se jubila (`activa = false`) y sale de los destinos. `fase_eliminar` cuenta unidades, historial y esperas de otros flujos antes de borrar.
- Un requisito nace informativo; volverlo bloqueante muestra cuántas unidades quedan «fuera de regla» y pide confirmación.
- Las esperas se evalúan al entrar a la fase y nunca mueven en cascada.

## Ojo

- Clave de dato nueva = caso en `_requisito_dato_cumplido()` **y** en `claves_dato_requisito()`, o la UI la ofrece y la RPC la rechaza.
- `fases.demora_dias`: NULL hereda `ajustes_empresa.demora_dias_default`, 0 apaga la alerta. Un solo lector del umbral (`alertas_demora`).
- El vehículo nace en la fase inicial **sólo si no hay nada que decidir** (`vehiculo_crear`: exactamente una inicial activa, que no pide nota, sin requisitos bloqueantes pendientes ni roles que excluyan a quien crea), con su fila en `historial_fases` (`de_fase_id` nulo). Si no, nace sin fase y la primera transición explícita (`cambiar_fase`) lo pone en una inicial. Entrar al nacer no pide `flujos.mover`.
- Un origen recién creado tiene flujo y reglas pero **ninguna fase**: `leerFasesDeOrigen()` devuelve una lista vacía.
