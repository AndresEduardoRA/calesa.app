# cotizaciones

Cotizador configurable: fórmula por origen como grafo de nodos versionado, XCell con ⚙ de default global, tablas de referencia, snapshot por cotización, preventa/final, versiones, comentarios, adjuntos, reportes, plantilla de tarjeta y PDF, comprobantes.

## Entra y sale

- Entra: wizard `/cotizaciones/nuevo` (origen → vehículo → lead → hoja → resumen), editor de fórmulas en Configuración, ⚙ de una celda.
- Sale: `compilarExpresion(texto, contexto)` con sus códigos y tipos (ya por `index.ts`), `evaluar(formula, entrada, modo?)` (motor puro, en `entities/`; todavía no lo exporta `index.ts`: lo usará el editor de la fórmula) y su espejo en la base, `evaluar_formula()` (4.06) y `cotizacion_evaluar()` (4.06; arma lo que `evaluar_formula()` necesita y la llama; sin `execute` para `authenticated` hasta el 4.10), `getCotizacion()`, `<ResumenCotizacion>`, `cotizacionFinalDe(vehiculoId)`. Lo consumen `logistica` (final vs real), `chat`, `buscador`, `web` (precio público), `tablero`.
- Depende de: `leads`, `vehiculos`, `empresa` (tipos de cambio).

## Archivos clave

- `entities/nodos.ts` — el Zod de cada nodo, discriminado por `tipo` (y `calculo` por `op`), estricto; `referenciasDe()` con el `switch`
  exhaustivo. `entities/formula.ts` — `definicion` (`buckets`, `total_en`, `grupos`), `params` (constantes y tablas congeladas, D5) y
  el modo que recibe el motor.
- `entities/validar.ts` (con `validar-contexto.ts`, `validar-grupos.ts`, `validar-variante.ts`, `validar-campos.ts`, `motivos-de-formula.ts` y
  `medidor.ts`) — espejo TS de `validar_formula()`: la forma y 30 reglas cruzadas (`validar-campos.ts` es la última, `campo_con_punto`), lineal y con contador de visitas
  (`docs/COTIZADOR.md` › «Las reglas»).
- `entities/casos-de-formula.json` — el juego de fórmulas válidas e inválidas con su motivo (una por regla, más las dos del seed, el
  Excel entero y «Amnistia»): lo recorren `validar.test.ts` y `supabase/tests/validar-formula.sql`. Una regla nueva = su caso acá.
- `supabase/migrations/20261019004900_validar_formula.sql` — `validar_formula()` y sus ayudantes `_formula_*` (STABLE desde `…005100`): la forma y las 29
  primeras reglas en el orden de `validar.ts`, lineal; rechaza con 22023, el código de la regla en DETAIL y `donde` en HINT. Recorre las
  claves de un objeto en el orden de jsonb. La 30.ª, `campo_con_punto`, está en `supabase/migrations/20261019005400_validar_formula_campos.sql`, que redefine `validar_formula()` entera (STABLE) y añade `_formula_campos()`; `…005500_formula_texto.sql` redefine `_formula_forma_nodo()` (STABLE) para admitir `texto`. Lo prueba `supabase/tests/validar-formula.sql` (`pnpm db:probar`) con los 87 casos y con
  el corpus diferencial `supabase/tests/corpus-de-formula.json` (más de 500 mutaciones de las 4 válidas, defectos mezclados, el esperado
  de `validarFormula`), que generan `corpus-de-formula.ts` y los `mutadores-*.ts` de esa carpeta y vigila `corpus-de-formula.test.ts`.
- `entities/diseno.ts` — el Zod del diseño de la hoja (D7, 4.08): `cabecera` (los modos de tipo de cambio y «Ver total Bs»), `secciones[]` con sus
  ítems (`celda`, `atajos`, `variante`, `interruptor`, `subtotal`) y `tarjeta_total`. Declarativo y estricto (nada de CSS, clases, HTML ni hex) y sin
  registros: la clave de cada colección va adentro, así que un `__proto__` es una clave desconocida en los dos lados.
