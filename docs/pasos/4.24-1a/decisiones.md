## 2026-11-06 — Paso 4.24-1a

- **El 4.24 se parte en cuatro, en cadena:** 4.24-1a (la base: enviar pide ver antes del candado, también la genérica; enviar por lote con versión; la lista
  y el lote por cursor; cierra 4-68), 4.24-1b (la base: restaurar por lote sin 23505, también la genérica; purgar; la purga automática con `medir-jobs.sql`;
  cierra 4-70), 4.24-2 (la pantalla y el enlace junto a «Nueva») y 4.24-3 («Enviar a la papelera» con «Deshacer» en la guardada). Con un commit por intención
  la base sola eran 6 de código. Plan: `.piloto/planes/4.24.md` (lo que el 1b no debe perder, en «Lo que sigue en el 4.24-1b»).
- **Para el coordinador (o el A), en `docs/PLAN.md`, fila del 4.24:** «Se parte en **4.24-1a** (la base: enviar pide ver antes del candado, también la
  genérica; enviar por lote con versión; la lista y el lote por cursor; cierra 4-68), **4.24-1b** (la base: restaurar por lote sin 23505, también la genérica;
  purgar; la purga automática con `medir-jobs.sql`; cierra 4-70), **4.24-2** (la pantalla y el enlace junto a «Nueva») y **4.24-3** («Enviar a la papelera» con
  «Deshacer» en la guardada)». En `docs/plan.yaml` el id `4.24` se reemplaza por cuatro, carril `c`: `4.24-1a` (el `depende_de` de hoy; riesgo `rojo`;
  `verificacion` «Nivel 2 + cadena db + db:carreras + db:medir:volumen»; `terminado` «Enviar a la papelera de cotizaciones pide ver antes del candado, también
  la genérica; enviar por lote con versión; la lista de lotes por cursor medida con volumen; cierra 4-68»; `modulos` `[docs/]`), `4.24-1b` (`['4.24-1a']`;
  `rojo`; «Nivel 2 + cadena db + db:carreras + medir-jobs.sql»; «Restaurar por lote no da 23505, también la genérica; purgar por lote; la purga automática
  incluye cotizaciones; cierra 4-70»; `[docs/]`), `4.24-2` (`['4.24-1b']`; `ambar`; `features/papelera/`, `entities/papelera/`, `infra/papelera/`,
  `pantallas/papelera.ts`, `pantallas/papelera-listado.ts`, `areas/papelera/`, `src/app/(app)/cotizaciones/papelera/`,
  `scripts/guardas/paginas-en-la-base-papelera.ts` y `docs/`) y `4.24-3` (`['4.24-2']`; `ambar`; `features/papelera/`, `pantallas/papelera-cotizacion.ts` y
  `docs/`). El `4.25` pasa de `['4.24']` a `['4.24-3']`. **Este PR no marca `integrado 4.24`:** integra sólo el 4.24-1a.
- **Para el coordinador, en 4-64** (archivos de más de 300 líneas que crecen): `supabase/tests/medir-escala.sql` 892 → 954, `auditoria-leads.sql` 436 → 441 y
  `cotizaciones-visibilidad.sql` 1.921 → 1.922. Y en 4-96: en la corrida entera de `pnpm test` de este paso, T13 de `mapa.test.ts` tardó 10.369 ms (sola, 3,2 s).
