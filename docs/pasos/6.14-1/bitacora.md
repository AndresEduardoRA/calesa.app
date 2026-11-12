## 6.14-1 · El cierre de la Fase 6: la tarea de oro 3 y el recorrido de la IA (2026-11-12)

Parte 1 de 2 (`parcial: true`): queda el **6.14-2**, el Nivel 3 (`pnpm test:e2e:completo` con los dos proyectos) y los docs de cierre (tabla de criterios,
«Cierre de la Fase 6», «Partición» marcada, ESTADO, fichas de `logistica`, `flujos` y `tablero`, `docs/UX.md` › Flujo 3 y los abiertos 6-x). El plan del
6.14-2 está servido en `.piloto/planes/6.14-1.md` › «Partición» (borrador de la tabla en V30, abiertos en V31).

- **Hecho:** `e2e/logistica-tarea-de-oro.spec.ts`, seis pruebas en serie, en `escritorio` y `movil`, con dos cuentas: logística («Primera Mueve» de
  `sembrarMover`, con `flujos.mover` del origen) y la dueña («Dora Logística»). R1 mueve 1 unidad desde la cadena (tarjeta → panel → destino → nota →
  Ctrl+Enter); R2, sin el BL aprobado «Mover a» queda apagado y dice cuál falta; R3, la dueña mueve primero y logística lee «Dora Logística la movió a…» y
  «No se movió nada.»; R4, desde `/logistica/embarques` › Contenedores abre el contenedor de 8, «Mover el grupo» › «Marcar que llegó», elige el destino, la
  vista previa marca 7 «Lista» y 1 «Falta: … aprobado.», «Mover los 7 que pueden» y «Se movieron 7 de 8.» (la base: 7 en C y 1 en B); R5, el margen de una
  unidad sin venta dice «Sin venta registrada» en venta y margen, nunca 0; R6, la dueña recorre cadena, embarques, aduana, gastos e Inicio.
- **Medida** (KLM con puntero: 1,3 s por gesto, 0,28 por tecla, 1,35 por decisión; el reloj del robot es tope): mover 1 = 3 gestos, 7 teclas, 4
  decisiones, **KLM 11,3 s** (meta 15), robot 1,1–1,5 s en los dos proyectos; contenedor de 8 = 5 gestos, 0 teclas, 6 decisiones, **KLM 14,6 s** (meta
  60), robot 2,1–2,8 s.
- **Corridas:** escritorio 6/6 (`.piloto/salidas/6.14/escritorio-1.log`); movil 3/6 la primera (R4: en el celular el contenedor es una tarjeta de lista y
  no una fila; se arregló el localizador del spec, no el producto), luego 6/6 (`movil-2.log`); con `E2E_CAPTURAS`, los dos proyectos 12/12
  (`capturas-ambos.log`); antes de commitear los docs, otra vez los dos 12/12 (`final-ambos.log`). `scripts/guardas`: 36 archivos, 1.117 en verde.
- **Recorrido de la IA:** hojas abiertas `escritorio-01` a `-04` y `movil-01` a `-05` (`test-salidas/6.14-1/capturas/hojas/`). Nada falla al 100 %: la
  cadena, el panel con el destino y la nota, el aviso al mover, la lista de contenedores (tabla en escritorio, tarjetas en el celular), el resumen del
  contenedor, la vista previa por unidad, el resultado parcial con «Reintentar el 1», el margen, embarques, aduana y gastos vacíos con su texto, e Inicio con
  sus bloques. Logística sin `logistica.gastos.ver` no ve «Gastos» en la sub-navegación. «Vehículos trabados» vacío en Inicio es correcto: el terreno no
  pone demora a la fase (el GLOSARIO pide unidad demorada).
- **Pulido** (5 líneas en `docs/PLAN.md` › «Pulido para la Fase 9»): el hueco vacío arriba de «Qué falta»; «Mover el grupo» debajo de toda la lista del
  contenedor; «Las primeras.» sin contexto en Contenedores; «Real USD 0,00» sin gastos; las pestañas de origen en dos líneas en el celular y la tercera columna
  cortada en escritorio.
- **Sin arreglos de producto** ni inestables. Ningún `src/` tocado.
- e2e completo: no (6.14-1, Nivel 1: el spec nuevo en escritorio y movil; el completo con los dos proyectos lo corre el 6.14-2)