- `entities/validar-diseno.ts` (con `validar-diseno-contexto.ts`, `-modos.ts`, `-secciones.ts`, `-cobertura.ts` y `motivos-de-diseno.ts`) —
  `validarDiseno(definicion, diseno, contexto)`: la forma y 27 reglas que cruzan el diseño con la fórmula (modos, niveles, ítems, tarjeta,
  atajos, cobertura y tonos), en un orden fijo, lineal y con el contador de `medidor.ts`. El contexto son tres listas: los niveles que existen, los
  retirados y las claves de tono. La definición llega ya validada por `validarFormula()`. Espejo de `validar_diseno()` (abajo).
- `entities/casos-de-diseno.json` — el juego a mano del diseño (válidos de las capturas, del Excel, de la semilla y de «Amnistia»; cada regla con su
  caso y uno de orden por pasada): lo recorren `validar-diseno.test.ts` y `supabase/tests/validar-diseno.sql`. `diseno-sintetico.ts` arma los
  diseños de 200 y 2.000 ítems de la prueba de escala y de la medición.
- `supabase/migrations/20261019005600_validar_diseno.sql` — `validar_diseno(def, diseno, niveles, retirados, tonos)` y sus ayudantes `_diseno_*`
  (STABLE, invoker, `search_path` vacío): lo mismo que `validarDiseno()`, con el mismo código de regla y el mismo `donde` (22023, la regla en DETAIL y
  `donde` en HINT, por `_formula_rechazar()`). Sin tabla ni columna todavía: `formulas.diseno`, los tonos y los niveles son de los prompts 2 y 3 y del
  4.09. Lo prueba `supabase/tests/validar-diseno.sql` (`pnpm db:probar`) con el juego y con el corpus `supabase/tests/corpus-de-diseno.json`
  (`corpus-de-diseno.ts` y los `mutadores-de-diseno*.ts`, que vigila `corpus-de-diseno.test.ts`).
- `supabase/migrations/20261019005200_evaluar_formula.sql` — `evaluar_formula(definicion, params, entrada, modo?)` y sus ayudantes `_motor_*`: espejo
  exacto de `motor.ts` (los mismos float8, estados, fuentes, totales, faltantes y descartados; errores de llamada 22023 con el código en DETAIL).
  Pura: las tablas vivas llegan en `entrada.tablas`. Desarma sus argumentos una sola vez y lleva el estado por nodo en arreglos. Lo prueban
  `supabase/tests/evaluar-formula.sql` (`pnpm db:probar`, con el juego de 84 casos, el corpus diferencial `supabase/tests/corpus-del-motor.json`,
  la aritmética contra JS y las guardas) y `medir-evaluar-formula.sql` (`pnpm db:medir`). El corpus lo generan `corpus-del-motor.ts`, los
  `mutadores-*.ts` y los `casos-*.ts` de esa carpeta, con el esperado de `esperado-del-motor.ts`, y lo vigila `corpus-del-motor.test.ts`.
- `supabase/migrations/20261019005300_cotizacion_evaluar.sql` — `cotizacion_evaluar(entradas, cotización | origen, vehículo?, modo?)` y `_cotizacion_armar()`
  (`definer`): con una cotización usa SU fórmula, SUS tipos de cambio congelados y SU vehículo; con un origen, la publicada, los tipos de cambio vigentes
  y el vehículo que se pase. Lee sólo las tablas que un nodo nombra y la fórmula no congeló (`tablas_referencia_filas_tabla_orden_idx`), los tipos de cambio
  y los campos del vehículo que la fórmula nombra, y comprueba `puede_cotizacion` / `puede_vehiculo` / `cotizaciones.crear`. Las `entradas` sólo llevan
  `inputs`, `banderas`, `overrides` y `variante`. Devuelve el resultado entero: `revoke execute … from public, anon, authenticated` hasta que el 4.10 recorte
  por nivel. Lo prueban `supabase/tests/cotizacion-evaluar.sql` (`pnpm db:probar`: paridad con el juego de 84 y el corpus, y los casos de orden, congelada,
  versión vieja, tablas, campos y permisos) y `medir-evaluar.sql` (`pnpm db:medir:volumen`: 200 llamadas con 50.000 y 250.000 cotizaciones y las guardas de escala).
