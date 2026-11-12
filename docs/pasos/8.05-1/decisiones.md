## 2026-11-12 · Decisiones del paso 8.05-1 (la tarjeta de turno y el bloque de Inicio)

- **D1** · La tarjeta vive en el bloque de Inicio y sale por `client.ts` (no por `pantallas/`: el bloque es código de `tablero`, y `pantallas/` sólo lo importa `src/app`)
  y la action por `index.ts` para la campana de la Fase 7 (recomendada de la fila).
- **D2** · «Aparecer en la web» lo decide la persona (8.05-2; recomendada de la fila).
- **D3** · «Contacté» sin «Deshacer» ni confirmación (recomendada de la fila): un toque.
- **D4** · **No se puede vincular una solicitud ya contactada**: `web_confirmar_contacto` sólo escribe `lead_id` en `asignada` o `vencida`. Vincular y confirmar son un
  solo acto desde la tarjeta. **Abierto nuevo (8-NN, lo decide la persona):** una RPC `web_vincular_contactada(p_solicitud, p_lead)` si se quiere vincular después.
- **D5** · Un turno de un vehículo que dejó de ser público (no sale en `web.vehiculos`) se dibuja sin título; no se lee `vehiculos`.
- **D6** · `pantallas/turnos.ts` queda como estaba; la tarjeta no pasa por ahí (ver D1).
- **D7** · El panel de vincular es propio y compone las piezas de `panel-para-cotizar` en lugar de exportar el interior de `PanelDelCliente`: mínima superficie de
  cambio en un módulo que otros pasos tocan.
- **D8** · Orden: vigentes por `vence_en` (las directas, sin reloj, al final de las vigentes) y luego las vencidas de la más reciente a la más antigua.
- **D9** · La fuente se muestra tal cual (`fuente` es texto libre del sitio); sin catálogo.
- **D10** · **El filtro por `usuario_id` va a mano en `leerMisTurnos`**: la RLS de `solicitudes_contacto_web` deja ver todas las filas a quien tiene `web.cola.gestionar`;
  sin el filtro, la dueña vería (y podría «confirmar») los turnos de otra persona. Lo cubre `e2e/web-turno.spec.ts`.
- **D11** · «Crear lead» cruzó sin tocar `leads/features/alta`: el «+» abre el alta con `?elegir=vincular`, que ya devuelve `?vincular=<id>`; Inicio lo ve junto al `turno`.
- **Pendiente anotado:** `PANEL_VINCULAR_TURNO` limpia con la tarjeta sólo `panel` y `turno`; la búsqueda del panel (`clase`, `buscar`, `cursor`) se limpia al cerrar.
