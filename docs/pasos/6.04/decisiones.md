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

Anotadas al hacer la parte 2 (2026-11-12):

- **D20** Notas e historial se leen desde el navegador con la sesión de quien mira (como `dinero`): un hueco recibe sólo `{ unidad }` y su bloque monta el contenido al abrirse. La RLS decide; escribir va por Server Action.
- **D21** El camino a lo antiguo es «Ir a una fecha»: `creado_en <` el inicio del día siguiente en la zona de la empresa (`hastaDeUnDia`, propio de `logistica` porque el de `cotizaciones` no se puede importar). El salto reemplaza lo leído y dice «Desde el …».
- **D22** Escribe quien ve la unidad (`logistica.ver` en su origen; la policy pide lo mismo). Editar es sólo de la propia y sin cambio de fase, en el lugar. **Sin «Borrar»** (cambia lo planeado): la prueba SQL N3 (`supabase/tests/areas/mover/notas.sql`) mostró que el borrado suave por `update` da 42501 aunque no pida `returning`, porque `notas: leer` también se aplica a la fila nueva, que ya no es legible. Borrar una nota propia pide una RPC `security definer`: abierto **6-3**, un paso de datos (riesgo rojo), fuera de esta parte.
- **D23** Más reciente primero, de a `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO`; el cuerpo de una nota se acota a 2000 en el Zod (D13).
- **D24** Las dos listas se releen sin soltar lo que se ve cuando cambia `unidad.faseId` y con `logistica:unidad-cambio`; guardar o corregir una nota avisa (también relee «Qué falta», barato).
- **D25** «Ver en logística» sale con sólo `logistica.ver` en el origen del vehículo: lo decide la página de la ficha con `puede()` y la ficha recibe una booleana (`vehiculos` no importa `logistica`, D3).
- **D26** Corregir una nota no manda versión (son notas propias; dos ventanas de la misma persona, gana la última). El texto de una nota de cambio sale de la fase embebida (`historial_fases → fases`), una sola consulta, nunca una por fila. Corregir pide la fila de vuelta (`select('id').limit(1)`) para saber si tocó alguna: la fila nueva sigue viva y pasa `notas: leer`.
- **Deuda de la base, sin tocar:** `authenticated` tiene `update` sobre toda la tabla `notas` y la policy `notas: editar` sólo mira el autor: la base no impide que su autora cambie el cuerpo de una nota de cambio de fase ni su `historial_fase_id`; el filtro `historial_fase_id is null` de la action es lo que lo cierra en la interfaz (D9). Una RPC para 6-3 puede cerrar las dos cosas.

## 6.04-3 · El lote (2026-11-12)

- **D27** La selección y su contexto viven en el **núcleo** de `logistica` (`entities/nucleo/seleccion.ts`, `features/nucleo/seleccion/`): la cadena sólo lee `useSeleccionDeLaCadena()` (`null` sin proveedor: se ve igual) y `mover` provee la selección y dibuja la barra y el drawer; `src/app` los une. Ningún área importa otra. El proveedor sólo se monta si quien mira puede mover (`flujos.mover` o `.cualquiera` en el origen), así que el contexto no lleva un `puedeElegir`.
- **D28** El destino se elige **dentro del drawer** (una lectura de destinos por fase): la barra dice «N elegidos en «F»» y «Mover a…» abre `?panel=lote`; `&destino=<fase>` queda como enlace directo (vale sólo si es una salida de la fase). El destino elegido vive en el estado del drawer, no se reescribe en la URL.
- **D29** `destinosDeLaFase({ origenId, faseId })` en `flujos` envuelve `leerDestinos` con `TOPE_DE_DESTINOS`, sin vista previa (la vista previa del lote la da `previsualizarCambioLote`).
- **D30** El lote de un grupo lee sus unidades **desde el navegador con la sesión de quien mira** (`infra/mover/grupo-del-lote.client.ts`: `vehiculos` con `transportes!inner`, de a 201, `eliminado_en is null`); la RLS decide. Sus nombres son el título del vehículo (la identidad «<principal> · <título>» sólo se arma en el servidor); el camino de las casillas usa el nombre de la tarjeta. Una unidad con dos transportes del mismo grupo cuenta una vez.
- **D31** La selección vive en memoria y **no sobrevive a recargar**: `?panel=lote` sin selección ni grupo dice «No elegiste ninguna unidad.». Con `?contenedor=` o `?booking=` el drawer lee el grupo e ignora la selección; esas dos claves también filtran la cadena de detrás (6.03). Cambiar de origen o de filtros vacía la selección.
- **D32** Los textos de plural se fijan con test: «Mover los 7 que pueden» / «Mover el 1 que puede»; «Se movieron 7 de 8.» / «Se movió 1 de 1.»; «Reintentar el 1» / «Reintentar los 2».
- **D33** «Reintentar» vuelve a la vista previa **sólo con las que no se movieron**, con la misma nota y la misma fase de origen esperada (D10); las que ya no están en la fase salen «Ya no está en «F»».
- **D34** (cambia lo planeado) **El resultado es el de todo el lote**: la unidad que su vista previa dejó afuera (D2) también cuenta como no movida («Se movieron 7 de 8.», con «No se movió «X». Falta: BL aprobado.») y entra en «Reintentar». Lo descubrió el e2e: la primera versión decía «7 de 7» y callaba a la que faltaba. `filasDelLoteCompleto()`.
- **D35** Las reglas puras que dicen sus motivos con las frases de `flujos` (`vista-del-lote`, `resultado-del-lote`) viven en `features/mover/lote/`, no en `entities/` (una entidad de `logistica` no importa otro módulo); las que no lo necesitan (`seleccion`, `grupo-del-lote`, `claves-del-lote`) sí están en `entities/`. «Elegir los de esta columna» no se invierte (no hay «Quitar los de esta columna»: «Limpiar» vacía todo). El aviso de 200 va en la barra, no en la columna.
- **Medido:** JS en frío de `/logistica` 397,4 KB de 410 (antes 388,9): entra sin subir el presupuesto. La barra, el drawer y el hueco del grupo van con `diferido()`.