- `entities/compilador.ts` — `compilarExpresion(texto, contexto)`: la fórmula como texto (`=(remate+fees)*4%`, `SUMA(grupo)`) a nodos del mismo grafo
  (4.07). Puro, sin `eval` ni regex, lineal y nunca lanza: un texto que no compila da un error con código estable y su tramo (`desde`, `largo`,
  `linea`, `columna`). Sale por `index.ts` (`compilarExpresion`, `CODIGOS_DE_COMPILACION`, `MAXIMO_DE_TEXTO` y los tipos `ContextoDeCompilacion`, `DestinoDeCompilacion`, `ErrorDeCompilacion`, `ResultadoDeCompilacion`, `CodigoDeCompilacion` y `Tramo`): lo usará el editor (4.21), que si es un Client Component lo sacará también por `client.ts`. Lo parten `compilador-lexico.ts`, `compilador-sintaxis.ts`
  (parser iterativo de dos pilas, nada recursivo), `compilador-reducir.ts` (el aplanado de `a+b+c`), `compilador-estado.ts`,
  `compilador-funciones.ts` (SUMA, SI, REDONDEAR, PORCENTAJE_DE, DEPRECIAR), `compilador-nombres.ts` (el contexto), `compilador-emitir.ts`
  (los nodos auxiliares `<fila>__<n>`) y `motivos-del-compilador.ts` (los 28 códigos). `HOY()` se rechaza (4-4). La fila que guarda el editor lleva el texto fuente en `texto?` (1 a 2.000 caracteres; sólo `constante` y `calculo`; el compilador no lo lee ni lo escribe). Lo prueban
  `casos-del-compilador.json` (a mano), `compilador-propiedades.test.ts` (contra el cálculo directo en JS, bit a bit) y `compilador-escala.test.ts`;
  `compilador-generador.ts` y `compilador-formula-de-prueba.ts` son sólo de las pruebas. Trece casos «compilada: …» viven en
  `casos-de-formula.json` (los recompila `compilador-casos-de-formula.test.ts`).
- `entities/evaluacion-sintetica.ts` — la evaluación sintética de n nodos (fórmula, tablas y entrada) para medir el motor, con 50 o 1.000 filas por tabla (y `anioInicial` para sembrar su vehículo en la base).
- `entities/formula-sintetica.ts` — la fórmula sintética de n nodos de las pruebas de escala (`validar-escala.test.ts` y, volcada al
  corpus, la medición de `validar_formula()`).
- `entities/motor.ts` — `evaluar()`: una pasada en el orden de la lista, grupos por tipo de cambio, el total en Bs y en USD, y los
  `faltantes` (`docs/COTIZADOR.md` › «El motor»). Lo parten `motor-contexto.ts` (el estado y los códigos de faltante),
  `motor-entrada.ts` (`esquemaEntrada`), `motor-errores.ts` (`ErrorDelMotor`), `motor-estados.ts` (la variante elegida y el estado
  de cada nodo, en una pasada previa), `motor-nodos.ts` (un caso por tipo), `motor-sobrescribir.ts` (los overrides, las fuentes, el
  par porcentaje-monto y los descartados), `motor-calculo.ts` (un caso por `op`), `motor-tablas.ts` (`tabla`, `tramo`, la congelada
  contra la viva), `motor-totales.ts` (grupos, modo y reparto) y `redondeo.ts` (`round(numeric)` de Postgres, exacto).
