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