- **Lo que contestó la persona** (compuerta `datos`, «aprobar»: la recomendada en cada una). El 1b y el 2 las leen de acá.
  - P1 · Las RPC propias se llaman `cotizaciones_papelera_enviar|listar|lote|restaurar|purgar`, como las de leads y vehículos (la migración empieza por `papelera_`).
  - P2 · Las genéricas `papelera_enviar|restaurar|purgar` se quedan, con su firma, su retorno y sus textos, y pasan por los mismos ayudantes (enviar en el 1a;
    restaurar y purgar en el 1b). Las llaman `cotizacion_marcar_final()` y archivos del A; el A las retira cuando nadie las llame.
  - P3 · Una final la manda a la papelera quien puede guardarla: `cotizaciones.ver` y `cotizaciones.final.gestionar` del origen. Una preventa, ver y `editar` por
    su alcance, o `moderar`.
  - P4 · Una cotización con comprobante: se decide en el 4.26. Hoy enviar la acepta y la purga (1b) la deja «bloqueada» por la FK `restrict`.
  - P5 · (1b) Restaurar una N+1 cuya anterior ya tiene otra viva, o una final cuando el vehículo ya tiene otra: queda «pendiente» con su motivo y el resto
    del lote se restaura; la genérica (todo o nada) da PT409 con ese texto.
  - P6 · El lote dice de cada cotización número, título («Cotización #n» sin título), clase, origen y fecha: nada que la RLS esconda a quien tiene la clave y no la ve.
  - P7 · (1b) Restaurar una cuyo vehículo o lead está en la papelera o ya se purgó: «pendiente» con su motivo, atrapando también 23514 por cotización.
  - P8 · La papelera de cotizaciones lista sólo lotes `tipo = 'cotizaciones'`; la pantalla (4.24-2) dice que las que se fueron con su vehículo vuelven al
    restaurar el vehículo, en su papelera.
  - P9 · `cotizacion_marcar_final()` llama a la genérica con los derechos de quien marca: desde este paso, si no ve una preventa viva del vehículo, no marca y
    recibe 42501 «No tienes acceso a esta cotización.» (el de lo inexistente). El 4.25, que la reescribe, decide su texto.
- **Lo no obvio:**
  - Mandar a la papelera mira ver **antes** de tomar la fila y otra vez sobre la fila tomada, como guardar (4-34): quien no la ve recibe lo mismo que con una
    inexistente, en el texto y en el momento, y nunca espera su candado. La fila se toma `for no key update`, como `marcar_final`: `for update` choca con el
    `for key share` de las hijas (comentarios, revisiones, la N+1). En `db:probar` (una sesión) la espera no se ve: la prueba mira el orden en el cuerpo de la
    función (E10) y la carrera es del A (abajo).
  - La genérica es todo o nada y ya no saltea en silencio, con `moderar`, un id inexistente o ya en la papelera. Conserva sus textos (los esperan `matriz-leads.sql`,
    `humo.sql` y las carreras) salvo el de permiso, que pasa de «Sin permiso para eliminar la cotización <id>» a «No tienes permiso para enviarla a la papelera.»
    (nadie lo esperaba). Su lote queda con el resumen completo (`cantidad`, `restaurados`, `purgados`) y su versión, como el de vehículos.
  - La propia acepta 22023 («Falta la versión…») en `rechazados` con su texto, además de PT409, 42501, 23514 y P0001: también es nuestro.
  - «Le queda alguna en la papelera» es una sonda por lote (`(select true … limit 1)`) y no el `exists` de vehículos: con pocas en la papelera, el plan genérico
    del `exists` es un semi join que lee entero `cotizaciones_lote_papelera_idx` (crece con la papelera, no con la página). Medido en este paso
    (`.piloto/salidas/4.24-1a/forma-explorar.txt`: el `exists` en el plan genérico, sin cursor y por el cursor; `forma-variante.txt`, la sonda); con 20.000 más en la papelera el `exists` se vuelve sonda, la variante es sonda siempre.
  - `medir-escala.sql` mide la forma de la lista con una sentencia preparada (`v_todo` y `v_yo` como parámetros, el plan genérico): con literales el planificador
    elige `lotes_papelera_creado_por_idx` para Ana y un recorrido de la tabla para la dueña, que no es lo que corre (la 1.ª corrida, con literales; su salida se
    sobrescribió al repetir la medición: `escala()` fuerza el plan genérico, pero con literales en el texto no hay parámetros). Su sección va después de las demás
    mediciones (no cambia ninguna) y antes de `$violaciones$`, para que su violación haga caer la corrida.
  - Las pruebas de `supabase/tests/areas/papelera/` no usan a la dueña de `humo.sql`: con `SOLO=` no corre. Cada archivo crea «la jefa».
  - `database.types.ts` lista también los ayudantes `_…` (el generador no mira los grants): `_cotizacion_a_papelera` aparece aunque nadie de la app lo ejecute.
- **Abiertos nuevos para el 4.25 (del C):** `cotizacion_marcar_final()` toma su cotización `for no key update` sin mirar ver (quien no la ve espera su candado,
  y quien tiene `final.gestionar` marca final una que no ve: el defecto de 4-34 en otra puerta) y toma `for no key update` también las preventas que no ve antes
  de llamar a la genérica. El 4.25: pedir ver antes del candado propio, no tomar las preventas que no ve, y el texto de P9.
- **Necesita del carril A:**
  1. `vehiculos_papelera_restaurar()` restaura las cotizaciones del lote del vehículo sin mirar `cotizaciones_encima_unica` ni `cotizaciones_final_por_vehiculo`:
     sale «Choca con otro registro que ya existe.» para el vehículo entero.
  2. Las carreras en `scripts/carreras/`: quien no ve la cotización no espera su candado al enviarla, por la propia y por la genérica, mientras otra sesión la
     tiene tomada (como `cotizaciones-guardar.mjs:470`; demuestra la mutación M18); enviar con versión contra guardar; y una que cambia de clase entre la mirada
     sin candado y la de la fila tomada (M20, equivalente en una sesión).
  3. El `aplicado_en` de `cotizaciones.papelera.purgar` en `supabase/seed.sql` y en su catálogo pasa a nombrar `cotizaciones_papelera_*` (T1 de
     `cotizaciones-papelera-permiso.sql` fija hoy el texto).
  4. Retirar las genéricas cuando el 4.25 deje de llamar a `papelera_enviar`.
  5. La ficha `src/modules/cotizaciones/CLAUDE.md` suma las RPC de la papelera.
  6. En `docs/ESTADO.md`, la deuda «La papelera de cotizaciones no tiene versión ni purga automática (4.24)» pasa a «no tiene purga automática ni restaurar o
     purgar con versión (4.24-1b)»: `papelera_restaurar|purgar(p_lote)` siguen sin versión.
  7. `vehiculos_papelera_listar()` y `leads_papelera_listar()` tienen el mismo `exists`; sin medir si su plan genérico, con poco en la papelera, también lee
     entero el índice del lote (en la de cotizaciones sí: arriba). La sonda por lote lo evita.