- `entities/casos-del-motor.json` — los casos del motor con su resultado hecho a mano (el seed, el Excel entero con sus cifras de
  celda, «Amnistia», las capturas, un caso por tipo, `op`, faltante, estado, fuente, motivo de descarte y fila del par): lo recorre
  `motor.test.ts` y, desde 4.06, la paridad de `evaluar_formula()`.
- `features/hoja/` (XCell + binding `valores/fuentes/defaults`), `features/formulas/` (borrador/publicar/historial/revertir), `features/plantillas/`, `features/pdf/` (route handler con `@react-pdf/renderer`).
- `docs/COTIZADOR.md` — la forma del grafo; leerlo antes de tocar el motor.

## Tablas

`formulas`, `tablas_referencia`, `tablas_referencia_filas`, `plantillas_tarjeta`, `cotizaciones`, `cotizaciones_revisiones`, `cotizaciones_comentarios`, `cotizaciones_adjuntos`, `cotizaciones_reportes`, `cotizaciones_favoritos`, `comprobantes`, `comprobantes_contadores`.
RPC: `formula_guardar_borrador`, `formula_publicar`, `formula_descartar_borrador`, `formula_cambiar_constante`, `validar_formula`, `validar_diseno`, `evaluar_formula`, `cotizacion_evaluar`, `plantilla_*`, `cotizacion_marcar_final`, `cotizacion_moderar`, `comprobante_emitir/anular`, `margen_vehiculo`.

## No se rompe

- Una cotización se recalcula **siempre** con su `formula_id`, nunca con la vigente. El snapshot (`valores`, `fuentes`, `tipos_cambio`, `totales`) es la autoridad.
- Versionado append-only: un borrador y una publicada por origen; revertir = publicar una copia. El ⚙ de una constante publica N+1 con nota automática; el de un tipo de cambio lo cambia para la empresa (`tipo_cambio_guardar`, D7).
- A lo sumo una cotización final activa por vehículo (`cotizacion_marcar_final`). Al entrar a logística la final se congela; si el vehículo sale de logística vuelve a preventa sin borrar historial.
- Sin motor de expresiones al cotizar: sólo las operaciones cerradas de `calculo`. La «fórmula como texto» (D4,
  `docs/DECISIONES.md` 2026-10-22; `compilador.ts`, 4.07) se compila a ese grafo **al configurar**, y lo que no se puede compilar a nodos se rechaza. Un nodo
  nuevo = tipo discriminado (`nodos.ts`) + `switch` exhaustivo (`referenciasDe()`) + caso en `validar_formula()` y en el juego de prueba.
- **D7 (2026-10-22):**
  - la hoja **calcula en la base** (`cotizacion_evaluar()` sobre `evaluar_formula()`, espejo de `motor.ts`) para todos;
  - **la fórmula (`definicion`, `params`, el texto) viaja sólo a quien tiene `cotizaciones.configurar`**, y `motor.ts` queda para el
    editor de la fórmula y la prueba de paridad;
  - lo que un nivel de acceso esconde no viaja por ninguna lectura (`docs/COTIZADOR.md` › «Niveles de acceso»).
- Lo decidido al abrir la Fase 4 (D1 a D6: «vencida», «desactualizada», el lead obligatorio, el vehículo según un ajuste de la
  empresa, la hoja como el Excel, las tablas que publican N+1 y la numeración) está en `docs/PLAN.md` › «Fase 4».

## Ojo

- `fuentes[id]` pinta la XCell: `override` → anillo, `sugerido` → punto (desde 4.05 reemplaza a `lookup`). No derivarlo comparando
  números.
- `comprobantes_contadores` es tabla, no sequence: la numeración no puede tener huecos.
- Office/«oficina» no es un caso especial: es un origen manual con una fórmula de dos nodos.
