## Paso 9.12-2 · Auditoría AA, parte 2 de 5: leads, vehículos y cotizaciones (2026-11-13)

- **«Copiar texto» sin tarjeta** (4.18-3b): mientras carga, con error o sin permiso, el botón apagado ya no apunta con `aria-describedby` a un aviso
  que no está dibujado (el «Total desactualizado.» y el «Falta el total…» viven con la tarjeta). Un caso nuevo en `copiar-texto-de-la-tarjeta.test.tsx`.
- **Un solo esqueleto en la pestaña «Cotizaciones»** (4.17-3): `ListaDelHistorial` recibe `esperarEsqueleto`; la pestaña del vehículo y la sección del
  lead, que llegan tras el esqueleto del `diferido()` (misma forma: tres filas `h-9`), pasan `false` y las filas pintan en el acto, sin los 300 ms de
  blanco. El historial plegable de la hoja no cambia. Sin prueba nueva (PLAN).
- **El resumen al pie se pliega** (4-50): «Ver el detalle» / «Ocultar el detalle» (`aria-expanded`, `aria-controls`) esconde el total en moneda local,
  los secundarios y el modo; quedan el total, sus avisos, lo guardado, la región viva y el pie. Nace plegado con la fuente raíz ≥ 24 px
  (`useResumenPlegado`, `useSyncExternalStore`); al costado (`@4xl/hoja`) no hay botón y todo se ve. El botón no lleva ícono (la hoja más grande queda
  en 493 de 500 nodos) y mide 44 px fijos, como Live. Assert en la rama del 200 % de `e2e/cotizar-hoja-resumen.spec.ts`: nace plegado, sin el modo a la
  vista, con el total y «Guardar»; «Ver el detalle» lo abre; al 100 % nace abierto; al costado no hay botón.
- **El aviso de guardado sale cuando terminó el envío** (9-7): `useTrasElEnvio()` + `useSoltarTrasElEnvio(tras, enCurso)` (uno en `leads` y otro igual en
  `vehiculos`) encolan el aviso, y cerrar el panel tras él, y lo sueltan con `isPending` en falso, o al desmontarse. En el alta de lead (con y sin
  `?elegir=`), el panel de etapas del embudo y el panel de vehículo (edición y alta). Prueba de hook: espera con el envío en curso, sale una vez al
  terminar, sale en el render siguiente si no había envío, en orden, y al desmontarse con algo en la cola.
- **Barrido:** `/cotizaciones` y `/vehiculos` dan su `h1` (`sr-only`, como `/leads`). El `h1` pasa a **regla dura** de `e2e/accesibilidad.spec.ts`: las
  siete rutas de la 9.12-5 sin `h1` (`/actividad`, `/logistica`, `/logistica/aduana`, `/logistica/embarques`, `/logistica/gastos`,
  `/logistica/vehiculo/[id]`, `/repuestos`) quedan en `CONOCIDOS`. `/cotizaciones/[id]` se barre: el terreno siembra una cotización en la subasta de
  la semilla (con fórmula publicada) y la limpia al final. La guardada no dio hallazgos duros.
- **4-63** ya estaba cerrado: lo cerró el pedido-2 el 2026-11-07 (`2c75a250`, `aad3bfeb` y `e1284c0f`); esta parte no lo toca.
- **Pruebas:** `copiar-texto-de-la-tarjeta.test.tsx` 7 ✓ (`.piloto/salidas/9.12-2/c1-vitest.txt`); prueba de hook 10 ✓ (`c5-hook.txt`);
  `vitest related` de lo tocado 244 ✓ (`related.txt`); `scripts/guardas` 1.154 ✓ (`guardas.txt`); typecheck limpio. e2e en `escritorio` y `movil`:
  cotizar-hoja-resumen 18 ✓ (`c3b-e2e.txt`); alta de lead, casos, panel de nuevo lead, embudo, alta de vehículo, recorrido de esperas y accesibilidad
  79 ✓ (`c5b-e2e.txt`); vista previa, acciones, historial, pestaña del vehículo y sección del lead, 111 ✓ (`c123-e2e.txt`, la misma corrida en la que
  cayó el tope del 30 %: D4); presupuesto-js, cotizar-hoja-200, avisos-sobre-el-pie, modales-celular-200 y cotizar-guardada 49 ✓ y 11 saltadas por
  proyecto (`final-e2e.txt`).
- **Partición (parte 2 de 5, `parcial: true`):** 4-61 y 4-62 pasan a la 9.12-3 (su arreglo está en `src/shared/ui/vuelta-del-foco.ts`, Nivel 2), con la
  casilla de `/vehiculos` (`Checkbox` de `shared/ui`) y, si conviene, unir los dos `useTrasElEnvio` en `src/shared/lib`. El R7 de `/leads` (tres
  botones sin `data-slot`) y los enlaces sueltos de `/vehiculos/«id»` pasan a la 9.12-5, que además borra de `CONOCIDOS` las siete entradas `h1` al
  darles su `h1`. La 9.12-4 no cambia.
- **Cómo se anota en `docs/PLAN.md`:** `9.12-2 ✓` en la «Partición» de la Fase 9; se cierran **4-50**, **9-7** y **4-63** (ya cerrado el 2026-11-07),
  y las líneas sueltas de 4.18-3b («Copiar texto») y 4.17-3 (el esqueleto) de «Pulido para la Fase 9». La fila del 9.12 pasa 4-61 y 4-62 de la parte 2
  a la 3.
- e2e completo: no (9.12-2, Nivel 1: lo prueba el CI del PR; dirigidos: accesibilidad, cotizar-hoja-resumen, cotizar-hoja-200, avisos-sobre-el-pie,
  modales-celular-200, cotizar-guardada, cotizar-vista-previa, cotizar-vista-previa-acciones, vehiculos-cotizaciones, leads-cotizaciones,
  cotizar-historial-del-vehiculo, leads-alta, leads-alta-casos, cotizar-panel-nuevo-lead, leads-embudo, vehiculos-alta, recorrido-esperas y
  presupuesto-js, en escritorio y movil)
