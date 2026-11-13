# Paso 8.14-1 — El cierre de la Fase 8 (parte 1 de 2): el recorrido del «Terminado cuando», las fichas, GLOSARIO y UX

Fecha: 2026-11-13 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/8.14-1.md`.

- **D1** El 8.14 se parte en 8.14-1 (el recorrido, fichas, GLOSARIO y UX) y 8.14-2 (el Nivel 3, la tabla de criterios, PLAN y ESTADO): el completo corre una
  vez sobre el SHA con el recorrido, y la parte que espera ≈ 90 min de completo lleva sólo los docs que dependen de sus números.
- **D2** El carril `a` es el carril base: PLAN (y ESTADO en el 8.14-2) se editan directo y BITACORA y DECISIONES por `consolidar-docs.mjs`, como el 7.14.
- **D3** El recorrido corre en `escritorio` y `movil` (la fila lo pide y el criterio del turno es en el celular); sólo R3 sale del celular, con su marca, porque el
  tablero de la cola es Configuración (la persona, 2026-11-08). R3 no alimenta a otra prueba.
- **D4** La tasa se prueba con contadores sembrados (1 asignada, 0 contactadas → 50 % tras R1 y R2) y la otra asesora como control: con contadores libres, una
  tasa de 100 % seguiría en 100 % y «cambia» no se vería.
- **D5** UX tenía triplicada «Flujos (config)» y duplicadas «Empresa», «Cotización (config)» y «Logística (config)» (uniones de carriles): queda la fila más
  completa de cada una.
- **D6** No se mide el JS del marco: la fila no lo pide y la Fase 8 no suma nada al marco (las pantallas nuevas son rutas propias, medidas por sus pasos).
- **D7** Los abiertos de 8.13 conservan su nombre (8-13a…f): ya están citados así en los docs de paso y en el código.
- **D8** El pegajoso se prueba con X sin disponibilidad: así sólo el paso 4 de `solicitar_asesor` puede devolverla (la ruleta ya no la ve) y el control (un
  visitante nuevo va a Y) muestra que la ruleta sigue andando.
- **D9** Las asesoras del recorrido tienen `leads.crear` además de `web.cola.participar`, como la asesora de `web-turno.spec.ts`: el bloque «Turnos de la web sin
  confirmar» de Inicio se muestra con `leads.crear` o `web.cola.gestionar` (`BLOQUES_BANDEJA`, 8.05-1), no con `web.cola.participar`. Un rol que recibe turnos
  sin crear leads los recibiría (campana) sin verlos en Inicio: no es un rol real (quien atiende la web crea el lead), pero queda anotado para la tabla de
  criterios del 8.14-2 como hueco conocido, no como rojo.
