## 2026-11-06 — Paso 4.24-1b: la papelera propia de cotizaciones, en la base: restaurar sin el 23505 (4-70), purgar por lote y la purga automática

- **Hecho:** sólo base, en tres commits. Restaurar: un ayudante restaura una a una; lo que choca con otra viva (una versión nueva, una final del vehículo),
  cuelga de un vehículo o cliente en la papelera o es una final sin vehículo queda «pendiente» con su motivo y el resto vuelve (P5, P7, P12). Toma `for key
share` los vehículos y después los leads del lote, por id, antes de cualquier cotización (el orden de quien los purga). `cotizaciones_papelera_restaurar()`
  por lote con versión: quien lo envió o `cotizaciones.papelera.purgar`, mirado antes de tomar el lote (P10), sin mirar ver por cotización (P11). La genérica
  `papelera_restaurar()` conserva firma, retorno y textos y es todo o nada, con PT409 y el motivo. Cierra 4-70. Purgar: un ayudante borra una a una con sus
  hijas; lo que otra tabla necesita (un comprobante, 23001) queda bloqueado y sigue en la papelera (P4); las rutas de los adjuntos se encolan después del
  borrado y por refcount. `cotizaciones_papelera_purgar()` pide la clave antes de mirar el lote; la genérica `papelera_purgar()` ya no aborta con una
  bloqueada. La purga automática (`papelera_purgar_vencidos()`) suma los lotes de cotizaciones (una sonda por lote; el lote tomado con `skip locked`), y
  `cotizaciones_adjuntos_ruta_idx` hace que el refcount de cada adjunto no recorra la tabla. P10–P12 con las recomendadas; la compuerta `datos`, aprobada.
- **Verificación** (`.piloto/salidas/4.24-1b/`): rojos contra HEAD de las cuatro pruebas nuevas (`rojo-head-*.txt`; R7, PU5, PA1–PA3 por la conducta: el
  23505 de `cotizaciones_encima_unica`, el 23001 del comprobante, el job que no mira cotizaciones); `medir-jobs.sql` en rojo sin el índice (`Seq Scan` del
  refcount) y con el job de antes (purga leads y ninguna cotización). 27 mutaciones, las 27 caen donde dice el plan (`mutaciones.txt`); M10b, de la
  auditoría del informe, también (`mutaciones-r9.txt`). Un recorrido de tres conexiones contra la base del carril (`carrera.mjs`): restaurar contra purgar
  el vehículo (K1) o el lead (K2), sin interbloqueo; con el orden de antes (M6), 40P01 en las dos. `db:reset`, `db:types` y `db:probar` (547 en verde,
  0 caídas; el job `schema` de lefthook en cada commit); `db:lint` sin avisos en las funciones nuevas; `db:carreras` en verde; `medir-jobs.sql` 3 de 3:
  10.000 cotizaciones por corrida en 8.099, 9.207 y 8.276 ms (presupuesto 25.000). `lint` y
  `typecheck` en verde; `pnpm test` 6.566 de 6.571 (las 5 de `auto-carriles.test.ts`, 4-83). El completo de escritorio (`e2e-completo.txt`): 962 en verde,
  16 saltados, ninguna caída, 35,2 min; sus carreras, «Todas las carreras en verde». Ningún spec llama a lo que cambió.
  e2e completo: sí (4.24-1b, base, Nivel 2: escritorio, 962 en verde, 16 saltados, 0 caídas)
- **Abiertos:** 4-70 cerrado en la propia y en la genérica. Nuevos, en `decisiones.md` › «Necesita del carril A»: P12 (a), bloquear purgar un vehículo o un
  lead que una cotización de la papelera nombra (y el 23514 de una final al purgar su vehículo); las carreras, con el riesgo del orden contra el job; el job y
  sus 50 lotes que no se purgan; `documentos.ruta` sin índice; la deuda del ESTADO; la ficha.
- **Commits:** `5ab0be07` feat(db): restaurar por lote la papelera de cotizaciones sin el 23505 · `61aa1a0c` feat(db): purgar por lote la papelera de
  cotizaciones · `7009d3ce` feat(db): sumar las cotizaciones a la purga automática de la papelera · `9c1847c4` test(db): fijar que la genérica mire quién
  antes de tomar el lote (lo que pidió la auditoría del informe) · y el de docs.
