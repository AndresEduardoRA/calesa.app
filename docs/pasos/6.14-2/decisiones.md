# Paso 6.14-2 — El cierre de la Fase 6 (parte 2 de 2): el Nivel 3 y los docs de cierre

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/6.14-2.md`.

- **D1** Movil corre sobre el HEAD que haya al terminar el triaje de escritorio, como el 5.13-1: un proyecto no espera al otro y un `fix` ya se probó en
  los dos con su spec.
- **D2** El carril `a` edita `docs/PLAN.md` y `docs/ESTADO.md` directo («el ESTADO lo lleva el carril `a`»; así lo hicieron el 5.13 y el 6.14-1);
  BITACORA y DECISIONES, sólo por `consolidar-docs.mjs`.
- **D3** Los abiertos que sobreviven (6-2, 6-4, 6-5, 6-6, 6-7) quedan en «Los decide la persona»: ninguno es pulido, cerrarlos es código o datos fuera del
  «NO entra» del cierre, y ningún paso de las fases 7 a 9 los nombra.
- **D4** El 6-3 de las notas se renumera **6-7** (D11 del 6.14-1): el número ya era `pago_anular`, cerrado en el 6.10-2.
- **D5** En la ficha de `logistica` se borran las dos líneas duplicadas de «Tablas» que empezaban con «RPC: `margen_vehiculo`»: las siguientes dicen lo mismo
  y más (6.08 y la escritura de la oferta).
- **D6** La ficha de `flujos` (> 30 KB) suma una frase y no se recorta en este paso: recortarla es otra intención.
- **D7** La ficha de `tablero` ya está al día (los tres bloques de logística llenos, 6.12-2): se verifica, no se reescribe.
- **D8** Una fila de la tabla de criterios con más de una prueba sólo dice «verde» si todas lo están; una inestable lo dice con su nombre.
