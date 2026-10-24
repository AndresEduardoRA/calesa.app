# cotizaciones

Cotizador configurable: fórmula por origen como grafo de nodos versionado, XCell con ⚙ de default global, tablas de referencia, snapshot por cotización, preventa/final, versiones, comentarios, adjuntos, reportes, plantilla de tarjeta y PDF, comprobantes.

## Entra y sale

- Entra: wizard `/cotizaciones/nuevo` (origen → vehículo → lead → hoja → resumen), editor de fórmulas en Configuración, ⚙ de una celda, y **Configuración › Cotización › Niveles** (`/configuracion/cotizacion?seccion=niveles`, 4.09-2) con `equipo.roles.ver` o `equipo.roles.gestionar`; el modal de un nivel en `?panel=nuevo-nivel` y `?panel=renombrar-nivel&nivel=<id>`, la confirmación de eliminar en `?panel=eliminar-nivel&nivel=<id>`.
- Sale: `compilarExpresion(texto, contexto)` con sus códigos y tipos (ya por `index.ts`), `validarDiseno(definicion, diseno, contexto)` con `REGLAS_DE_DISENO`, las listas cerradas del diseño (`ANCHOS`, `PRESENTACIONES`, `SECUNDARIOS`, `EFECTOS_DE_INTERRUPTOR`, `MAXIMO_DE_ATAJOS`, `NIVEL_TODOS`) y sus tipos (ya por `index.ts`: lo usará el editor del diseño, 4.22), `evaluar(formula, entrada, modo?)` (motor puro, en `entities/`; todavía no lo exporta `index.ts`: lo usará el editor de la fórmula) y su espejo en la base, `evaluar_formula()` (4.06) y `cotizacion_evaluar()` (4.06; arma lo que `evaluar_formula()` necesita y la llama; sin `execute` para `authenticated` hasta el 4.10), `getCotizacion()`, `<ResumenCotizacion>`, `cotizacionFinalDe(vehiculoId)`. Lo consumen `logistica` (final vs real), `chat`, `buscador`, `web` (precio público), `tablero`.
- Sale también `leerNivelesDeAcceso()` por `index.ts` (`niveles_con_uso()`: los niveles, el tope, lo que admite cada uno y por qué no se elimina) con los tipos `ListaDeNiveles` y `NivelDeAcceso`, y por `pantallas/configuracion.ts` (sólo `src/app`) `<NivelesDeAcceso lista puedeGestionar>` y `<EsqueletoDeNiveles>`.
- Depende de: `leads`, `vehiculos`, `empresa` (tipos de cambio).

## Archivos clave

- `entities/nodos.ts` — el Zod de cada nodo, discriminado por `tipo` (y `calculo` por `op`), estricto; `referenciasDe()` con el `switch`
  exhaustivo. `entities/formula.ts` — `definicion` (`buckets`, `total_en`, `grupos`), `params` (constantes y tablas congeladas, D5) y
  el modo que recibe el motor.
- `entities/validar.ts` (con `validar-contexto.ts`, `validar-grupos.ts`, `validar-variante.ts`, `validar-campos.ts`, `motivos-de-formula.ts` y
  `medidor.ts`) — espejo TS de `validar_formula()`: la forma y 30 reglas cruzadas (`validar-campos.ts` es la última, `campo_con_punto`), lineal y con contador de visitas
  (`docs/COTIZADOR.md` › «Las reglas»).
- `entities/casos-de-formula.json` — el juego de fórmulas válidas e inválidas con su motivo (una por regla, más las tres del seed —«semilla: subasta_usa»,
  «semilla: planilla_usa» y «semilla: oficina»—, la anterior de `subasta_usa` como «ip generalizado: …», el Excel entero y «Amnistia»): lo recorren `validar.test.ts` y
  `supabase/tests/validar-formula.sql`. Una regla nueva = su caso acá.
- `supabase/migrations/20261019004900_validar_formula.sql` — `validar_formula()` y sus ayudantes `_formula_*` (STABLE desde `…005100`): la forma y las 29
  primeras reglas en el orden de `validar.ts`, lineal; rechaza con 22023, el código de la regla en DETAIL y `donde` en HINT. Recorre las
  claves de un objeto en el orden de jsonb. La 30.ª, `campo_con_punto`, está en `supabase/migrations/20261019005400_validar_formula_campos.sql`, que redefine `validar_formula()` entera (STABLE) y añade `_formula_campos()`; `…005500_formula_texto.sql` redefine `_formula_forma_nodo()` (STABLE) para admitir `texto`. Lo prueba `supabase/tests/validar-formula.sql` (`pnpm db:probar`) con los 92 casos y con
  el corpus diferencial `supabase/tests/corpus-de-formula.json` (más de 500 mutaciones de las 6 válidas, defectos mezclados, el esperado
  de `validarFormula`), que generan `corpus-de-formula.ts` y los `mutadores-*.ts` de esa carpeta y vigila `corpus-de-formula.test.ts`.
