## 2026-11-07 — Pedido del carril persona (estabilizar-2): seis pruebas inestables más 4-90, 4-96 y 4-63

- **Hecho:** cuatro arreglos en `e2e/`, uno en una prueba de `scripts/` y una medición de la base (`supabase/tests/`); sin código de `src/`. Salidas en
  `.piloto/salidas/pedido-2/` (`a`–`d`: intentos de reproducir con la CPU del navegador frenada; `e`–`k`: latencia inyectada, HEAD contra lo nuevo;
  `z`: verde final; `inventario-contra-hoy-0.txt` y `-1.txt`). Las 6 pruebas no cayeron solas: 0 de 36 a 6× y 0 de 40 (más 0 de 10 el oro) a 16×.
  Se reprodujeron **inyectando latencia** con un parche temporal de `e2e/soporte/prueba.ts` (no se commitea): `page.route` que demora las lecturas de la
  pantalla (`rsc`), los `rpc` de PostgREST, las Server Actions o los scripts. El HEAD cae y lo nuevo pasa, con el mismo parche:
  - **4-81** `cotizar-tarea-de-oro-cliente.spec.ts:116`: el nombre en la barra lo dibuja el servidor al devolver la hoja con `lead=`. Con 6 s de latencia en
    las lecturas cae igual que en el CI: «Cliente: Selecciona un cliente» tras 5 s (`e.log`). Ahora espera 15 s, el mismo tope de `alDia()`; el límite de la
    tarea (30 s) sigue midiendo el robot.
  - **4-86** `cotizar-hoja-resumen.spec.ts:165`: el total llega del recálculo (un `rpc`). Con 6 s de latencia en los `rpc` el total queda en «USD 5,00•••»
    como en el CI (`f.log`). Ahora espera 15 s (al 100 % y al 200 %).
  - **4-85** `cotizar-encima.spec.ts:104`: `toHaveURL(/cotizaciones/<uuid>$/)` ya lo cumple la página de antes y `encimaDe(anterior)` se leía antes de que
    la action escribiera la versión nueva: con 2,5 s en las Server Actions cae en `expect(nueva).not.toBe('')` (`g.log`). Ahora espera con
    `expect.poll(() => encimaDe(anterior))` a que exista y recién entonces la URL de la nueva.
  - **4-85** `cotizaciones-listado.spec.ts:102` (E2): **no se reprodujo** ni con 4 s de latencia en las lecturas (`i.log`): la prueba ya esperaba a que Ana
    saliera de la lista. Se ordenó (Ana fuera, y recién entonces las 10) y «Siguiente» espera a que cambie la primera fila antes de elegir el filtro.
  - **R2** `cotizaciones-listado-resumen.spec.ts:87` (movil): **no se reprodujo** (a 16×, con 1,5 y 4 s de latencia y con 3 s de demora en los scripts:
    `h`, `i`, `k`, `c`). Tras abrir y tras «atrás» ahora espera la URL (`cotizacion=`), como ya hacía antes de recargar. Queda abierta como **4-100**.
  - **4-82** `medir-vehiculos-inventario.sql`: se quitó el assert de crecimiento en ms entre 50.000 y 250.000 (el 4.17-1 lo vio caer con un autovacuum y
    +568 MB de WAL: «2.6 → 8.5»). El crecimiento lo juzgan los bloques de `vehiculos` por relación (`pg_stat_get_xact_blocks_fetched`, ya medidos ahí) y el
    tiempo queda como dato (`detalle|crecimiento`) y con sus topes absolutos. Con volumen sembrado: la función pasa (`inventario-contra-hoy-0.txt`, bloques
    iguales: chica 14 → 14, Pía 60 → 60, Vera 12.417 → 12.518) y «contra lo de hoy» sigue cayendo, ahora por bloques (`inventario-contra-hoy-1.txt`: chica
    5.981 → 10.881).
  - **4-96** `scripts/mapa.test.ts` T13: sólo estaba arreglada la mitad (el número, en main). El tiempo no: la prueba corre `mapa.sh` entero (2,3 s en
    reposo) bajo los 5 s de Vitest. Ahora lleva su tope de 30 s, con el motivo en un comentario.
  - **4-90** y **4-63**: ya tenían su arreglo en main (`0d11c94a`, regex `\d{1,6}`; `2c75a250`, `aad3bfeb` y `e1284c0f` en el lead rápido): se cierran sin tocar.
  - Verde final: `z.log`, los cinco specs enteros en escritorio y movil, `--repeat-each=3`: 210 en verde, ninguna caída. `scripts/guardas` y `mapa.test.ts`: 1004 en verde.
    e2e completo: no (pedido-2, sólo `e2e/`, `scripts/` y `supabase/tests/`: lo dirigido en escritorio y movil)
- **PLAN:** se quitaron 4-63, 4-81, 4-82, 4-85, 4-86, 4-90 y 4-96 (cerrados) y se sumó 4-100 (R2, abierto sin causa). `docs/ESTADO.md` no se tocó: lo lleva el carril a
  al consolidar y cita «cotizar-encima.s…» en su línea 14 (el completo del hito 4-A).
- **Abiertos:** 4-100 (R2). 4-92 y 4-93 siguen como los dejó pedido-1.
