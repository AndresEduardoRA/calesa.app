# cotizaciones › comprobantes

El área `comprobantes` de `cotizaciones` (carril C, 4.26): emitir y anular el comprobante de venta de una cotización final, con numeración sin huecos, y la serie
vigente que se configura en Empresa. Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

Un **comprobante** es interno (no fiscal): se emite sobre una **final activa**, congela en `datos` lo que se vendió y se anula, nunca se borra. Una cotización
tiene a lo sumo un **comprobante vigente** (sin anular). Lleva serie y número: el número es global por serie (no por origen, D6) y no tiene huecos. Hoy vive
sólo en la base (4.26-1); `client.ts`, `index.ts` y `composicion.ts` siguen vacíos.

## En la base (4.26-1, `…_comprobantes_emitir_y_serie.sql`)

- `comprobantes_ajustes`: una fila (`unica = true`) con la **serie vigente** («A» por omisión). La leen quien emite o quien gestiona Empresa (la misma regla que
  `comprobantes_contadores`); nadie la escribe directo.
- `comprobantes_serie_cambiar(p_serie, p_actualizado_en_esperado)`: `empresa.ajustes.gestionar` (P1 a); la serie se guarda en mayúsculas, de 1 a 12 letras A–Z,
  números o guiones (P6 a; si no, 22023 con `hint` `serie`); versión nula 22023, distinta PT409. Crea el contador de la serie: una nueva empieza en 1 y volver a una
  usada sigue su numeración. Devuelve `{serie, siguiente, actualizado_en}`.
- `comprobante_emitir(p_cotizacion, p_cotizacion_esperada)`: `cotizaciones.comprobantes.emitir`; ver la cotización antes y con la fila tomada (si no, el 42501 de lo
  inexistente); final activa (23514); la versión de la cotización (nula 22023, distinta PT409); un vigente por cotización (PT409 «…«S-N» vigente: anúlalo…»). Ni la
  serie ni `datos` vienen del cliente. Devuelve `{id, serie, numero, emitido_en}`.
  - **`datos`** (P4 a): `{version: 1, cotizacion: {id, numero, titulo, clase}, origen: {id, nombre}, formula_id, cliente: {lead_id}, vehiculo: {id} | null,
empresa: {razon_social, nit}, valores, totales, tipos_cambio, etiquetas}`. El recorte es el del nivel «todos» (lo que lee quien sólo tiene `cotizaciones.ver`),
    sea quien sea el que emite. Del cliente y del vehículo, sólo los ids: quien ve la cotización y no el lead no lee su nombre. El 4.26-2 los muestra vivos.
  - **Candados:** cotización `for no key update` → `comprobantes_ajustes` `for update` → el contador (`update … returning`). `datos` se arma antes de tomar la
    serie. El `update` del contador y el `insert` van en un solo bloque `begin … exception`: un PT409 atrapado por quien llama ya devolvió el número.
- `comprobante_anular(p_comprobante, p_motivo)`: la misma clave (P5 a); ver la cotización (42501 «No tienes acceso a este comprobante.»); motivo de 1 a 500
  (22023, `hint` `motivo`); uno ya anulado da PT409. El número no vuelve. Devuelve `{id, anulado_en}`.
- Una cotización con comprobante (anulado o no) no va a la papelera (P3 a, `…_comprobantes_bloquean_la_papelera.sql`: 23514 «Tiene un comprobante emitido.»).
  Marcar o crear otra final del vehículo con un comprobante vigente en la actual da 23514; con sólo anulados, la vieja baja a preventa y queda viva (P7 a,
  `…_final_con_comprobante.sql`, en `_final_aplicar`).

## Pruebas

- `supabase/tests/areas/comprobantes/`: `emitir.sql` (E1–E5), `anular.sql` (A1–A2), `serie.sql` (S1–S4), `final.sql` (E6, marcar con comprobante) y el caso de
  `humo.sql` (la policy). PU8 de `areas/papelera/purgar.sql` (la papelera la rechaza).
- Carreras: `carreras.mjs` (K1–K5, la numeración) y `carreras-papelera.mjs` (K6 contra la papelera, K7 contra marcar), con `carreras-comun.mjs`. Las corre
  `pnpm db:carreras`; solas, `bash scripts/candado.sh db:carreras -- node supabase/tests/areas/comprobantes/correr-carreras.mjs`.

## Lo que falta

- **4.26-2:** `entities/comprobantes` (quién emite y anula, el número a mostrar, los textos de error), `infra/comprobantes` (la lectura por cotización con tope, las
  RPC), `features/comprobantes` (las actions; «Emitir comprobante» en `Acciones` de la guardada para una final activa con la clave; la sección «Comprobantes» en
  `Debajo`; «Anular» con su modal en `?panel=`), `pantallas/comprobantes-cotizacion.ts` y un e2e del camino feliz.
- **4.26-3:** la pestaña «Comprobantes» de Configuración › Empresa (`pantallas/comprobantes-empresa.ts`, `src/app/(app)/configuracion/empresa/comprobantes/`), con
  `empresa.ajustes.gestionar`: la serie vigente, el próximo número y cambiarla con versión.