- `entities/diseno.ts` — el Zod del diseño de la hoja (D7, 4.08): `cabecera` (los modos de tipo de cambio y «Ver total Bs»), `secciones[]` con sus
  ítems (`celda`, `atajos`, `variante`, `interruptor`, `subtotal`) y `tarjeta_total`. Declarativo y estricto (nada de CSS, clases, HTML ni hex) y sin
  registros: la clave de cada colección va adentro, así que un `__proto__` es una clave desconocida en los dos lados.
- `entities/validar-diseno.ts` (con `validar-diseno-contexto.ts`, `-modos.ts`, `-secciones.ts`, `-cobertura.ts` y `motivos-de-diseno.ts`) —
  `validarDiseno(definicion, diseno, contexto)`: la forma y 28 reglas que cruzan el diseño con la fórmula (modos, niveles, ítems, tarjeta,
  atajos, cobertura y tonos), en un orden fijo, lineal y con el contador de `medidor.ts`. El contexto son tres listas: los niveles que existen, los
  retirados y las claves de tono. La definición llega ya validada por `validarFormula()`. Espejo de `validar_diseno()` (abajo).
- `entities/casos-de-diseno.json` — el juego a mano del diseño (válidos de las capturas, del Excel, de la semilla —uno por origen sembrado— y de «Amnistia»; cada regla con su
  caso y uno de orden por pasada): lo recorren `validar-diseno.test.ts` y `supabase/tests/validar-diseno.sql`. `diseno-sintetico.ts` arma los
  diseños de 200 y 2.000 ítems de la prueba de escala y de la medición.
- `supabase/migrations/20261019005600_validar_diseno.sql` — `validar_diseno(def, diseno, niveles, retirados, tonos)` y sus ayudantes `_diseno_*`
  (STABLE, invoker, `search_path` vacío): lo mismo que `validarDiseno()`, con el mismo código de regla y el mismo `donde` (22023, la regla en DETAIL y
  `donde` en HINT, por `_formula_rechazar()`). No lee tablas: el contexto entra como argumentos (lo arma `_publicar_formula()`). Lo prueba `supabase/tests/validar-diseno.sql` (`pnpm db:probar`) con el juego y con el corpus `supabase/tests/corpus-de-diseno.json`
  (`corpus-de-diseno.ts` y los `mutadores-de-diseno*.ts`, que vigila `corpus-de-diseno.test.ts`).
- `supabase/migrations/20261019005700_tonos.sql`, `…005800_formula_con_diseno.sql` y `…005900_formulas_solo_configurar.sql` (4.08-2; `docs/COTIZADOR.md` › «En la
  base (4.08-2)»): `formulas.diseno` y `visibilidad` (en `schemas/`); `formula_guardar_borrador(origen, def, params, diseño, nota?)` (valida la fórmula y la forma del
  diseño; sin default de `p_diseno`); `formula_publicar()` y el ⚙ por `_publicar_formula()` (valida la fórmula y el diseño completo, compila `visibilidad`, **exige el
  diseño**); `_niveles_de_cotizacion()` (desde el 4.09-1 lee `cotizaciones_niveles`), `_compilar_visibilidad()`, `_nivel_en_uso()`; el catálogo `tonos` y `tono_crear|guardar|eliminar`
  (AA en la base: `_color_contraste()`, copia de `color.ts`; hasta 24; `_tono_en_uso()`); la policy de lectura de `formulas` sólo para `cotizaciones.configurar` y
  `formula_auditar()` (sin la fórmula en `actividad`). Los ayudantes no son de nadie. Lo prueban `supabase/tests/{tonos,publicar-diseno}.sql`, el corpus
  `corpus-de-contraste.json` (lo genera `corpus-de-contraste.ts`), el bloque de la policy de `humo.sql`, `scripts/carreras/tonos.mjs` y `medir-publicar.sql`.
