## 2026-11-12 · Decisiones del paso 8.13-2 (el panel del ítem)

- **D1 · Generalizar en `logistica` y `flujos` dentro de este PR**, de forma aditiva: nada del camino del vehículo cambia de texto ni de conducta.
- **D2 · `?item=<id>` sólo se abre sin `?panel=`:** el stock y las imágenes usan `?panel=…&item=<id>` y no se pisan. `<ItemAbierto>` no se ata a la página: la «Cadena» (parte 3) lo monta igual.
- **D3 · Variante de repuesto en el hueco** (`repuesto?: { permisos, regla }`): sin ella el hueco no se dibuja para un ítem (Aduana, Gastos, Pagos, Margen). El filtro de tipo va antes de descartar repetidos.
- **D4 · Un solo botón en la fila:** «Abrir panel» (Qué falta ya nace abierto: «Mover» sería el mismo panel).
- **D5 · Transporte del ítem: sólo texto.** El formulario propio queda como abierto **8-13b** (la tabla `transportes` ya tiene `repuesto_id` y `transporte_guardar` acepta `p_repuesto`).
- **D6 · `Unidad.proyecto?`** opcional, sólo en un ítem, para «Abrir proyecto» y el texto del transporte; `esUnidadDeVehiculo` estrecha `origenId`.
- **D7 · El ítem se lee en `repuestos`** (`leerItemDelPanel`, con `fase_desde` y el proyecto) y `src/app` arma la `Unidad`: `logistica` no importa `repuestos`. Un proyecto que la RLS no deja ver deja el ítem en nulo.
- **D8 · Notas de un ítem:** `crearNota` y `editarNota` piden `repuestos.ver` (global) y no `logistica.ver` del origen; la policy de `notas` ya acepta ambas.
- **D9 · Documentos de un ítem:** los tipos del flujo de repuestos se buscan con `origen_id is null` (hoy `.eq('origen_id', …)` con nulo no encuentra nada).
- **D10 · Sin volumen:** notas e historial de un ítem son pocos por ítem y cada lectura lleva `limit 21`.
- **D11 · «Elegir» apagado con su motivo sólo para un ítem:** para un vehículo sin permiso el botón no se dibuja (así ya era); para el ítem se dibuja apagado con «No tienes permiso para mover repuestos.» debajo, como pide la fila 8.13.
- **D12 · Un hook con `history: 'push'` marca la vuelta del foco** (`abrirConVuelta` y `useVueltaDelFoco`, que `scripts/guardas/paneles-con-vuelta.test.ts` exige): `useItemPorUrl` lo hace con la clave `item`.
