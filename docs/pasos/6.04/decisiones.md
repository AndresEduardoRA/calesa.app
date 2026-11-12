# Paso 6.04 — «Qué falta», mover con nota y conflicto legible, notas, historial y el lote

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas: las dudas de la fila, con su recomendada. El plan completo: `.piloto/planes/6.04.md` (tres partes: 6.04-1 «Qué falta» y mover; 6.04-2 notas, historial y el enlace de la ficha; 6.04-3 el lote).

- **D1** El lote no mezcla fases: se arma desde una columna (o un grupo en una misma fase), así todas comparten destinos.
- **D2** «Mover los N que pueden», con su número en el botón: el resultado parcial explícito del Flujo 3 de UX, no todo o nada.
- **D3** La ficha del vehículo sólo gana el enlace «Ver en logística»: `vehiculos` no puede importar `logistica`.
- **D4** «Qué falta» nace **abierto** (es lo que se mira para mover); los demás huecos siguen plegados (`abiertoAlInicio` en `HuecoDeLaUnidad`).
- **D5** Sin realtime: «Qué falta» se relee al volver el foco a la ventana (mínimo 5 s entre lecturas) y cuando otro hueco avisa (`logistica:unidad-cambio`; 6.06 lo dispara al aprobar un documento).
- **D6** Los destinos salen de `fases_transiciones` desde la fase actual (o las fases iniciales activas si no tiene fase), hasta `TOPE_DE_DESTINOS = 12` (lee 13; si llega, lo dice). Una vista previa por destino, en paralelo.
- **D7** El `origenId` llega del panel a la action sólo para decidir con `puede()`; la base vuelve a decidir (`cambiar_fase`).
- **D8** La nota es obligatoria si lo pide la fase de destino o la transición; lo dice la vista previa y se dice junto al campo. Sin nota el botón queda apagado con ese motivo.
- **D9** Las notas que nacieron de un cambio de fase no se editan ni se borran en la interfaz (parte 2).
- **D10** «Reintentar los N» (parte 3) usa la misma fase de origen del lote como esperada.
- **D11** «Marcar que llegó» (hueco del grupo, parte 3) abre el lote del grupo; no inventa una fase «llegó».
- **D12** Sin actualización optimista: al mover, la action responde y `router.refresh()` repinta la cadena y el panel.
- **D13** El cuerpo de una nota se acota en la interfaz a 2000 caracteres (la base no tiene tope; no se toca la base).
- **D14** Un requisito dice a dónde ir por un mapa fijo de su clase (documento → `documentos`; `transporte.*`, `aduana.*`, `pagos.*` → su hueco); el atajo sólo se dibuja si ese hueco existe en el panel.
- **D15** Las actions de mover aceptan sólo vehículo; la rama de repuesto es de 8.13 (la infra de la base ya recibe `p_repuesto`).

Anotadas al hacer la parte 1:

- **D16** El estado del botón de mover (`estadoDelBoton`) vive en `flujos/entities/mover/` y no en `logistica`: depende de la vista previa y de los motivos de `flujos`, y una entidad de `logistica` no puede importar el `client.ts` de `flujos` (arrastra Server Actions). `logistica` lo usa por `@/modules/flujos/client`.
- **D17** El rechazo de la base llega a la pantalla como `porCampo: { <hint>: mensaje }` (patrón de `transiciones`): `conflicto`, `requisitos`, `rol`, `nota`, `transicion`, `acceso`.
- **D18** El borrador de mover (destino abierto, nota y aviso de conflicto) vive en el hueco, no en cada destino: tras un conflicto la unidad cambia de fase, los destinos son otros y la nota sigue a mano.
- **D19** El atajo de una falta encuentra su hueco por `data-bloque-del-hueco` y lo abre con un aviso del navegador (`logistica:abrir-hueco`); un hueco que el panel no dibuja no ofrece atajo.
