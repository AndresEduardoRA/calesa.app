## 2026-11-12 · Decisiones del paso 8.13-1 (el motor de mover y las esperas)

- **D1 · Generalizar en este PR, no pedir al carril ni duplicar:** `flujos` mover y el núcleo de `logistica` son de la base; se agrega la rama de repuesto sin borrar nada del vehículo.
- **D2 · `Unidad.origenId` pasa a `string | null` en la parte 2** (nulo para el ítem); en la parte 1 `origenId` sólo se exige al vehículo.
- **D3 · Sin «fuera de regla» ni «quién la movió» para un ítem:** `logistica_unidad` es sólo de vehículo y leerlo exigiría una RPC `security definer`. Queda el abierto **8-13a**.
- **D4 · La vista «Cadena» y los bloques de Inicio leerán `repuestos_items` por PostgREST bajo la RLS**, con cursor `(fase_desde, id)` y tope + 1 (partes 3 y 4).
- **D5 · «Esperas que destraban vehículos» lista ítems pendientes de proyectos con vehículo**, sin el cruce exacto con la fase del vehículo (abierto 8-13a).
- **D6 · Los pagos del proyecto van como parte 5:** `pago_registrar` es sólo de vehículo; hace falta una RPC nueva `security definer` de dinero.
- **D7 · El carril `c` escribe sus docs en `docs/pasos/8.13-N/`.**
- **D8 · `unidadParaMover` cambia `vehiculoId` por `unidadId` y `tipo`:** nadie fuera de `flujos` lo usaba.
- **D9 · `esperasQueDestraban` va sin interfaz de repositorio ni composición:** es una lectura (como `leerMargenDelProyecto`); el `index.ts` del área la exporta desde `infra/`.
- **D10 · `p_tope` = 50 y no 51:** la RPC suma una fila de más por sí misma (`_acotar_pagina(p_tope, 50, 200) + 1`); el plan decía 51 y habría pedido 52.
