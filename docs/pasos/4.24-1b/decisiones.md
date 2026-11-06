## 2026-11-06 — Paso 4.24-1b

- **Lo que contestó la persona** (compuerta `producto`, la recomendada en las tres; después la `datos`, «aprobar»). El 4.24-2 las lee de acá.
  - P10 · Quien no envió el lote y no tiene `cotizaciones.papelera.purgar` recibe 42501 «Sólo lo restaura quien lo envió o quien puede vaciar la papelera.»
    (el texto de vehículos), antes de tomar el lote.
  - P11 · Quien envió el lote lo restaura entero aunque ya no vea una de sus cotizaciones: restaurar deshace su propio envío, como en vehículos y leads.
  - P12 · Una cotización de la papelera cuyo vehículo o cliente se purgó no se distingue de una que nunca lo tuvo (las FK son `set null`). Se resuelve en el A:
    purgar un vehículo o un lead queda «bloqueado» mientras una cotización de la papelera lo nombre («Necesita del carril A», 1). Hasta entonces, la preventa
    o la cotización cuyo vínculo se purgó vuelve sin él; la final sin vehículo queda pendiente («Su vehículo ya no existe.»).
- **Lo no obvio:**
  - Restaurar toma la cotización `for no key update` (no choca con el `for key share` de sus hijas) y purgar la toma `for update`: el `delete` pide ese
    candado, y tomarlo de entrada evita subirlo a mitad. Se aparta de lo que el plan del 1a dejaba para el 1b («`for no key update`» para las dos).
  - El ayudante de restaurar toma `for key share` los vehículos y después los leads del lote, por id, **antes de tomar cotización alguna**: es el orden de quien
    los purga (primero su fila; la FK `set null` actualiza después la cotización). Al revés, restaurar contra purgar el vehículo o el lead es un 40P01. Lo
    mostró un recorrido de tres conexiones contra la base del carril (`.piloto/salidas/4.24-1b/carrera.mjs`): con este orden no hay
    interbloqueo, B purga y la preventa vuelve sin vínculo (`carrera-verde.txt`); con el orden de antes (M6), 40P01 en K1 y K2 (`carrera-m6.txt`). Hasta que
    el A lo pase a `scripts/carreras/`, el CI sólo lo protege por R9, que mira el orden en el texto de la función.
  - La purga automática toma el lote de cotizaciones `for no key update skip locked`: el job, que ya retiene las filas de los lotes de vehículos o leads que
    purgó en su transacción, esperaría el lote que tiene un restaurar que a su vez espera uno de esos vehículos o leads. Saltado, vuelve en la corrida siguiente.
  - La genérica de restaurar es todo o nada (con algo pendiente, PT409 con el motivo de la primera por id, y nada vuelve) y la de purgar ya no: lo bloqueado se
    queda en la papelera y el lote sigue pendiente. Las dos conservan firma, retorno y textos (P2). La genérica de restaurar ya no vuelve a sellar un lote ya
    restaurado ni registra otra actividad (devuelve 0), y su actividad lleva el detalle `{tipo, cantidad}` en `p_detalle`, como la propia.
  - Una cotización con comprobante da **23001** (`restrict_violation`, la FK es `on delete restrict`), no 23503: el ayudante de purgar atrapa los dos. El de
    vehículos atrapa sólo 23503, pero allí `_vehiculo_motivo_de_bloqueo` ya bloquea un vehículo con comprobante antes de borrar.
  - La genérica de restaurar conserva de antes `v_por <> (select auth.uid())` (la propia usa `is distinct from`): sin sesión no pide la clave, como hoy. Con
    `creado_por` nulo quien no tiene la clave no recibiría el 42501, pero no se llega: enviar siempre graba quién y la FK a `perfiles` no es `set null`.
  - El ayudante de restaurar atrapa también 23514 con su texto (P7: la red por si `cotizacion_validar` suma reglas); la prueba R5b lo fija con un trigger
    temporal.
  - `cotizaciones_adjuntos_ruta_idx` (el disparador 6 del Nivel 2): cada adjunto purgado pasa por `storage_refcount('cotizaciones', ruta)`, que sin índice
    recorría la tabla. `medir-jobs.sql` lo mide en una sección al final, antes del `rollback` (lo de antes no cambia): 100.000 cotizaciones en 500 lotes, cada
    una con una revisión y un adjunto, más viejas que los lotes de leads; 10.000 por corrida en 8.099, 9.207 y 8.276 ms (presupuesto 25.000). Sin el índice,
    (a) cae por el `Seq Scan` del refcount; con el job de antes, (c) cae porque purga leads y ninguna cotización (`medir-jobs-rojo-head-{a,c}.txt`).
  - En las pruebas de `areas/papelera/` con `SOLO=`, la primera cuenta de cada bloque nace dueña (no corre `humo.sql`): una prueba de «sin la clave» crea antes
    a quien la tiene (PU4). Los teléfonos de los leads de prueba son fijos (`telefonos-en-pruebas.test.ts` prohíbe `random()`).
