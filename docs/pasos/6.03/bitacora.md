## 6.03-1 · la cadena de logística: la lectura (2026-11-12)

Parte 1 de 2 (`parcial: true`). Entró, sin pantalla: `entities/cadena/` (`filtros.ts`: esquema de filtros y `pedidoDeLaCadena`, sólo lo que la RPC acepta;
`leer.ts`: las tres RPC validadas con Zod; `columna.ts`: número acotado, `puedeVerMas`, `agregarTarjetas`, cursor; `dias.ts`; `origenes.ts`;
`repositorios.ts`), `infra/cadena/` (`logistica_cadena`, `logistica_cadena_columna`, `logistica_donde_esta`, atributos por tandas, navieras),
`features/cadena/` (identidad de la tarjeta, pestañas de origen, «dónde está» sin llamar con texto corto, la action `verMasDeLaColumna`) y
`areas/cadena/{index,client,composicion}.ts`. Las tres RPC entran al registro de `paginas-en-la-base.ts`. Sin migración, sin policy ni permiso nuevo.

Pruebas: Vitest de `entities/cadena/` (5 archivos, 33 pruebas) y de `features/cadena/donde-esta`; `scripts/guardas` y `src/modules/logistica`: 57 archivos, 1.256 pruebas en verde.

Sigue **6.03-2** (servida en `.piloto/planes/6.03.md` › «Partición»): componentes, `page.tsx`, `loading.tsx`, estados, `e2e/logistica-cadena.spec.ts`, el
presupuesto de JS de `/logistica`, UX y fichas. La fila 6.03 de `docs/PLAN.md` pasa a «Partes estimadas: 2» (la edita el carril `a` al consolidar).

- e2e completo: no (6.03-1, Nivel 1: lo corre el CI del PR; sin interfaz, sin dirigidos)

## 6.03-2 · la cadena de logística: la pantalla (2026-11-12)

Parte 2 de 2: **cierra el paso**. `features/cadena/`: `useCadena` (siembra por firma, un pedido a la vez por columna, descarta una página de otra lectura), `useAbrirLaUnidad`, el tablero con `<PistaDeDesborde>`,
la columna (número acotado, «Ver más», aviso de tope), la tarjeta («Demorado» en texto, contenedor y ETA), `PestanasDeFases` (celular, `?fase=`), `PestanasDeOrigen`, `FranjaDeDondeEsta`, el esqueleto y los estados; `pantallas/cadena.ts`;
`src/app/(app)/logistica/{page,loading}.tsx` con `Suspense` y `connection()`. Sin migración, policy ni permiso nuevo.

Pruebas: `use-cadena.test.tsx` (6) y `vitest run src/modules/logistica scripts/guardas`: 58 archivos, 1.263 pruebas en verde; `e2e/logistica-cadena.spec.ts` (5, escritorio), `logistica-unidad.spec.ts` y `logistica-gastos-y-pagos.spec.ts`
en verde (salidas en `.piloto/salidas/6.03/`); `presupuesto-js.spec.ts`: `/logistica` 388,9 KB, presupuesto 410.

- e2e completo: no (6.03-2, Nivel 1: lo corre el CI del PR; dirigidos en verde)