- `supabase/semillas/cotizador-{subasta-usa,planilla-usa,oficina}.sql`, `…/estadisticas.sql` y `supabase/migrations/20261019006000_preparar_publicacion.sql` (4.08-3;
  `docs/COTIZADOR.md` › «La semilla (4.08-3)»): las tres fórmulas v1 con su diseño y su `visibilidad` (la de las capturas con los modos Unificado y Paralelo, el Excel entero
  en `planilla_usa` y `oficina`), sus tablas de referencia generadas de `params.tablas`, y los tipos de cambio `oficial`, `paralelo`, `unificado` y `aduana` de `seed.sql`.
  Nacen por `_preparar_publicacion()` —el tramo de `_publicar_formula()` que valida la fórmula y el diseño con los niveles y los tonos de la base y compila la visibilidad—
  y pasan el `check` `formulas_publicada_con_diseno` (en `schemas/`). `config.toml` › `[db.seed] sql_paths` fija el orden y `scripts/probar-schema.mjs` lo lee. Los prueban
  `entities/semilla.test.ts` (el juego, el diseño, las cifras de las capturas y del Excel contra `evaluar()`) y `supabase/tests/semilla-cotizador.sql` (lo mismo en la base, con
  `cotizacion_evaluar()`; corre antes que `humo.sql`).
- `supabase/migrations/20261019006100_niveles_de_acceso.sql`, `…006200_nivel_no_admitido_del_pct.sql` y `…006300_editar_sin_ver.sql` (4.09-1; `docs/COTIZADOR.md` › «En la base (4.09-1)»):
  la tabla `cotizaciones_niveles` (en `schemas/`, sembrada con «todos» y «costos», hasta 10) y los permisos `cotizaciones.nivel.<clave>.ver|editar` (`permisos.nivel_clave`) que genera cada
  nivel salvo «todos» y se conceden al dueño; el check, la FK y el trigger diferido que los atan; `nivel_crear|renombrar|retirar|eliminar` (`equipo.roles.gestionar`; eliminar mira `_nivel_en_uso()`
  y responde cuánto lo usan); `_niveles_de_cotizacion()` leyendo la tabla; el `for key share` de los niveles del diseño en `_preparar_publicacion()`; **`_nodos_visibles(formula_id)`**, el enforcement
  (un nivel sólo estrecha; de nadie; el 4.10 la consume); y las reglas `editar_sin_ver` y 4-9 (`nivel_no_admitido` también mira el `pct` de un par y el interruptor) de `_diseno_secciones()`. Las
  prueban `supabase/tests/niveles.sql`, el caso genérico de `permisos-enforcement.sql`, `scripts/carreras/niveles.mjs` y `medir-nodos-visibles.sql`. El catálogo de TS de permisos
  reconoce estas claves por su patrón (`esClaveDeNivel()` de `@/shared/lib/permisos`): la matriz de Roles las muestra, por origen y en «Cotizaciones».
- `supabase/migrations/20261019006400_nivel_restaurar.sql`, `…006500_niveles_con_uso.sql` y `…006600_motivo_de_uso_en_una_sola_pasada.sql` (4.09-2; 4-12): `nivel_restaurar(id, versión)` deshace `nivel_retirar` (uno que no está retirado responde `sin_cambios` sin mirar la versión ni
  escribir) y `niveles_con_uso()` (`equipo.roles.ver` o `gestionar`) entrega la lista con, de cada nivel, `se_renombra`, `se_retira`, `se_elimina` y `motivo_de_uso` (`_nivel_motivo_de_uso()`, el texto
  que también dice `nivel_eliminar`); `_niveles_lista()` lo lleva en la respuesta de cada escritura, y `…006600` lo calcula en una sola pasada (sin preguntar antes `_nivel_en_uso()`). Las prueban `niveles.sql`, `niveles-con-uso.sql`, las carreras de restaurar contra retirar y contra eliminar y `medir-nodos-visibles.sql`.
- `entities/nivel.ts` (4.09-2) — `NivelDeAcceso`, `ListaDeNiveles`, `listaDeNivelesDesde()`/`respuestaDeNivelesDesde()` (Zod), `separarNiveles()` (fijo · en uso · retirados, por nombre en español), `validarNivel()` (espejo de
  `_nivel_nombre()`), `accionesDeNivel()` (Renombrar · Retirar o Restaurar · Eliminar, con el motivo cuando no se puede), `motivoParaNoAbrirNivel()` y las constantes de la URL. **Nada razona por el nombre ni la clave de un nivel**:
  qué admite lo dice la fila. `entities/repositorios-de-niveles.ts`, `infra/niveles.ts` (las cinco RPC), `infra/queries/niveles.ts` y `composicion.ts`.