- **Necesita del carril A:**
  1. P12 (a): `_vehiculo_motivo_de_bloqueo` y `_lead_motivo_de_bloqueo` dan «Tiene cotizaciones en la papelera.» mientras una cotización de la papelera de
     cotizaciones los nombre. Arregla además el defecto de hoy: una **final** en la papelera de cotizaciones impide purgar su vehículo (la FK `set null` corre
     `cotizacion_validar` y da 23514, que `_papelera_purgar_vehiculos` no atrapa: cae la purga entera del lote; el job lo reintenta cada hora con un `warning`).
  2. Las carreras en `scripts/carreras/`: K1 y K2 (restaurar contra purgar el vehículo o el lead; el esqueleto en `.piloto/salidas/4.24-1b/carrera.mjs`);
     restaurar una versión nueva contra cotizar encima la misma anterior; restaurar contra mandar su vehículo o su lead a la papelera; purgar contra restaurar el
     mismo lote; la propia contra la genérica; y el job contra restaurar (el `skip locked`). **Riesgo que queda:** restaurar toma vehículos por id y después
     leads; el job purga lotes de vehículos y de leads por `creado_en` en una sola transacción y retiene lo tomado de cada uno: un job que tiene el vehículo 5 y
     pide el 1 contra un restaurar que tiene el 1 y pide el 5 es un 40P01 (si cae el job, su `exception when others` lo vuelve un `warning`; si cae restaurar,
     la persona ve un error técnico). Medirlo y, si se da, decidir un orden común.
  3. El job toma siempre los 50 lotes vencidos más viejos: 50 que no se pueden purgar del todo (un pago, un portal, un comprobante) ocupan todas las corridas y
     los más nuevos no se purgan nunca. Vale para los tres tipos; es lo de hoy.
  4. `documentos.ruta` no tiene índice y `_papelera_purgar_vehiculos` encola documentos por refcount: el mismo recorrido por ruta en la papelera de vehículos.
  5. En `docs/ESTADO.md` › «Deuda aceptada» sale la frase de que la papelera de cotizaciones no tiene versión ni purga automática: restaurar y purgar ya
     van por lote con versión y la purga automática la vacía.
  6. La ficha `src/modules/cotizaciones/CLAUDE.md` suma `cotizaciones_papelera_restaurar|purgar` (con lo pedido en el 1a, 5); el `aplicado_en` de
     `cotizaciones.papelera.purgar` sigue pendiente del 1a, 3.
  7. En `supabase/tests/volumen/sembrar-cotizaciones.sql` (o RENDIMIENTO › jobs, ya anotado): desde este paso el job purga los lotes vencidos de cotizaciones
     de la siembra.
- **Para el coordinador (o el A):** el 4.24-1b cierra **4-70** (en la propia y en la genérica); con 4-68 (1a) quedan cerrados los dos del `terminado` del 4.24.
  El PR no marca `integrado 4.24`: integra sólo el 4.24-1b. En **4-64**: `auditoria-leads.sql` 441 → 445, `numero-global.sql` 411 → 413 (los dos ya pasaban de
  300). `medir-jobs.sql` 114 → 211.
