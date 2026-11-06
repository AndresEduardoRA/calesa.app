## 2026-11-06 — Paso 4.24-1a: la papelera propia de cotizaciones, en la base: enviar pide ver (4-68), enviar por lote con versión y la lista de lotes

- **Hecho:** el 4.24 se partió en cuatro (4.24-1a y 4.24-1b la base; 4.24-2 la pantalla; 4.24-3 «Deshacer» en la guardada). Este 4.24-1a, sólo base.
  Mandar una cotización a la papelera pide lo que pide guardarla: `_cotizacion_a_papelera()` mira si quien llama la ve **antes** de tomar la fila (lo que no
  ve, lo inexistente y lo que ya está en la papelera dan el mismo 42501 «No tienes acceso a esta cotización.», también con `moderar`) y otra vez sobre la fila
  tomada (`for no key update`), y el permiso de su clase (una preventa, `editar` o `moderar`; una final, `cotizaciones.final.gestionar` del origen, P3). La
  genérica `papelera_enviar()` pasa por el mismo ayudante, todo o nada, con su firma, su retorno y sus textos salvo el de permiso, y su lote queda con el
  resumen completo y su versión; `cotizacion_marcar_final()`, que la llama, ya no manda a la papelera una preventa que quien marca no ve (P9). Cierra 4-68.
  `cotizaciones_papelera_enviar([{id, actualizado_en}])`, como la de vehículos: cada una en su bloque, `rechazados` con código y motivo (el título sólo de lo
  que se ve) y el resto en un lote con su resumen y su versión. `cotizaciones_papelera_listar()` (por cursor, 6 hasta 51 lotes, 20 hasta 200 por lote) y
  `cotizaciones_papelera_lote()`: sólo lotes de cotizaciones pendientes y con algo en la papelera (P8), todos con `cotizaciones.papelera.purgar` y los propios
  sin ella; de cada cotización, número, título, clase, origen y fecha (P6). «Le queda alguna» es una sonda por lote, no un `exists` (decisiones). P1–P9 con
  las recomendadas; la compuerta `datos`, aprobada.
- **Verificación** (`.piloto/salidas/4.24-1a/`): rojos contra HEAD de las tres pruebas nuevas (`rojo-head-pide-ver.txt`: E7 quien edita sin ver la envía,
  E5 una final se va con `editar`, E9 marcar la manda, E11 el texto viejo; `rojo-head-enviar.txt`, `rojo-head-listar.txt`: las funciones no existían);
  14 mutaciones (20 corridas: M1 y M3 otra vez con `enviar.sql`, y las de la lista otra vez tras la sonda por lote) en `mutaciones.txt`, cada una cae donde dice el plan (M20, quitar la segunda mirada de ver, no la ve ninguna prueba de una sesión: equivalente,
  va a la carrera del A; M21 tumba `auditoria-leads.sql` y `escala.sql`; M22 a M24, de las pruebas que pidió la auditoría del informe: E2, L7 y L6); `db:reset`, `db:types` y `db:probar` en cada commit (y el job `schema` de lefthook);
  `db:lint` sin avisos en las funciones nuevas; `medir-escala.sql` 3 de 3 en verde sobre `db:sembrar-volumen` (`medir-escala-{1,2,3}.txt`): la RPC 0,9–2,5 ms;
  la consulta de adentro, como la ve plpgsql, por `lotes_papelera_tipo_idx` sin recorrer tablas: Ana descarta 506 (tope 600), la dueña por el cursor del lote
  400, 0; la forma con `exists` en el plan genérico, en `forma-explorar.txt`, y la de la sonda, en `forma-variante.txt` (la 1.ª corrida, con literales, se sobrescribió). `lint` y `typecheck` en verde; `pnpm test` 6.452 de 6.458:
  `auto-carriles.test.ts` (5) cae porque lee los carriles que corren en la máquina (4-83) y `mapa.test.ts` T13 tardó 10.369 ms en la corrida entera y pasa sola en 3,2 s (4-96; `test-mapa-solo.txt`).
  El completo de escritorio (`e2e-completo.txt`; sus carreras, «Todas las carreras en verde»): 944 en verde, 16 saltados y una caída, `cotizar-guardada-guardar.spec.ts:128` (4-90: la
  versión llegó con cinco dígitos de microsegundos, `…53.69756+00:00`), y 3 sin correr, las seriales de ese archivo; solo, 3 de 3 en verde
  (`e2e-guardada-guardar-sola-{1,2,3}.txt`). Ningún spec llama a lo que cambió.
  e2e completo: sí (4.24-1a, base, Nivel 2: escritorio, 944 en verde, 16 saltados, 1 caída de 4-90 y 3 de 3 sola)
- **Abiertos:** 4-68 cerrado en la propia y en la genérica; `marcar_final` es otra puerta (4.25, decisiones). Nuevos, en `decisiones.md`: lo que necesita del
  carril A (las carreras de la espera del candado, `vehiculos_papelera_restaurar` contra los índices únicos, el catálogo, la ficha, el ESTADO y el `exists` de
  las otras papeleras). 4-70 sigue para el 4.24-1b.
- **Commits:** `bd1c2b2e` fix(db): pedir lo de guardar al mandar una cotización a la papelera · `dcae6566` feat(db): enviar cotizaciones a su papelera por
  lote con versión · `330f0094` feat(db): listar por cursor la papelera de cotizaciones · `9e3e939b` test(db): fijar el 22023, la sonda y el lote vacío de la papelera
  (lo que pidió la auditoría del informe) · y el de docs.