- `features/niveles/` (4.09-2) — `actions/` (crear, renombrar, retirar, restaurar, eliminar; `equipo.roles.gestionar`), `schemas/`, `hooks/` (`use-niveles` la lista sembrada por una firma —cada respuesta la reemplaza—, retirar y restaurar con «Deshacer»;
  `use-filas-de-niveles`; el modal y la confirmación por URL) y `components/` (`niveles-de-acceso`, `lista-de-niveles` sobre `@/shared/ui/lista`, `acciones-de-nivel` el «⋯», `modal-de-nivel`, `eliminar-nivel`, `diferidos`, `esqueleto-de-niveles`).
  Quien sólo lee (`equipo.roles.ver`) ve la lista sin «Nuevo nivel» ni «⋯». La ruta vive en `src/app/(app)/configuracion/cotizacion/`.
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

`formulas`, `tonos`, `cotizaciones_niveles`, `tablas_referencia`, `tablas_referencia_filas`, `plantillas_tarjeta`, `cotizaciones`, `cotizaciones_revisiones`, `cotizaciones_comentarios`, `cotizaciones_adjuntos`, `cotizaciones_reportes`, `cotizaciones_favoritos`, `comprobantes`, `comprobantes_contadores`.
RPC: `formula_guardar_borrador`, `formula_publicar`, `formula_descartar_borrador`, `formula_cambiar_constante`, `tono_crear`, `tono_guardar`, `tono_eliminar`, `nivel_crear`, `nivel_renombrar`, `nivel_retirar`, `nivel_restaurar`, `nivel_eliminar`, `niveles_con_uso`, `validar_formula`, `validar_diseno`, `evaluar_formula`, `cotizacion_evaluar`, `plantilla_*`, `cotizacion_marcar_final`, `cotizacion_moderar`, `comprobante_emitir/anular`, `margen_vehiculo`.

## No se rompe

- Una cotización se recalcula **siempre** con su `formula_id`, nunca con la vigente. El snapshot (`valores`, `fuentes`, `tipos_cambio`, `totales`) es la autoridad.
- Versionado append-only: un borrador y una publicada por origen; revertir = publicar una copia. El ⚙ de una constante publica N+1 con nota automática; el de un tipo de cambio lo cambia para la empresa (`tipo_cambio_guardar`, D7).
- A lo sumo una cotización final activa por vehículo (`cotizacion_marcar_final`). Al entrar a logística la final se congela; si el vehículo sale de logística vuelve a preventa sin borrar historial.
- Sin motor de expresiones al cotizar: sólo las operaciones cerradas de `calculo`. La «fórmula como texto» (D4,
  `docs/DECISIONES.md` 2026-10-22; `compilador.ts`, 4.07) se compila a ese grafo **al configurar**, y lo que no se puede compilar a nodos se rechaza. Un nodo
  nuevo = tipo discriminado (`nodos.ts`) + `switch` exhaustivo (`referenciasDe()`) + caso en `validar_formula()` y en el juego de prueba.
- **Toda copia de una versión lleva el diseño** (el ⚙ pasa `v_pub.diseno`; revertir y la N+1 de una tabla, cuando existan, también): publicar lo exige, y un cambio de
  diseño publica la N+1, así que «desactualizada» y D5 lo cuentan solos. El ⚙, revertir y la N+1 publican con `retirados` vacío: lo que ya usa un nivel retirado se
  sigue filtrando igual. **Un tono o un nivel que una versión nombra no se elimina** (`_tono_en_uso()`, `_nivel_en_uso()`; un nivel se retira). **Los tonos y los niveles que existen salen
  de un solo punto cada uno** (la tabla `tonos` y `_niveles_de_cotizacion()`, que lee `cotizaciones_niveles`): nada escribe «costos» a mano fuera de él. `formulas` sólo la lee quien configura.
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
- **Cambiar una fórmula del seed = cambiar su caso del juego** (`semilla.test.ts` los compara) **y su diseño**; el transporte sembrado casa `tipo` con el campo `tipo_vehiculo`
  y es sobrescribible: un tipo que la tabla no tiene (la subasta trae «AUTOMOBILE») da null con su motivo, y el asesor lo tipea.
