# 4.24 · Cierre: el rojo de CI de la rama

- 2026-11-07 · El coordinador retomó el 4.24 para arreglar el CI en rojo. El último rojo terminado de `c/4.24` era el del 4.24-2b
  (corrida 42339363068): `e2e/cotizaciones-listado-resumen.spec.ts` › R2, sólo en `movil`. Causa: nuqs dibuja el resumen al
  instante y escribe `?cotizacion=` después (su cola); R2 recargaba en cuanto veía el diálogo y, en el celular, recargaba la URL
  de antes. Arreglo determinista en la prueba: esperar la clave en la URL antes de `reload()` (`5f9aca95`), sin reintento.
  Los otros dos rojos de la rama ya no siguen: el del 4.24-1b fue el arranque de los contenedores del CI, y el del 4.24-2
  (`scripts/mapa.test.ts` › T13) pasó en el CI del 2b y pasa en local.
  Verificación: el spec entero, `--repeat-each=3`, escritorio y movil: 36 en verde (`.piloto/salidas/4.24/e2e-listado-resumen.txt`);
  `scripts/mapa.test.ts` en verde. Para el coordinador: el `integrado 4.24` sigue siendo el del PR del 4.24-3 con su CI en verde.
- e2e completo: no (4.24, ci, Nivel 1: el spec arreglado en escritorio y movil)
