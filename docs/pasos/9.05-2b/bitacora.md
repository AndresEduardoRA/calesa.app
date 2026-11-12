## Paso 9.05 · Datos: exportar todo, parte 3 de 5 (2026-11-12)

- **Vehículos de un origen en `POST /datos/exportar`** (`{ entidad: "vehiculos", delimitador, origen, desde?, hasta? }`): el pedido pasa a una unión
  por entidad (`origen` obligatorio en vehículos, rechazado en leads). La fuente (`features/exportar/fuente-de-vehiculos.ts`) lee dentro del pedido el
  origen (`getOrigenes(true)`: también los inactivos, que guardan vehículos), su layout y sus fases. Un origen que no está da 404 `vacia` sin contar
  ni registrar (no dice si existe); un fallo del layout o de las fases es un error (500), no un 404. El archivo se llama `vehiculos-<origen en ASCII>-todos-AAAA-MM-DD.csv`.
- **La lectura** (`infra/vehiculos.ts`): la tabla `vehiculos` con el cliente del flujo (token fijo de quien exporta), de a 1.000 por cursor
  `(creado_en, id)` y `vehiculos_origen_listado_idx`. La policy «vehiculos: leer» decide filas y papelera; ninguna función nueva. Los ayudantes de
  página pasan a `infra/paginas.ts` (`enElRango`, `siguienteDe`, `contarHasta`), que comparte leads.
- **Las columnas** (`features/exportar/columnas-de-vehiculos.ts`): `N.º`, los datos comunes del tipo del origen (etiquetas de `camposComunes()`,
  reexportado de forma aditiva desde `src/modules/vehiculos/index.ts`), los campos activos del layout en su orden, `Fase`, `Creado` y `Actualizado`.
  El precio sale tal como lo da la base; sí o no, categoría y fase por nombre; opciones por etiqueta (`' | '`); fechas en la zona de la empresa.
- **El orden se escribe una sola vez** (`seguirCon` de `lecturas.ts`): cada entidad trae su fuente con un `case`. `TOPE_POR_ENTIDAD` y la respuesta
  409 lleva el tope de su entidad.
- **Pruebas:** `route-vehiculos.test.ts` (T13–T16: el texto exacto del archivo, constancia antes de la primera página, origen inactivo, 404, 409, 400),
  `columnas-de-vehiculos.test.ts` (T17), `exportacion.test.ts` (T18) y `supabase/tests/areas/datos/exportar-vehiculos.sql` (T19, guarda de regresión:
  Ada ve `[v2, v1]` con el precio intacto, Bea sólo el suyo, Ceci nada; ni la papelera ni otro origen; ninguna `datos_exportar_*` definer).
- **Medido** (`supabase/tests/medir-datos-exportar-vehiculos.sql`, `MEDIR_SOLO=medir-datos-exportar-vehiculos pnpm db:medir:volumen`, 250.000
  vehículos en un origen): página de 1.000 0,8 ms (113 buffers) y profunda 0,9 ms, por `vehiculos_origen_listado_idx`; conteo entero 0,3 s; lectura
  entera 0,4 s; Pía («propios», 5.000) 82 ms. El tope de vehículos queda en 250.000 (`.piloto/salidas/9.05-2b/medir.log`).
- **Fuera de `modulos`:** `src/modules/vehiculos/index.ts` y su ficha (reexportación aditiva) y `scripts/mediciones.mjs` (la medición).
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.05 sigue abierta con «parte 3 de 5 hecha: vehículos por origen en `POST /datos/exportar` (tabla por
  la RLS, de a 1.000; columnas comunes y del layout); quedan 2c (cotizaciones) y 3 (pantalla)». «Partes estimadas»: 5. `parcial: true`.
- **Parte que queda — 9.05-2c:** cotizaciones (la cabecera de `cotizaciones_listado()`, de a 100 con cursor de arranque), con su rama en el pedido, su
  `case` en `lecturas.ts`, sus columnas con test, su medición y su bloque SQL (`.piloto/planes/9.05-2b.md` › «Lo que queda servido para la 9.05-2c»).
- **Parte que queda — 9.05-3:** la pantalla `/datos`, `navegacion.ts`, el e2e y `docs/UX.md` (`.piloto/planes/9.05-1.md` › «Lo que queda servido para
  la 9.05-3»).
- e2e completo: no (9.05-2b, Nivel 1: lo prueba el CI del PR; sin dirigidos: ningún spec nombra /datos)
