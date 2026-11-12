## Paso 9.05 · Datos: exportar todo, parte 4 de 5 (2026-11-12)

- **Cotizaciones en `POST /datos/exportar`** (`{ entidad: "cotizaciones", delimitador, origen?, desde?, hasta? }`): tercera rama del pedido, con
  `origen` optativo (sin él, todas las que se ven). Un origen que no está da 404 `vacia` sin contar ni registrar; uno inactivo exporta. El archivo se
  llama `cotizaciones-todos-AAAA-MM-DD.csv` o `cotizaciones-<origen en ASCII>-todos-…`.
- **La lectura** (`infra/cotizaciones.ts`): la tabla `cotizaciones` con el cliente del flujo (token fijo de quien exporta), de a 1.000 por cursor
  `(creado_en, id)`, por `cotizaciones_listado_idx` (con origen, `cotizaciones_origen_creado_idx`), con `eliminado_en is null` explícito. Las policies
  deciden filas y papelera; sólo columnas con `grant select`; ninguna función nueva. No es `cotizaciones_listado()` (plpgsql, corta en 100).
- **Los nombres por página** (`fuente-de-cotizaciones.ts`, `antesDeEscribir`): clientes por `leads_vista_por_ids` (sólo `id, nombre`) y sólo con
  `leads.ver`; títulos de `vehiculos` de a 100 (`IDS_POR_CONSULTA_DE_NOMBRES`). Lo que la RLS no deja ver va vacío; los mapas se vacían en cada página.
- **Las columnas** (`columnas-de-cotizaciones.ts`): `N.º`, `Título`, `Cliente`, `Vehículo`, `Origen`, `Clase`, `Estado`, `Total (<moneda base>)`,
  `Creado`, `Actualizado`. El total en moneda base tal como se guarda; la moneda sale de los ajustes (el route pasa `monedaBase`).
- **Pruebas:** `route-cotizaciones.test.ts` (T20–T23: el texto exacto, el orden contar → registrar → página → nombres, el total `98765,43`/`1234,5`/`0,1`,
  origen, 404, sin `leads.ver`, 409, 500, 400), `columnas-de-cotizaciones.test.ts` (T24), `exportacion.test.ts` (T25) y
  `supabase/tests/areas/datos/exportar-cotizaciones.sql` (T26: Ada ve `[c3, c2, c1, c5]` y con origen `[c2, c1, c5]` con el total intacto; Bea
  («propios») `[c1, c5]`, c5 por un lead de su cartera; Ceci nada; la papelera no sale; las 12 columnas conservan su grant).
- **Medido** (`supabase/tests/medir-datos-exportar-cotizaciones.sql`, ≈ 254.000 vivas): página 0,9 ms, profunda 0,9 ms, de un origen 1,1 ms; conteo
  0,4 s; lectura 0,44 s; nombres de una página 1,4 ms + 0,5 ms; Pía («propios») 2,3 s, casi todo en la última página. El tope queda en 250.000
  (`.piloto/salidas/9.05-2c/medir.log`).
- **Fuera de `modulos`:** `scripts/mediciones.mjs` y `scripts/medir-listado.mjs` (una entrada y una variable, aditivas).
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.05 sigue abierta con «parte 4 de 5 hecha: cotizaciones en `POST /datos/exportar` (tabla por la RLS, de
  a 1.000, todas o de un origen; total en moneda base tal como se guarda); queda 3 (pantalla)». «Partes estimadas»: 5. `parcial: true`.
- **Parte que queda — 9.05-3:** la pantalla `/datos`, `navegacion.ts`, el e2e y `docs/UX.md` (`.piloto/planes/9.05-1.md` › «Lo que queda servido para
  la 9.05-3»). Lo que suma esta parte: el pedido acepta las tres entidades; vehículos con `origen` obligatorio y cotizaciones con `origen` optativo
  (la pantalla elige origen sólo para esas dos); el 409 trae el `tope` de su entidad.
- e2e completo: no (9.05-2c, Nivel 1: lo prueba el CI del PR; sin dirigidos: ningún spec nombra /datos)
