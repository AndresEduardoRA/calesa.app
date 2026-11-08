# El cotizador: fórmula como grafo

Versión completa (historia por paso, mediciones): `docs/archivo/COTIZADOR.md`, sólo con grep.

La fórmula de un origen vive en `formulas.definicion` y `formulas.params` (jsonb) y se versiona entera. El candado que impide publicar
una fórmula rota es doble y aplica las mismas reglas: `validar.ts` (`src/modules/cotizaciones/entities/`) y `validar_formula()` en la
base, con un juego común (`entities/casos-de-formula.json`) y un corpus diferencial (`supabase/tests/corpus-de-formula.json`). La
evalúan el motor TS (`entities/motor.ts`) y `evaluar_formula()`. Referencia: `docs/referencias/excel-de-cotizacion.md`.

## Forma

`definicion` = `{ nodos, buckets, total_en, grupos }`: `nodos` es una lista ORDENADA (el orden es el de evaluación; sólo se referencia
hacia atrás); `buckets` mapea un nombre libre a un id de nodo `tipo_cambio` (`{ exterior: 'tc_paralelo', aduana: 'tc_oficial' }`);
`total_en` es el tipo de cambio que divide el total en Bs (obligatorio con grupos); `grupos` es `[{ id, etiqueta, plazo, tono,
bucket }]`. `params` = `{ <constante>: número, …, tablas?: { <clave de tabla>: [ { <columna>: número | texto | null } ] } }`.

### Los nodos

Común: `id` (`^[a-z][a-z0-9_]{0,40}$`), `tipo`, `etiqueta`; `formato?` (`usd` por defecto, `pct`, `raw`, `moneda`); `descripcion?`;
`salida?` (`total`, `base_imponible`, `aparte`); `bucket?` (sólo sin grupos); `grupo?`; `solo_en?` (claves de la variante; no en
`tipo_cambio` ni `opcion`). Cada objeto es **estricto**: una clave mal escrita es un error.

- `input`: `sugerido_de?` (nodo anterior), `requerido_si?` (bandera), `condicion?`. Lo tipea el asesor.
- `constante`: `condicion?`, `texto?`. Vale `params[id]`, el «valor por defecto global» que cambia el ⚙ (publica la N+1).
- `tipo_cambio`: `clave` (una clave, un solo nodo). Vale el de `tipos_cambio` al cotizar; se congela.
- `campo_vehiculo`: `campo` (`anio` o la clave de un campo del origen), del vehículo vinculado. `bandera`: el interruptor, 0 o 1.
- `opcion`: `opciones: [{clave, etiqueta, titulo}]` (dos o más), `por_defecto?`. A lo sumo una. Vale la clave elegida (texto); la
  nombran `solo_en` y un `match`, nunca un cálculo.
- `tabla`: `tabla`, `match` {columna: nodo anterior o, si no hay uno con ese id, campo del vehículo}, `columna`, `sobrescribible?`,
  `condicion?`. `tramo`: `tabla`, `sobre` (un nodo), `columna`, `sobrescribible?`, `condicion?`: la fila con `desde ≤ sobre ≤ hasta`.
- `calculo`: `op`, `sobrescribible?`, `condicion?`, `texto?`. Operaciones: `suma(de ≥ 1)`, `porcentaje_de(de ≥ 1, pct)` = Σde × pct,
  `multiplicar(de ≥ 2)`, `restar(de[0] − de[1…])`, `dividir(de[0] / de[1])`, `si(condicion, de[0])`,
  `depreciar(de[0], tabla, sobre, columna)`, `redondear(de[0], n de 0 a 6)`.

Un nodo nuevo lleva su tipo en el Zod de `nodos.ts`, su caso en `referenciasDe()` y en `validar_formula()`, y el juego de prueba.

### Grupos, buckets y el total

- **Un grupo** tiene plazo, tono (clave del catálogo `tonos`) y bucket; no es un nodo (un nodo entra con `grupo: id`). Su USD es la
  suma de sus miembros; su Bs, ese subtotal por el tipo de cambio de su bucket.
- **Un bucket** es el papel del dinero (afuera o aduana); `buckets` le da a cada uno un nodo `tipo_cambio`.
- **El total:** con `total_en`, **manda Bs ÷ tc(`total_en`)** (Bs = Σ grupo × tc(su bucket)); el nodo `salida: total`, único, es la suma
  de los dólares y también se ve. Con grupos, `total_en` es obligatorio. Sin `grupos` (Fase 0) el bucket va en el nodo y **reparte el
  total**: total con bucket, Bs = total × su tc (`oficina`); si no, un `suma` cuyos términos directos tienen bucket (`subasta_usa`).
- `base_imponible` y `aparte` (la garantía) se muestran y nunca suman; ninguno va en un grupo.

### Sugerido, sobrescribible y el par porcentaje-monto

Un `tabla`, `tramo` o `calculo` con `sobrescribible: true` calcula su valor (el sugerido) y la cotización puede traer otro. **El par
porcentaje-monto** es un `porcentaje_de` sobrescribible y su `pct`: **manda el monto si tiene override**, y si no, el %; si manda el
monto, `valores[pct]` guarda monto ÷ base y `fuentes[pct] = override`. Ningún otro nodo lee ese `pct`, y acepta un valor
(`aceptaValor()` en `nodos.ts`; si no, `par_mal_tipado`).

### La variante y el interruptor

Un nodo fuera de su variante (`solo_en`) o con `condicion` apagada vale 0 sin leer sus referencias, no guarda override y se dibuja
deshabilitado con su motivo («El motor» › «La variante y el estado»). El `opcion` va antes que todo nodo con `solo_en`. El total no
lleva `solo_en`, `condicion` ni `sobrescribible`.

### Las tablas congeladas (D5)

Editar una tabla de referencia publica la N+1 de cada fórmula de su origen que la usa, y la fórmula congela en `params.tablas` las
filas que usa: recalcular con su versión vale también para las tablas. **El motor usa la congelada si existe, aunque esté vacía**; si
no, la viva (`tablas_referencia_filas`); sin ninguna, `tabla_sin_filas`.

## Las reglas

**Primero la forma (`forma`):** el Zod de `nodos.ts` y `formula.ts`. **Después, 30 reglas cruzadas,** con código estable (contrato con
la base; el texto es de cada lado, `entities/motivos-de-formula.ts`); `donde` es el id del nodo, grupo o clave donde se rompe (en la
base, `hint`): `nodo_duplicado`, `referencia_inexistente` (un `match` sin nodo es un campo del vehículo), `ciclo`,
`referencia_hacia_adelante` (también `solo_en` antes del `opcion`), `referencia_de_tipo`, `total_unico`, `total_fijo`,
`total_no_es_monto`, `constante_sin_valor`, `param_sin_constante`, `par_mal_tipado`, `pct_compartido`, `tipo_de_cambio_repetido`,
`tipo_de_cambio_inexistente`, `bucket_inexistente`, `total_sin_tipo_de_cambio`, `grupos_sin_total_en`, `grupo_duplicado`,
`grupo_inexistente`, `grupo_vacio`, `bucket_con_grupos`, `miembro_no_es_monto` (sólo `input`, `constante`, `tabla`, `tramo`,
`calculo`, en usd o moneda), `miembro_con_salida`, `doble_conteo` (un miembro que acumula otro), `opcion_repetida`, `opcion_clave_repetida`, `opcion_por_defecto_inexistente`, `solo_en_sin_opcion`,
`solo_en_opcion_inexistente`, `campo_con_punto` (un campo de vehículo con punto: es una columna o la clave de un campo del origen).

El validador **devuelve el primer rechazo**, en orden fijo, y es **lineal** (todo bucle y toda búsqueda pasan por `medidor.ts`).

### En la base (4.05-4)

`validar_formula(definicion, params)`, STABLE, hace lo mismo que `validarFormula()`. Rechaza con `22023`, el código en DETAIL y
`donde` en HINT; sólo código y `donde` son contrato. **Divergencia declarada:** la base es más estricta con
`__proto__` en `buckets`, `tablas` o una fila. La base nunca acepta lo que Zod rechaza.

## El motor

`evaluar(formula, entrada, modo?, medidor?)` en `entities/motor.ts`: puro (sin I/O, fecha, azar ni base). `formula` es la salida de
`validarFormula()`. `evaluar_formula()` es su espejo; comparten `entities/casos-del-motor.json`.

**La entrada** (`esquemaEntrada`, `motor-entrada.ts`): `inputs` (lo tipeado por id de `input`), `banderas` (lo que no está, apagada),
`tipos_cambio` (por clave, > 0), `vehiculo` (por campo: número, texto o null), `tablas` (las vivas; la congelada manda), `variante?`
(sin clave, el `por_defecto`), `overrides` (`{id: número}`; el que no se aplica no es error).

**El resultado:** `valores` (todos los nodos, en el orden de la lista; null si falta algo que lo alcanza; el `opcion`, su clave),
`estados` (`activo`, `fuera_de_variante`, `condicion_apagada`), `fuentes` (`default`, `sugerido`, `override`, `input`; sólo nodos
activos que aceptan un valor), `totales` (`grupos` `{usd, bs, se_dibuja}`, `bs`, `usd` = Bs ÷ tc(`total_en`) o, sin `total_en` ni modo,
la suma de los dólares, y `suma_usd` = el nodo `salida: total`), `faltantes` (`{codigo, donde, ref?}`, en el orden en que nacen) y
`overrides_descartados` (`{id, motivo}`).

**Los errores de llamada lanzan** `ErrorDelMotor`: `modo_invalido`, `entrada_invalida` (clave de `inputs`/`banderas` de otro tipo;
`variante` inexistente; sin `variante` ni `por_defecto`), `formula_sin_validar`. Lo que causa una persona no lanza: viaja como
`faltantes` o `overrides_descartados`.

### La variante y el estado

La pasada previa (`motor-estados.ts`) decide cada nodo: con `solo_en` y variante ausente, `fuera_de_variante`; con `condicion` y
bandera ≠ 1 (una bandera fuera de su variante está apagada), `condicion_apagada`; si no, `activo`. Un nodo inactivo vale 0 sin leer
referencias y su override se descarta. La variante gana a la condición. También marca los grupos que se dibujan y los pct «pisados».
Un `match` que nombra la variante compara la clave elegida (texto) con la columna. Un input tipeado fuera de su variante vale 0.

### Overrides y fuentes

**Precedencia: override > sugerido.** Un nodo activo con override vale el override y **no calcula su sugerido**. ↺ lo quita.
`constante`: `default` u `override`. `tipo_cambio`: `default` (el de la empresa) u `override` (≤ 0 es sin valor).
`tabla`/`tramo`/`calculo` sobrescribible: `sugerido` u `override`. `input` sin `sugerido_de`: `input` (su override se descarta como
`no_sobrescribible`; lo tipeado va en `inputs`); con `sugerido_de`: tipeado (`override`) o el del nodo que nombra (`sugerido`). Lo demás
no tiene fuente y su override se descarta `no_sobrescribible`.

Motivo de un descarte, por precedencia: `nodo_inexistente`, fuera de variante, apagado, `no_sobrescribible`. Los de nodos van en el
orden de la lista; los inexistentes, al final **ordenados por id** (bytes, `collate "C"`). Una cotización que pasa a la N+1 trae los
overrides de la N. `total_en` y los buckets leen el valor final del nodo.

### El par porcentaje-monto

Base = Σde de izquierda a derecha. **Con override del monto, el pct está «pisado»**: no se calcula, no aplica su propio override, su
fuente es `override` y vale monto ÷ base. Sin override: monto = base × pct (`sugerido`). Override sólo del pct: monto = base × pct. Los
dos: manda el monto. Base 0 y manda el %: monto 0; base 0 con override del monto: pct null y `division_por_cero` en el pct.

### `sugerido_de` y `requerido_si`

«Tipeado» es que la clave está en `inputs`, aunque valga 0. `sugerido_de` sin tipear vale lo del nodo que nombra (`sugerido`);
tipeado, `override`. `requerido_si` encendida y sin tipear: null con `requerido_sin_valor` (donde = el input, ref = la bandera); un
sugerido no lo cumple; un input inactivo no exige nada.

### Qué pasa cuando falta algo

- Input o bandera sin valor: **0**, sin faltante. Dan null con su faltante: `requerido_sin_valor`; `campo_sin_valor` (campo del
  vehículo ausente, null o no número); `tabla_sin_filas`; `fila_sin_coincidencia`; `celda_sin_valor` (no es número); `division_por_cero`;
  `tipo_de_cambio_sin_valor` (ausente o ≤ 0); `fuera_de_rango` (no finito). Un nodo anota a lo sumo un faltante; uno que lee un null
  es null sin faltante nuevo. Fuera de variante o condición apagada: **0 sin leer referencias**.
- **Totales:** el USD de un grupo es null si lo es un miembro; su Bs, si lo es su USD o su tipo de cambio. **Un grupo que no se dibuja**
  vale `{usd: 0, bs: 0, se_dibuja: false}` y no lee su tipo de cambio. Los códigos (`motor-contexto.ts`) son el contrato con la base.

### La aritmética

Dobles (float8), de izquierda a derecha: `suma` = ((d0 + d1) + d2)…; `restar` = ((d0 − d1) − d2)…, nunca d0 − Σresto; `multiplicar`
igual; `porcentaje_de` = (Σde) × pct. −0 se guarda como 0; lo no finito, null con `fuera_de_rango`. **`redondear(x, n)` =
`round(x::float8::numeric, n)::float8`:** 15 cifras significativas y mitad lejos de cero, como el ROUND del Excel (2,675 da 2,68);
`redondeo.ts` lo hace exacto con BigInt.

### Las tablas, los tramos y `depreciar`

La congelada de `params.tablas` manda si existe, aunque esté vacía; si no, `entrada.tablas`. **`tabla`:** gana la **primera fila** (en
el orden de la tabla) cuyas columnas del `match` son todas iguales a lo que nombran: un nodo anterior con ese id (la variante, su
clave) o, si no, el campo del vehículo; **igualdad estricta sin conversión** (2024 ≠ "2024"). **`tramo`:** la primera fila con
`desde ≤ sobre ≤ hasta` (extremos incluidos); sin `desde` o `hasta` numérico no coincide nunca.
**`depreciar(d0, tabla, sobre, columna)` = d0 × el `tramo` de esa tabla**.

### En la base (4.06-1)

`evaluar_formula(p_def, p_params, p_entrada, p_modo default null)`, STABLE, hace lo mismo que `evaluar()`: recibe las dos columnas de
`formulas` tal cual, el modo completo (NULL de SQL es «sin modo») y **no revalida la fórmula**. `faltantes` y `overrides_descartados`
son **arreglos** (su orden es contrato). Errores de llamada: 22023, código en DETAIL, `donde` en HINT. Se suma con bucle en el orden de
la lista (`supabase/tests/evaluar-formula.sql`).

### En la base (4.06-2)

`cotizacion_evaluar(p_entradas, p_cotizacion, p_origen, p_vehiculo, p_modo)` y su ayudante `_cotizacion_armar()` (`security definer`;
armar comprueba y lee, la otra llama a `evaluar_formula()`); ampliada en «En la base (4.10-1)» y «La hoja abierta (4.13-3a)».

- **Llamada:** exactamente uno de `p_cotizacion` y `p_origen` (si no, `llamada_invalida`). **Con una cotización:** SU fórmula
  (`formula_id`, nunca la vigente), SUS tipos de cambio congelados y SU vehículo. **Con un origen:** la fórmula publicada
  (`origen_sin_formula`), los tipos de cambio activos de la empresa y `p_vehiculo` opcional (`vehiculo_de_otro_origen`).
- **Lo que tipea la persona** es `p_entradas = {inputs, banderas, overrides, variante}` y nada más (`entradas_invalidas`); la base
  pone `tipos_cambio`, `vehiculo` y `tablas`. **Quién puede:** cotización, `puede_cotizacion(id, 'cotizaciones.ver')` (inexistente y no
  vista dan el mismo 42501); origen, `cotizaciones.crear`. El vehículo se lee sólo con `puede_vehiculo(id, 'vehiculos.ver')` y sólo
  salen los campos que la fórmula nombra.
- **Qué lee:** sólo las tablas que un nodo nombra y la fórmula no congeló (la del origen o, si no hay activa, la compartida con
  `origen_id is null`; «la primera fila» es la de menor `orden` y, repetido, menor `id`); un campo del vehículo es una columna (`anio`,
  `marca`, `modelo`, `kilometraje`, `precio`) o la clave de un campo **activo del origen** (`atributos -> clave`).

## Fórmulas como texto (4.07)

`compilarExpresion(texto, contexto, medidor?)` (`entities/compilador.ts`) convierte `=(remate+fees)*4%` en nodos del mismo grafo. Puro,
**nunca lanza** (devuelve `{ ok: false, error: { codigo, mensaje, tramo } }`; códigos en `entities/motivos-del-compilador.ts`), sin
recursión, lineal, profundidad máxima 64. Se compila **al configurar**; al cotizar no se evalúa texto. **`texto?` de la fila** (sólo
`constante` y `calculo`): el editor guarda `{ ...raíz compilada, texto }`, de 1 a 2.000 caracteres (`MAXIMO_DE_TEXTO` en `nodos.ts`); el
motor lo ignora; otro nodo con `texto` es `forma`.

- **Gramática:** números, `4%` (÷ 100, constante `pct`), `+ - * /` y `( )`; un nombre es sólo el id de un nodo anterior. Funciones
  (argumentos con `;`): `SUMA(grupo)`, `SI(bandera; x)`, `REDONDEAR(x; n)`, `PORCENTAJE_DE(x; pct)`,
  `DEPRECIAR(x; tabla; sobre; columna)`. No hay `MULTIPLICAR`/`RESTAR`/`DIVIDIR`, referencias A1 ni `HOY()` (4-4). Un literal es una
  `constante` en `params`.
- **Grafo:** `a+b+c` es UN `suma` (igual `restar` y `multiplicar`); un paréntesis, función o cambio de operación cortan el aplanado;
  `/` nunca se aplana. Cada operación anidada y número es un auxiliar `<destino>__<n>`, `n` desde 1 en
  **post-orden**; la fila es la raíz y no se numera; un id existente es `auxiliar_ocupado`.

### El editor (4.21-1)

Lo puro de «cada fila se edita en texto», en `entities/formula/` (sin pantalla ni base; la pantalla es del 4.21-3a, abajo). Todo es puro, nunca lanza, no toca lo que recibe y es
lineal con el medidor; `compilarExpresion()` no cambia.

- **Fila y auxiliares** (`filas.ts`, `filasDe()`): una fila es un nodo que no es auxiliar de otra. Las auxiliares de una fila con `texto` son los k nodos de justo antes
  con ids `<id>__1…k` (el mismo recorte que `idAuxiliar()` si el id pasa de 37 caracteres, 38 desde `__10`), sin texto propio, cada uno nombrado por exactamente un nodo de la cadena
  o por la fila; si el **texto** de la fila nombra una (`=total__1+remate`), ese nodo es una fila propia que la fila lee.
- **Compilar una fila en su lugar** (`compilarFila()`): el contexto es lo anterior a su primera auxiliar; reemplaza la fila y sus auxiliares, y quita y suma sus `params`. El tope de
  2.000 se mide **en unidades UTF-16** (como el Zod; la base cuenta caracteres): `texto_demasiado_largo` con el tramo desde la unidad 2.001 (4-6). Conserva `seccion`,
  `color`, `sobrescribible` (si sigue siendo cálculo) y `condicion` sólo como interruptor: en un `SI` la bandera la decide el texto. Lo que suelta se dice en `soltados`. Si otra fila
  nombra una auxiliar y el texto nuevo la cambia o la quita, `auxiliar_nombrada` (no se deja una referencia rota).
- **El texto ya no manda (4-5)** (`textoVigente()`): el ⚙ de un número del texto publica N+1 sin tocar `texto`. Al abrir la fila se compila el texto guardado y se compara con
  lo guardado: si sólo cambió el valor de una constante, el valor se **reescribe en su tramo** (`escribirLiteral()`: con `%`, el punto se corre en el texto, nunca `v * 100`) y la
  fila queda `reescrito`; si no (no compila, otra estructura, un negativo, un `-0`), `no_manda` con su motivo. Un negativo no se escribe por decisión. Recompilar una fila `no_manda`
  que cambia o quita una constante da `pisa_un_valor` hasta que llega `confirmaPisar`: nunca se deshace un ⚙ en silencio.
- **Las filas sembradas** no traen texto: `textoDeNodo()` lo escribe desde el nodo (`a+b+c`, `SI(b; x)`, sin el «=») sólo si compilarlo da exactamente ese nodo; si no, `null` y la fila se muestra por sus campos.
- **La pantalla** (4.21-3a-1, `features/formula/components/editor/`, `?panel=editar-formula`): lee la definición del borrador o de la publicada desde el navegador, muestra cada fila con `textoVigente()` / `textoDeNodo()` (o por sus campos), compila al aplicar con `compilarFila()` (sin llamar a `validarFormula()` en un error de la fila: 4-6), valida la fórmula de trabajo tras cada cambio (el rechazo, en su fila) y guarda lo aplicado en la pestaña; nada va a la base hasta el 4.21-3b.
- **La vista previa y las filas nuevas** (4.21-3a-2): el editor usa el motor TS (`evaluar()`), que D7 reservaba para esto: `calcularLaVistaPrevia()` (`entities/formula/vista-previa.ts`, puro, nunca lanza) calcula la fórmula que devolvió `validarFormula()` con `entradaDePrueba()` (datos en 0, banderas apagadas, variante por defecto, sin overrides) y los tipos de cambio y tablas que lee el navegador (`infra/formula/consulta-del-terreno-de-prueba.ts`: `tablasVivasDe()`, `elegirTablas()` —la del origen gana a la compartida, como `evaluar_formula()`— y `aceptarPagina()`, por páginas de 1.000 filas, el `max_rows`); la congelada de `params.tablas` manda sobre la viva (D5). «Sumar fila» (`entities/formula/fila-nueva.ts`: `idDeFilaNueva()`, `sumarFila()`) crea la fila con `compilarFila()` y un destino nuevo, y revisa que lo compilado sea el tipo elegido.

## Tipos de cambio y modos (D7, H1)

- Los tipos de cambio son **una lista de la empresa**: `tipos_cambio` (oficial, paralelo, unificado, aduana y los que se sumen), con
  `tipos_cambio_historial` y el permiso `empresa.tipos_cambio.gestionar`. **La cotización congela** en `tipos_cambio` lo que usó; el
  asesor puede sobrescribir uno si su celda es editable para su nivel. El ⚙ es `tipo_cambio_guardar` (afecta a todos los orígenes).
  **Publicar no comprueba** que `tipos_cambio` tenga la clave de cada nodo `tipo_cambio`: `cotizacion_evaluar()` lo da como faltante.
- **Un modo** lo declara el diseño; el elegido se guarda en `cotizaciones.modo_tc`. **El motor lo recibe
  completo**, con la forma de la fórmula: `{ buckets: {bucket: id de nodo tipo_cambio}, total_en }` (`ModoDeCambio` en
  `entities/formula.ts`). Un modo es otro mapa, no otra cuenta. **Límite (4.13-4b2):** `cabecera.moneda_bs` es la de la versión, no la del modo elegido; un modo cuyo `total_en`
  tenga otra `moneda_a` escribiría el total en Bs con la de la versión (hoy todos los tipos de cambio son USD → BOB).

## El diseño de la hoja (D7)

`formulas.diseno` (jsonb), versionado y publicado con la fórmula (un cambio de diseño publica la N+1). Lo validan `validarDiseno()`
(`entities/validar-diseno.ts`, sobre el Zod de `entities/diseno.ts`) y `validar_diseno()` en la base, con juego
(`entities/casos-de-diseno.json`) y corpus. **Declarativo:** nada de CSS, clases, HTML ni hex.
Forma: `{ cabecera: {modos[], ver_total_bs}, secciones[], tarjeta_total: {nodo, secundarios[]} }`.

- **`cabecera.modos[]`** `{clave, nombre, buckets: [{bucket, nodo}], total_en}`: nombra **nodos `tipo_cambio`** (no claves) y llena
  **exactamente** los buckets de la fórmula; no hay modos en una fórmula sin `total_en`.
- **`secciones[]`, en orden** (el del DOM, de lectura y del `Tab`): `id`, `titulo?`, `presentacion` (`principal`/`avanzado`),
  `nivel_ver?`/`nivel_editar?` (los heredan sus ítems), `items[]`. Las `avanzado` van juntas en **un** modal «Avanzado».
- **`items`:** `celda` (`nodo`, `ancho`, `secundario?`, `ayuda?` = una `tabla` o un `texto`, `nivel_ver?`, `nivel_editar?`; **el
  candado se deriva** —cálculo, dato del vehículo, condición apagada, otra variante o nivel que falta— y siempre dice su motivo; **el
  par porcentaje-monto es una sola celda**, con `secundario`); `atajos` (un nodo `tabla` sobrescribible, su `columna` y hasta 12
  `filas` como chips); `variante` (el nodo `opcion` como chips; obligatoria si hay variante); `interruptor` (una `bandera` con `efecto`
  `habilita`, que deshabilita lo que condiciona, o `muestra`, que apagada no lo dibuja; toda bandera que condiciona algo o pide un dato
  tiene su interruptor); `subtotal` (un `calculo` como franja).
- **`tarjeta_total`:** el nodo total y sus `secundarios` (`aparte`). Un nodo aparece a lo sumo una vez. Nivel efectivo de un ítem: el
  suyo (sólo la celda), si no el de su sección, si no `todos`. El diseño no lleva `solo_en`. **El tono es del grupo de la fórmula**
  (`definicion.grupos[].tono`).

### Las reglas (4.08-1)

**Primero la forma (`forma`)**, el Zod de `diseno.ts`; **después, 28 reglas cruzadas** con código estable (lista en
`entities/motivos-de-diseno.ts`; `donde` = id del nodo, sección, modo o grupo; en la base, `hint`). Las de nivel: `nivel_no_admitido`
(el total, lo `aparte` o la variante con nivel efectivo de ver que no es «todos»: la base siempre manda el total y lo `aparte`) y
`editar_sin_ver` (ver restringido con editar ausente o «todos»; **ver abierto con editar restringido vale**). El primero que falla
manda. **La definición llega ya validada.** `validar_diseno(def, diseno, niveles, retirados, tonos)`: STABLE, invoker, `search_path`
vacío, 22023 con la regla en DETAIL y `donde` en HINT.

### En la base (4.08-2)

- **`formulas.diseno` y `formulas.visibilidad`** (jsonb): nulas sólo en un borrador. **Publicar exige el diseño** (22023
  `diseno_faltante`; `check` `formulas_publicada_con_diseno`, también en las archivadas).
- **Guardar:** `formula_guardar_borrador(origen, definición, params, diseño, nota?)` valida la fórmula y sólo la **forma** del diseño.
  **Publicar** (`formula_publicar()` → `_publicar_formula()`; el ⚙ y revertir → `_publicar_version()`, 4.20-1): toma el borrador `for
update` y los tonos de sus grupos `for key share`, valida fórmula y diseño completo (`_preparar_publicacion()`) y compila `visibilidad`.
  Dos a la vez: PT409 (ver «Versiones (4.20-1)»).
- **`visibilidad`** = `{nodo: {ver, editar}}` con **claves de nivel**, no permisos (`_compilar_visibilidad()`): cada ítem da su nodo con
  su nivel efectivo (y el `pct` de una celda con `secundario`); el total y lo `aparte` tienen `ver: todos`; lo que no se dibuja entra
  como `{ver: todos, editar: null}`. Lo que no figura no viaja, salvo a quien configura.
- **Tonos** (`tonos`: clave, nombre, fondo/borde/tinta en claro y oscuro): sólo por `tono_crear|guardar|eliminar`
  (`cotizaciones.configurar`); hasta **24**. **El AA se valida en la base** (tinta sobre fondo ≥ 4,5:1); el texto sobre un tono va en
  su **tinta**. Un tono o un nivel que alguna versión nombra no se elimina (23503).
- **La fórmula sólo la lee quien la configura** (`cotizaciones.configurar` del origen), y `formula_auditar()` no copia `definicion`,
  `params`, `diseno` ni `visibilidad` a `actividad`. Semilla: `subasta_usa`, `planilla_usa`, `oficina` (`supabase/semillas/`).

### Versiones (4.20-1)

- **Una serie por origen:** a lo sumo un borrador y una publicada; publicar archiva la publicada. Publicar el borrador, el ⚙ y revertir
  toman primero el candado del origen (`pg_advisory_xact_lock(hashtextextended('formulas:' || origen, 0))`) y recién después leen la
  publicada: van en serie y el segundo compara con su esperada.
- **Versión de origen** (`formulas.version_origen_id`): un borrador recuerda la publicada sobre la que se empezó
  (`formula_guardar_borrador()` la escribe al crearlo; pisarlo no la cambia). Publicarlo cuando ya no es la publicada da PT409
  «Después de que empezaste este borrador, Ana publicó la versión 3 hace 2 min.» y nada cambia. Nula = no había publicada o la fila se
  escribió fuera de las RPC: no se compara. En una publicada o archivada es la publicada que reemplazó.
- **El ⚙** (`formula_cambiar_constante(origen, nodo, valor, publicada_esperada?)`, `cotizaciones.configurar`): publica la N+1 desde la
  publicada (su definición y su diseño, los `params` con el valor nuevo, un nivel retirado no lo frena) como fila nueva, **sin crear ni
  tocar el borrador**. Con esperada nula vale la publicada que lee al entrar; el mismo valor da 22023 (hint `valor`).
- **Revertir** (`formula_revertir(origen, versión, nota, publicada_esperada)`, `cotizaciones.configurar`, sin defaults): publica la N+1
  como copia de una versión **archivada**, con su definición, sus params y su **diseño** (4-8), sin tocar el borrador. Rechaza la
  publicada, un borrador, una versión de otro origen o que no existe (el mismo texto para las dos) y la esperada nula (22023); un nivel
  retirado en el diseño elegido da 22023 `nivel_retirado`, como publicar un borrador (P7). `actividad` registra `formula.publicada` con
  `copia_de` y `version_copiada`.
- **El conflicto dice quién, cuál y cuándo** (`_version_publicada_por()`), sin «Recarga». Primero el sujeto: quien llama
  («Publicaste…»), otra persona con nombre («Ana publicó…») o sin quién o sin nombre («Otra persona publicó…»); el «hace…» se quita si
  la publicada no tiene `publicado_en`. Una esperada en un origen sin publicada: «La versión que tenías ya no es la publicada, y el
  origen no tiene otra.». Estos PT409 se muestran tal cual (sólo nombran a una persona, una versión y cuándo).
- **Dónde se ven** (4.20-2a): la pestaña «Fórmula» de Configuración › Cotización lee la publicada, el borrador (atrasado si su versión de origen ya no es la publicada) y las versiones por cursor, por PostgREST y sin lo oculto (`docs/UX.md` › «Cotización: fórmula (estados propios)»). Desde ahí se publica el borrador con nota y se revierte a una archivada (4.20-2b), por `formula_publicar()` y `formula_revertir()` con la publicada que se leyó; sus PT409 se muestran tal cual. Descartar el borrador: 4.20-2c.
- **La versión esperada del borrador (4.21-2, 4-8):** guardar, descartar y publicar el borrador toman el mismo candado del origen,
  después del permiso (42501 antes de cualquier PT409) y, en guardar, de la validación. `formula_guardar_borrador(…, nota,
publicada_esperada?, actualizado_en_esperado?)` **sin hora crea**: si ya hay borrador, PT409 «Ya hay un borrador: lo empezó Ana y se
  guardó hace 2 min.» («lo empezaste tú», «lo empezó otra persona»); si la publicada esperada ya no es la publicada, PT409 «Mientras
  editabas, Ana publicó la versión 4 hace 2 min.». **Con hora pisa** sólo si es la del borrador (la publicada no se compara: publicarlo
  atrasado da su PT409) y devuelve `{id, actualizado_en}` de la fila escrita, con el que se vuelve a guardar sin releer.
  `formula_descartar_borrador(origen, actualizado_en_esperado?)` y `formula_publicar(…, publicada_esperada?, actualizado_en_esperado?)`
  con hora: si cambió, PT409 «El borrador cambió después de que lo abriste: se guardó de nuevo hace 2 min.»; si ya no está, «El borrador
  que abriste ya no está: se publicó o se descartó.» (publicar mira primero la publicada esperada). Sin hora, como antes (descartar el
  que haya; publicar el que haya o «No hay borrador»): la app manda siempre las esperadas desde el 4.21-3b-1 (guardar, publicar y
  descartar) y la base sigue aceptando la nula (P3 del 4.21-3b). Una excepción a `migraciones.md`, aprobada (P1).
- **Pendiente:** las carreras mixtas (⚙ contra publicar el borrador, revertir contra ⚙, dos que crean el primer borrador a la vez) las
  suma el carril A.

## Niveles de acceso (D7, H3 y H4)

- **Un nivel** es una fila de `cotizaciones_niveles` (sembrada con «todos» y «costos»). Cada uno, salvo «todos», genera dos permisos por
  origen, `cotizaciones.nivel.<clave>.ver` y `….editar`, en la matriz de Roles. «Todos» usa `cotizaciones.ver` y
  `cotizaciones.crear`/`cotizaciones.editar`. Historia: `docs/DECISIONES.md`, «D7». Al publicar, el diseño se compila a
  `formulas.visibilidad`, lo único que lee la base.
- **Lo que no se ve no viaja** (detalle en «En la base (4.10-1)»): la tarjeta y el PDF (4.18) leen lo que dibujan con
  `cotizacion_tarjeta` (sólo lo del nivel «todos», «La lectura de la tarjeta (4.18-1)») y los montos con `cotizacion_leer`, y `validar_plantilla` rechaza un
  nodo que no sea del nivel «todos». Un inventario (`cotizaciones-visibilidad.sql`) registra toda
  función que pueda devolver esas columnas o `formulas.*`.
- **Límite:** un nodo restringido, único oculto de una suma visible, se deduce restando; el editor del diseño lo avisa.
- **Pantalla:** `/configuracion/cotizacion?seccion=niveles` (`docs/UX.md`). `niveles_con_uso()` devuelve `{tope, niveles}` con
  banderas `se_renombra`, `se_retira`, `se_elimina` y `motivo_de_uso`: la UI no razona por nombre ni clave. En TS los permisos de un
  nivel se reconocen por su forma (`esClaveDeNivel()`), no están en `CLAVES_PERMISO`.

### En la base (4.09-1)

- **La tabla** `cotizaciones_niveles (id, clave, nombre, retirado_en, …)`. La clave sale del nombre y no cambia; **no se desambigua**
  (clave existente, viva o retirada: 23505). **Tope: 10 niveles** con «todos» y los retirados. Se escribe sólo por RPC.
- **Los permisos** `cotizaciones.nivel.<clave>.ver|editar` (`permisos.nivel_clave`, `por_origen`, `aplicado_en` = `_nodos_visibles`)
  nacen con el nivel, concedidos al rol `dueno`; los ata un check (`permisos_nivel_check`), una FK `on delete restrict` y un trigger
  diferido (`trg_nivel_con_permisos`).
- **RPC** (`equipo.roles.gestionar`; `search_path` vacío): `nivel_crear(p_id, p_nombre)` (idempotente por id), `nivel_renombrar`,
  `nivel_retirar` (deja de ofrecerse; permisos y usos siguen), `nivel_restaurar`, `nivel_eliminar` (`for update` **antes** de mirar el
  uso; con uso, 23503 `nivel_en_uso`); los de cambio llevan `p_actualizado_en_esperado`. Publicar toma `for key share` los niveles del
  diseño. **Invariante:** ninguna versión publicada o archivada nombra un nivel que no existe.
- **`_nodos_visibles(formula_id)`** → `(nodo, editar)` (de nadie): **un nivel sólo estrecha.** Se ve un nodo de `ver: todos` con
  `cotizaciones.ver` del origen, y uno de `ver: X` con `cotizaciones.ver` **y** `cotizaciones.nivel.X.ver`; se edita lo que se ve con
  `cotizaciones.crear`/`cotizaciones.editar` y, si `editar` no es «todos», `cotizaciones.nivel.Y.editar` (`editar` nulo no se edita).
  Lo que la visibilidad no nombra sólo llega a `cotizaciones.configurar`, sin editar. Usa los permisos **reales** (`mis_permisos()`):
  «Ver como» no cambia lo que decide la base.

### En la base (4.10-1)

La lectura de una cotización: lo que quien llama no ve no viaja (`supabase/tests/cotizaciones-visibilidad.sql`).

- **Ninguna lectura directa del snapshot:** `authenticated` y `anon` no leen `cotizaciones.valores|fuentes|totales|tipos_cambio` ni
  `cotizaciones_revisiones.diff` (grant de columnas; una columna nueva nace sin grant); `total_base`, `modo_tc`, `ver_total_bs`, `titulo`… sí.
  `cotizacion_auditar()` quita esas columnas de `actividad`.
- **El recorte** (`_cotizacion_contexto`, `_cotizacion_recorte`): `valores`, `estados`, `fuentes`: los nodos de `_nodos_visibles` y
  siempre el total y lo `aparte`. `totales`: `bs`, `usd`, `suma_usd` siempre; un grupo sólo si se ven **todos** sus nodos, y su `bs` sólo
  si ningún tipo de cambio de la fórmula está restringido por un nivel que quien lee no tiene. `tipos_cambio`: todos salvo los de un
  nodo restringido. `faltantes`: los de nodos visibles, `total` o un grupo que viaja; las demás sólo marcan `hay_faltantes_ocultos`.
- **`cotizacion_leer(id)`**: `puede_cotizacion(id, 'cotizaciones.ver')` (inexistente, en la papelera o no vista dan el mismo 42501),
  `_nodos_visibles` de SU versión y el recorte.
- **`cotizacion_evaluar`** devuelve lo recortado y **no es un oráculo:** un `input` o `bandera` oculta da el mismo error que uno
  inexistente; un override de un nodo oculto vuelve como `nodo_inexistente`. Quien no configura el origen sólo elige uno de los
  `cabecera.modos` de esa versión.
- **`cotizacion_revisiones(cotización, antes?, tamaño?, hasta?)`:** página por cursor (`hasta`, un instante exclusivo, la empieza en la más nueva de esa cotización con `creado_en < hasta`, por `cotizaciones_revisiones_cotizacion_creado_idx`; sin ninguna, va vacía; la guarda va primero; 4.17-5a), con cada `diff` recortado; cada fila con su `autor` (`{id, nombre}`) y la página con las `etiquetas` de los nodos y grupos que nombran sus diffs ya recortados (4.15-2). **`formula_para_cotizar(
origen)`** y la lectura de `formulas`: sólo con `cotizaciones.configurar`. **`cotizacion_tabla(clave, cotización | origen, abierta?)`:** sólo
  las columnas que leen los nodos que quien llama ve, de SU versión: la de la cotización, la de la hoja abierta o la publicada (4.13-4c1).

### Quién escribe una cotización y cómo (4.10-2)

**Nadie escribe `cotizaciones` ni `cotizaciones_revisiones` con `insert`, `update` o `delete`:** `authenticated`, `anon` y PUBLIC no
tienen privilegio de escritura y no hay policies de crear ni editar. Escriben, con `security definer`: `cotizacion_crear()`,
`cotizacion_guardar()`, `cotizacion_marcar_final()`, `cotizacion_moderar()`, la papelera y los triggers `cotizacion_revision()` (la única
escritura de `cotizaciones_revisiones`), `cotizacion_contadores()` y `cotizacion_auditar()`.

**`cotizacion_crear(id, origen, lead, entradas, abierta, vehículo?, vehículo_nuevo?, modo_tc?, clase = 'preventa', con_la_abierta =
false, ver_total_bs = false)`** calcula en la base sobre la fórmula publicada del origen y devuelve `{cotizacion, valores, fuentes, totales,
tipos_cambio,
repetido}`, recortado por `_cotizacion_respuesta()` (el recorte de `cotizacion_leer()`). En este orden:

1. `cotizaciones.crear` **del origen de la cotización** antes de mirar nada; con una final, además `cotizaciones.final.gestionar`.
2. **El intento** (`p_id`, lo manda el cliente): un candado consultivo por id ordena dos llamadas a la vez; si el id existe y es **mío,
   de este origen y de una cotización viva**, se devuelve con `repetido: true`; un id ajeno no se mira (42501 en el `insert`, para no
   servir de sonda).
3. **El lead es obligatorio** (D3) y tiene que verlo quien llama (`leads.ver`); se bloquea con `for key share`. Una final pide además el lead en la cartera
   con `leads.editar` y lo toma `for no key update` (4.25-1b).
4. **El vehículo:** obligatorio si `ajustes_empresa.vehiculo_obligatorio_al_cotizar` (sí por defecto) y siempre en una final. «Cargar a
   mano» (`p_vehiculo_nuevo`) llama a `vehiculo_crear()` en la misma transacción. Uno que quien llama no ve: 42501.
5. **La fórmula** publicada, `for share` (publicar espera a las altas en curso; si publicaron, se relee: tres vueltas y PT409).
6. **El modo** (`p_modo_tc`): nulo o la `clave` de un modo de esa versión (`modo_invalido`). Y **«Ver total Bs»** (`p_ver_total_bs`,
   4.13-4b1): `_cotizacion_ver_total_bs()` rechaza (22023) un nulo (`ver_total_bs_falta`) y un verdadero que `diseno.cabecera.ver_total_bs` de la
   versión que se usa no ofrece (`ver_total_bs_no_ofrecido`); con «Guardar con la N» vale la versión abierta.
7. **Lo tipeado**, con `_cotizacion_tipeado()` (de nadie; el mismo chequeo que el motor, compartido por evaluar, crear y guardar): un
   valor para un nodo que se ve y no se edita → 42501 `nodo_no_editable`; un override de un nodo oculto o inexistente →
   `nodo_inexistente`; sin variante y sin `por_defecto`, `variante_sin_eleccion`.
8. **El cálculo.** Un override que el motor descarta en un nodo visible se rechaza (22023). Se guardan `valores` y `fuentes`
   **enteros** (los nodos que quien llama no ve, y los que no mandó, con el valor de la fórmula), `totales`, `modo_tc` y `tipos_cambio`
   (las tarifas de la empresa que usó). **`total_base` es el total en la moneda base de la empresa** (`USD` o `BOB`, otra → 22023; sin
   valor, `total_sin_valor`; si no cabe en `numeric(18,2)`, `fuera_de_rango`).
9. **El `insert`:** el índice único `cotizaciones_final_por_vehiculo` da 23505. Una final mira lo de marcar (P2–P4), rechaza otra final activa con 23505
   antes del cálculo y, tras el `insert`, aplica `_final_aplicar`: vincula el vehículo, manda las preventas a un lote y pasa el lead a cliente (4.25-1b).

Candados: intento, lead, vehículo, fórmula; una final, el lead `for no key update` y, después del cálculo, las vivas del vehículo. **D2** vive en `cotizacion_crear()`: «Cómo se guarda (4.10-3)».

### Cómo se guarda (4.10-3)

**`cotizacion_guardar(id, intento, actualizado_en_esperado, entradas, modo_tc, titulo, notas, vehículo, ver_total_bs)`** es la única
edición: calcula en
la base con SU versión de la fórmula (nunca la publicada de hoy) y SUS tipos de cambio congelados, conserva lo que quien guarda no ve ni
edita, y devuelve lo mismo que crear. Recibe el **estado entero de lo que la persona edita** (`modo_tc`, `titulo`, `notas`, `vehículo` y
`ver_total_bs`
sin valor por omisión: nulo es un valor, salvo en `ver_total_bs`, donde nulo es `ver_total_bs_falta`); lo que no manda en `entradas` queda
sin tipear (↺). Se edita `modo_tc` (clave de un modo de
SU versión, o nulo), `ver_total_bs` (verdadero sólo si el diseño de SU versión lo ofrece; también en una final), `titulo` (hasta 120),
`notas` (hasta 2.000) y `vehiculo_id` (poner o **cambiar**, no se quita, **una final no lo
cambia**). No se editan `tipos_cambio` (se congelan al crear), `clase`, `lead_id`, `plantilla_id` ni `moneda_mostrar`.

**En este orden** (cada error igual para lo que no existe y para lo que no se ve): (1) **permiso** (`_cotizacion_puede_guardar()`, antes y
después del candado): una preventa pide `cotizaciones.ver` **y** `cotizaciones.editar` (`puede_cotizacion`, por su alcance); una **final**, `cotizaciones.ver` y
`cotizaciones.final.gestionar` del origen; inexistente, en la papelera o no vista: 42501, antes del vehículo, del candado, del intento y de la versión (4.15-1); (2) candados, **intento**, **versión** y validación de título, notas, vehículo y modo; (3) **ARMAR con SU versión**
(`_cotizacion_armar`), `_cotizacion_tipeado()` y `_cotizacion_conservar()`; (4) `evaluar_formula()` y `_cotizacion_guardable()`: un
override **mandado** que el motor descarta, o un total sin valor o que no cabe, se rechaza (22023); (5) si nada cambió, no escribe.

**Lo que se conserva y lo que se recalcula (D7).** Lo que quien llama no edita (nodo que no ve, o ve y no edita) se **reconstruye de
`valores` y `fuentes`** guardados (`_cotizacion_entradas_de()`) antes del motor: lo oculto se conserva byte a byte; un valor mandado
para un nodo que se ve y no se edita, distinto de lo guardado, es 42501 `nodo_no_editable`. Lo derivado (fuente `sugerido`/`default`,
el `pct` pisado, nodos apagados) se recalcula: **límite aceptado**, lo oculto que se deriva de lo visible cambia con lo visible.

**El intento.** `p_intento` es un uuid que genera el cliente por cada guardado; vive en la revisión (`cotizaciones_revisiones.intento`
con la `huella`). Repetirlo, de la misma persona y con los mismos datos, devuelve lo guardado con `repetido: true` y **no cae en
PT409**; el mismo intento con otros datos u otra persona es 22023 `intento_reusado`. **Ni `intento` ni `huella` se leen.**

**La versión.** `cotizaciones.actualizado_en` la sella `cotizacion_version()` y **no se mueve con los contadores de favoritos y
reportes**. Vieja: `_conflicto_de_edicion()` (PT409 diciendo quién y cuándo). La revisión (`cotizacion_revision()`) guarda **sólo los
nodos que cambiaron** (`{de, a}`) en `valores` y `fuentes`, y en `totales` **sólo las claves que cambiaron**, con cada grupo de `grupos` entero si
cambió (4.15-1). Al leerla, `_cotizacion_diff_recortado()` recorta los dos lados y saca el grupo que quedó igual y un `grupos` vacío: un grupo
visible cuyo único cambio es su Bs oculto, o un grupo oculto que se movió, no se delata.

**D2, «desactualizada», en el alta.** Aplica a guardar una cotización **nueva** (editar una vieja no avisa): vive en
`cotizacion_crear()`, que recibe la hoja abierta (`p_abierta`: «La hoja abierta (4.13-3a)»). Si la versión publicada de hoy es otra (se compara **por id**) o
una tarifa que la fórmula nombra cambió (`tipos_cambio_historial`): **PT409, `detail desactualizada`, `hint formula` o `tipo_cambio`**,
sin guardar. **«Guardar con la N»** es `p_con_la_abierta := true`: se crea con la versión de la apertura y las tarifas de entonces, sólo
si la hoja se abrió hace menos de 24 h y, si esa versión ya no es la publicada, dejó de serlo hace menos de 24 h. El intento repetido
vuelve antes que D2.

**Candados.** Guardar toma **el vehículo actual y el nuevo (sólo si cambia), `for key share`, en orden de id, y después la cotización
`for no key update`**; ni el lead ni la fórmula (`formulas` es append-only).

### La lectura que abre la hoja (4.13-1)

**`cotizacion_hoja(origen)`** es UNA lectura al abrir la pantalla de cotizar: el diseño publicado **recortado al nivel de quien mira** y
lo que la hoja necesita para dibujarse. No lee `cotizaciones` ni el snapshot. **Orden:** `assert_permiso('cotizaciones.crear', origen)` **antes de mirar nada**; sin versión publicada, `{estado:
'sin_publicar', origen, puede_configurar}`; con ella, `{estado: 'lista', formula: {id, version}, abierta_en, abierta,
vehiculo_obligatorio, cabecera, secciones, tarjeta_total, tonos}`. La `cabecera` es `{modos, ver_total_bs, moneda_bs}`.

- **`cabecera.moneda_bs` (4.13-4b2):** la `moneda_a` del tipo de cambio **activo** que nombra el `total_en` de esa versión (una fila por `tipos_cambio_clave_key`); JSON `null`, con la clave
  presente, si la versión no tiene `total_en` o ese tipo de cambio no existe o está inactivo. Viaja a todos, sin recorte por nivel (el total en Bs ya viaja siempre y `authenticated` lee
  `tipos_cambio`), y nunca el id ni la clave del nodo o del tipo de cambio. **Nula no quiere decir sin Bs:** el motor calcula el Bs con el tipo de cambio de cada bucket y usa `total_en`
  sólo para dividir y sacar los dólares (`oficina` no tiene `total_en` y su `totales.bs` sí tiene valor); la hoja, con ese hueco (P6, 4.13-4b3), no dibuja «Ver total Bs» y guarda `ver_total_bs` en falso.

- Un ítem viaja si su nodo es visible (su `pct`, en un par); una sección, si le queda algún ítem. **Nunca viaja:** `de`, `texto`,
  `match` (salvo `dato_del_vehiculo`, abajo), `sobre`, `sugerido_de`, `descripcion`, los grupos, ni los `buckets` y `total_en` de un modo.
- **`dato_del_vehiculo` (4.14-2c2):** la celda de un nodo `tabla` que se ve lleva `{tabla, columnas: [{columna, campo}]}`, qué columna de su tabla casa con qué dato del vehículo,
  si alguna entrada de su `match` lo nombra; si no, no trae la clave. Cuenta una entrada cuyo valor **no es el id de ningún nodo** (aunque coincida con la clave de un campo: el
  motor lee el nodo) y es `anio`, `marca`, `modelo`, `kilometraje`, `precio` o un campo **activo** del origen de la hoja; un `campo_vehiculo` no cuenta. La tabla, congelada en la
  versión o viva y activa (la regla de la ayuda). `columnas` va por `columna` con `collate "C"`. La regla es la misma para todos; lo arma `_hoja_datos_del_vehiculo()` (invoker,
  de nadie) una vez por lectura. **El contrato son las filas:** `cotizacion_tabla()` con la hoja abierta las da y cada una trae la `columna`; `columnas` puede venir vacío (congelada
  sin viva activa) y `filas` también (una tabla vacía: el motor da `tabla_sin_filas`, y la pantalla lo dice).
- **Una celda** lleva `nodo`, `etiqueta`, `tipo_nodo`, `formato`, `ancho`, `tono`, `editable`, `motivo`, `ajustes`, `ayuda`, `dato_del_vehiculo`, `solo_en` y
  `condicion`/`requerido_si` **sólo si su bandera se ve**. **`editable`:** `editar` de `_nodos_visibles()` **y** que el nodo acepte un
  valor. **`motivo`** (lo que no se edita): `se_calcula`, `del_vehiculo`, `nivel` (con el **nombre** del nivel que falta) o
  `no_se_edita`. **`ajustes` (⚙):** una constante con `cotizaciones.configurar` del origen, o un tipo de cambio con
  `empresa.tipos_cambio.gestionar`.
- **El modo por clave:** la hoja recibe los modos sin sus `buckets`; `cotizacion_evaluar(…, modo, modo_tc)` acepta **`p_modo_tc`**, la
  clave de un modo de esa versión (`_cotizacion_modo()`; ajena: `modo_invalido`). `p_modo` (objeto) sigue para el editor.

### La hoja abierta (4.13-3a)

`cotizacion_hoja()` devuelve `abierta`: `<fórmula>.<µs desde 1970>.<HMAC-SHA256 en hex>`, que cubre la persona, el origen, la versión
y la hora de apertura (clave en Vault, `cotizacion:abierta`). Para la pantalla es un texto opaco que devuelve en cada recálculo y
guardado. Inválida (nula, mal formada, de otra persona u origen, firma mala): 22023 `abierta_invalida`, siempre el mismo texto.

- **`cotizacion_crear`:** la lee después del intento. Si su versión no es la publicada: PT409 `desactualizada`, o con
  `p_con_la_abierta` la valida y la toma `for share`; con `p_con_la_abierta` el tope de 24 h corre **siempre**.
- **`cotizacion_evaluar` (por origen):** calcula con **la versión y las tarifas de la abierta**. Si ya no se puede usar,
  `abierta_vencida` y la hoja pide «Recargar» (de otro origen, borrador o inexistente: `abierta_no_disponible`).
- **`cotizacion_tabla` (por origen, 4.13-4c1):** la tabla de una ayuda sale de **la versión de la abierta** (su definición, su copia congelada y lo
  que deja ver); los mismos errores que el recálculo y `llamada_invalida` con una cotización. La resuelve `_cotizacion_tabla_version()` (de nadie).
- **Cotizar pide `cotizaciones.crear` y `cotizaciones.ver` del origen** en `cotizacion_hoja`, `cotizacion_evaluar` y `cotizacion_tabla` por origen y
  `cotizacion_crear`; guardar (`cotizacion_guardar`) pide `cotizaciones.ver` y `cotizaciones.editar` (4.15-1).

### La hoja de una guardada y cotizar encima (4.15-2)

`cotizacion_hoja_guardada(p_id)` abre una cotización guardada para quien **la ve** (lo que no existe, está en la papelera o no se ve: el 42501 de
`cotizacion_leer`; antes, `assert_activo()`). Devuelve:

- la fila y el snapshot recortados (`_cotizacion_respuesta`, como `cotizacion_leer`) y el diseño de **SU versión** (`_cotizacion_hoja`, como la hoja nueva);
- `puede_guardar` = `_cotizacion_puede_guardar()` (el ayudante de guardar): sin él, **ninguna** celda es editable y el motivo no es un nivel
  (`no_se_edita`); con él, se edita lo que `_nodos_visibles()` deja, como en `cotizacion_guardar`. Quien sólo ve abre el diseño en sólo lectura;
- `publicada: {id, version}` (la de hoy del origen, o nula), `vence_el` y `vencida`: el día de `creado_en` en la zona de la empresa +
  `ajustes_empresa.vigencia_dias`, vencida si ese día ya pasó (por día, no por hora);
- `anterior: {id, numero, version}` si se ve; `encima`, la versión nueva viva: `{id, numero, version}` si se ve, `{"oculta": true}` si no (P11);
- `puede_cotizar_encima`: `cotizaciones.crear` del origen, ve su lead, ve su vehículo (o no lleva y no es obligatorio), sin versión nueva viva y con publicada.

`cotizacion_encima(p_id, p_anterior)` (P1–P6, P9 y P10 del 4.15) crea **en el acto** la versión nueva: otra cotización, preventa (también encima de una final), con
`cotizacion_padre_id` = la anterior, `version` + 1, su propio número, el lead y el vehículo de la anterior, quien llama como `creado_por`, la publicada y las tarifas de
hoy. La anterior no cambia. **Una viva por anterior** (`cotizaciones_encima_unica`, parcial: una en la papelera no cuenta). Sin `p_abierta` (no sale de una hoja vista).

- **El orden y los errores:** `assert_activo`; ver la anterior (lo que no existe, está en la papelera o no se ve: el 42501 de `cotizacion_leer`, antes que todo lo
  demás); `cotizaciones.crear` y `ver` del origen; su lead (nulo: 22023 `lead`; no visible: 42501); el intento (el candado de `cotizacion_crear`: repetido devuelve la
  misma; mío con otra anterior: 22023 `intento_reusado`); la anterior `for share` y otra vez visible; ya tiene una nueva viva: PT409 `ya_tiene_encima` (el id en el hint
  sólo a quien la ve, P11); el lead `for key share`, el vehículo (o 22023 `vehiculo` si es obligatorio); la publicada `for share`; el total (22023 `total_sin_valor`: no se crea).
- **Lo que se lleva** (`_cotizacion_lo_que_se_lleva`): lo tipeado de cada nodo que sigue en la versión de hoy con un tipo que lo acepta, **también lo que quien llama no
  ve** (se guarda y no se le devuelve); la variante sólo si es opción de hoy; el modo si sigue (si no, el primero de hoy); «Ver total Bs» si hoy se ofrece; título y notas.
- **`descartados`** (`_cotizacion_descartados`): cuántas entradas tipeadas de la anterior que quien llama **ve** no llegan (no siguen, no se aceptan, la variante, un
  override que el motor descarta). Lo oculto que se pierde no se cuenta.

**La pantalla (4.15-3a), `/cotizaciones/[id]`.** La hoja calcula por su origen (la nueva) o por su cotización (`DeDondeCalcula`): la guardada manda `p_entradas`, `p_cotizacion`
y `p_modo_tc`, nunca `p_origen` ni `p_abierta`. Abre con lo guardado como sus entradas (`entradasDeLoGuardado`, el espejo de `_cotizacion_entradas_de`: lo tipeado y los
overrides, sin el porcentaje de un par pisado) y con **una** llamada a `cotizacion_hoja_guardada` y otra a `cotizacion_evaluar(p_cotizacion)`. El recálculo usa las tablas de
referencia **vivas** y los datos de hoy del vehículo: si no da lo guardado (sus valores o su total, `difiereAlAbrir`), la pantalla lo avisa, muestra «Total guardado» con `<Monto>`
y «Guardar» la deja con lo de hoy. «Guardar» llama a `cotizacion_guardar` con la versión que vio quien edita (`actualizadoEn` como el texto de la base, nunca por `Date`, que
pierde los microsegundos), las entradas del recálculo al día y el título, las notas y el vehículo de la cotización sin tocarlos; lo que la hoja no manda lo conserva la base. El PT409
dice quién y cuándo; «Recargar» vuelve a montar la hoja con la lectura nueva y lo tipeado no vuelve sobre la versión de la otra persona.

### Marcar final (4.25-1)

**`cotizacion_marcar_final(id)`** elige la final del vehículo (a lo sumo una activa, `cotizaciones_final_por_vehiculo`). En este orden:

1. **Sin candado:** la cotización viva y visible (si no, 42501 «No tienes acceso a esta cotización.», igual para inexistente o en la papelera),
   `cotizaciones.final.gestionar` del origen, el vehículo, el lead (vivo; en la papelera, 23514), el lead en la cartera con `leads.editar` (como vincular),
   y que quien marca pueda mandar a la papelera todas las demás vivas del vehículo (si no, 42501 «Este vehículo tiene preventas que no puedes mandar…»).
2. **Candados:** el lead `for no key update`, el vehículo `for key share` y, en una sola pasada por id, la cotización y todas las vivas del vehículo. El
   vehículo se escribe recién con todo tomado. Es el orden de vincular (lead → vehículo) y de la papelera de vehículos (vehículo → cotizaciones), y convive con
   el trigger `trg_vehiculo_cotizado` de crear, encima y guardar. La tabla de quién choca con quién está en `docs/pasos/4.25/decisiones.md`.
3. **Si algo cambió mientras esperaba** (la fila ya no está viva, otro vehículo u otro lead), otra vuelta desde el paso 1; a la tercera, PT409. Con todo tomado
   vuelve a mirar el lead, ver, las demás y el vínculo, releído después de la pasada: un vehículo de otro lead da 23514.
4. **Los efectos** (`_final_aplicar`): la final anterior tomada baja a preventa, la cotización pasa a final, las preventas tomadas van a un lote de la papelera de
   quien marca, el vehículo sin lead queda con el de la cotización, el lead pasa al primer tipo activo de la clase cliente (por orden y nombre) si no era de esa
   clase, y la actividad `cotizacion.final`. Marcar otra vez no falla ni cambia nada.

Una final activa ancla el vehículo en la limpieza automática (`'cotizacion_final'`) y su vínculo no cambia (`vehiculo_vincular`: 23514).

### Crear una final (4.25-1b)

`cotizacion_crear(…, p_clase := 'final')` deja el estado de marcarla (cierra 4-17). Sin candado mira la final sin vehículo (22023), el lead en la cartera con
`leads.editar`, que vea el vehículo y, en `_final_crear_mirar` (de nadie, sin candados), otra final activa (23505: se rechaza, no se reemplaza como al marcar;
P7 a), las preventas que no puede mandar a la papelera (42501) y el vínculo de otro lead (23514). Toma el lead `for no key update`, el vehículo `for key
share`, la fórmula y, después del cálculo, las vivas del vehículo en una pasada por id; con todo tomado vuelve a mirar la cartera y la ayudante (el vínculo, en una
sentencia nueva). Inserta y aplica `_final_aplicar`. No hay otra vuelta: lo que crear toma son sus parámetros. La preventa no cambia.

## Lo que se guarda en una cotización

`formula_id` (recalcular o editar usa **esa** versión, nunca la vigente); `valores` (`{nodo_id: número | null}` de TODOS los nodos; el
`opcion` guarda su clave; un nodo fuera de variante o apagado guarda 0); `fuentes` (`{nodo_id: default|sugerido|override|input}`);
`tipos_cambio` (`{clave: valor}` congelados); `totales` (por moneda y por grupo). **Nada se lee directo** (salen por `cotizacion_leer()`,
recortados por el nivel; `total_base`,
`modo_tc` y `ver_total_bs` sí son legibles) **ni se escribe directo**: se crea con `cotizacion_crear()` y se edita con `cotizacion_guardar()`.

## Binding con la XCell

Cada `input`, `constante`, `tipo_cambio` y nodo `sobrescribible` es una `XCell` (el par es una sola): `value` sale de `valores[id]`,
`suggested` de `fuentes[id] === 'sugerido'`, `overridden` de `'override'`, `disabledReason` si su `condicion` está apagada o es de otra
variante, y `hasSettings`/`onSettings(id)` (⚙) si es `constante` y hay `cotizaciones.configurar` del origen
(→ `formula_cambiar_constante`), o si es `tipo_cambio` y hay `empresa.tipos_cambio.gestionar` (→ `tipo_cambio_guardar`). El ⚙ cambia
el default global (versión N+1); «Aplicar también a esta cotización» es el único puente hacia la cotización abierta.

**La `XCell`** (`src/shared/ui/xcell/CLAUDE.md`): el par es **una celda con dos lados editables** (`onCommit(suId, valor)`; ↺ emite
`onReset(id)`) y **la hoja traduce** (editar el % quita el override del monto; ↺ quita los dos). **La celda no valida rango, obligatorio
ni entero: lo dice la base en `faltantes`** y la hoja lo pasa por `error`. **La celda no decide permisos ni abre nada:** la hoja calcula
las banderas, pasa **los mismos callbacks a todas las celdas** y decide qué abrir. Una parada de `Tab` por valor; ayuda, ⚙ y ↺ se
alcanzan con `→` (**las flechas son de la celda**).

Lo dibuja el 4.15-3b en `/cotizaciones/[id]`: «Revisiones» (`cotizacion_revisiones` desde el navegador, de a 20 por cursor), la cadena (`anterior` y `encima`) y el aviso de versión con «Cotizar encima» (`cotizacion_encima`, con un intento que sólo se conserva tras una pérdida). El botón sale con `puede_cotizar_encima`, no con `puede()`; con cambios sin guardar espera, porque la nueva lleva lo guardado.

### La hoja dibujada y el recálculo (4.13-2)

`/cotizaciones/nuevo?origen=&lead=&vehiculo=`. **Una lectura y un cálculo al abrir, en el
servidor, en serie** (`cotizacion_hoja` y después `cotizacion_evaluar` con entradas vacías y su hoja abierta); el navegador no pide
nada al abrir. Después, **un pedido por pausa, desde el navegador** (`infra/recalculo.client.ts`). Tope de nodos del DOM de la hoja más
grande: **460** (`docs/RENDIMIENTO.md`).

- **La cola (`useRecalculo()`):** cada confirmación (la `XCell` no emite por tecla) reinicia una espera de 150 ms; al vencer sale UN
  pedido; con uno en vuelo queda uno pendiente con lo más nuevo. La respuesta sólo se aplica si nadie confirmó nada después. Una regla
  rota (22023, `abierta_vencida`), la sesión vencida o un permiso que se fue piden «Recargar», no «Reintentar». **El mensaje de la base
  nunca llega a la pantalla.**
- **Props (`entities/binding.ts`):** `value` es lo tipeado y pendiente, si no `valores[id]` de la última respuesta; `disabledReason`
  sale primero de los `estados` del recálculo y después del `motivo` de la lectura. **Entradas (`entities/entradas.ts`):** un `input`
  va a `inputs`; constante, tipo de cambio o sobrescribible, a `overrides`; **el porcentaje de un par quita el override del monto**.
- **Lo que se dibuja de una celda apagada sale de `estados` del recálculo, nunca de la lectura** (que quita `condicion` y
  `requerido_si` si su bandera no se ve): quien no ve la bandera no puede mandarla, así que la celda vuelve `condicion_apagada` con 0 y
  la hoja dice «Está apagada en esta hoja.» sin nombrar nada ni esconderla.

### Guardar desde la hoja (4.13-3b)

`Ctrl/Cmd+S` o «Guardar» → Server Action `crear-cotizacion.ts` → `cotizacion_crear`; siempre preventa, con **la misma hoja abierta que
el recálculo**. **El intento (4-21):** un uuid por guardado, pendiente en la pestaña; se suelta con toda respuesta con SQLSTATE y se
conserva sin red o con respuesta ilegible. Con el total nulo, «Guardar» se apaga con su motivo. **Rechazos:** se leen de código,
`details` y `hint` (`entities/guardado.ts`) con textos propios, nunca el mensaje de la base; D2 va en línea («Guardar con la versión
N» reenvía con `p_con_la_abierta`).

## Plantilla de tarjeta (PDF)

Filas por grupo con el tono del grupo (o el que la plantilla elija del catálogo), título de la opción de la variante y la garantía
condicionada a su interruptor; sólo nodos del nivel «todos». PDF en servidor con `@react-pdf/renderer` (4.18-3).

**La forma (4.18-1), declarativa como el diseño (D7):** `plantillas_tarjeta.definicion` = `{grupos: [{grupo, tono?}], etiquetas?, leyendas?,
total: {etiqueta, leyenda?}, nota?, logo, columnas: {leyenda, tipo_cambio, plazo}}`, estricta y de hasta 32 KB: hasta 20 grupos (cada `grupo` y `tono`
con la forma de un id), etiquetas (1 a 60 caracteres) y leyendas (0 a 160; vacía = sin leyenda) por id de nodo, hasta 200 de cada una; la etiqueta del
total de 1 a 40, su leyenda y la nota hasta 160 y 300. Los textos se cuentan en caracteres. Sin hex, CSS ni plantillas de texto `{{…}}`.

**`validar_plantilla(plantilla, def, diseno, visibilidad, tonos)`:** STABLE, invocadora, `search_path` vacío, sin leer tablas; 22023 con la regla en
DETAIL y el `donde` en HINT; el primer rechazo manda, en este orden: `forma` (la clave o el índice), `grupo_inexistente`, `grupo_repetido`,
`grupo_faltante` (la tarjeta lleva **todos** los grupos de la fórmula: lo que se ve suma el total), `tono_inexistente` (sólo con `tonos`),
`nodo_inexistente` y `nodo_sin_lugar` (una clave de `etiquetas`/`leyendas` es un miembro de un grupo, el total o lo aparte de `tarjeta_total`),
`nodo_restringido` (un miembro, el total o lo aparte sin `ver: todos` en la visibilidad compilada; **no figurar cuenta como restringido**) y, con
`columnas.tipo_cambio`, `tipo_de_cambio_restringido` (el tipo de cambio del bucket de un grupo, por omisión o en un modo). Con `def` nulo, sólo la
forma. Juego común: `entities/plantilla/casos-de-plantilla.json` (lo corren `plantilla-validar.sql` y `validarPlantilla()` de TS, 4.19-2; sus casos «borde: …» cazan las trampas del espejo y `octetos` fija el texto de `jsonb` que cuenta el tope de 32 KB).
`plantilla_guardar_borrador` valida la forma; `plantilla_publicar`, contra la fórmula **publicada** del origen y los tonos del catálogo, antes de
archivar nada (sin fórmula publicada, `formula_sin_publicar@origen`). La tabla la lee sólo quien tiene `cotizaciones.configurar` del origen.

### Versiones de la plantilla (4.19-1)

Guardar el borrador, publicarlo y descartarlo piden la versión que se vio en pantalla (`plantillas_tarjeta.actualizado_en`, como texto: un `Date` pierde los
microsegundos) y pasan en serie por un candado por origen (`pg_advisory_xact_lock(hashtextextended('plantillas:' || origen, 0))`), tomado tras el permiso
(`cotizaciones.configurar` del origen) y lo que se rechaza sin mirar el estado, y antes de leer el borrador `for update`. Sin el candado, dos publicar a la
vez publicaban las dos (el segundo `update … where id =` esperaba la fila del primero, la releía y pisaba su nota; no daba 23505).

- `plantilla_guardar_borrador(p_origen, p_actualizado_en_esperado, p_def, p_nota default null) returns timestamptz` (la versión nueva). **Esperada nula = crear**:
  sin borrador lo inserta; con borrador, PT409 «Ya hay un borrador de esta plantilla, guardado hace 2 min.» y nada cambia. Con la esperada, un borrador de otra
  versión da PT409 «El borrador de esta plantilla cambió hace 2 min, mientras lo editabas.» (sin nombre: la tabla no guarda quién). La forma se valida antes del candado.
- `plantilla_publicar(p_origen, p_actualizado_en_esperado, p_nota) returns uuid` (sigue en `uuid`: una función que devuelve `jsonb` y lee `public.formulas` cae
  en el inventario de lo oculto de `cotizaciones-visibilidad.sql`). Esperada nula: la excepción de `_exigir_version()`, sin PT409. Nota en blanco: 22023
  «Publicar pide una nota.» (hint `nota`). Después, lo de siempre (valida contra la fórmula publicada y los tonos; un rechazo no archiva nada).
- `plantilla_descartar_borrador(p_origen, p_actualizado_en_esperado) returns void`: borra el borrador de esa versión; otra versión, PT409.
- **Sin borrador y con esperada** (`_plantilla_borrador_ausente()`), PT409: «El borrador ya no está: la versión 3 se publicó hace un momento.» si la publicada
  tiene `publicado_en >= esperada`; si no, «El borrador ya no está: se descartó.».
- Dentro de una transacción `now()` no se mueve (el trigger genérico): una esperada «vieja» es la de la fila menos 1 µs en `db:probar`; que guardar mueve la
  versión entre transacciones lo prueban las carreras (`scripts/carreras/plantillas.mjs`).

### Lo que lee y escribe la plantilla desde TypeScript (4.19-3a)

- **Del lado de TS:** la versión esperada es el `actualizado_en` que dio la base, como texto y con sus microsegundos (`z.iso.datetime({ offset: true })`; nunca un `Date`). `guardar`
  la manda siempre, `null` explícito para crear (los tipos generados la dan `string`: un `const` con nombre hace el cast), y no manda `p_nota`. Un 22023 de `validar_plantilla()`
  (la regla en `details`, el `donde` en `hint`) va a `porCampo[donde]` con el mensaje de la base tal cual; «Publicar pide una nota.» (`hint = 'nota'`), a `porCampo.nota`; el PT409 es un
  conflicto sin nombre. **Guardar sólo valida la forma** (sin contexto): lo que cruza con la fórmula y los tonos lo rechaza publicar.
- **El texto que la base no lee:** un `\u0000` o un surrogate suelto no lo rechaza `validar_plantilla()` sino la base al leer el JSON (22P02, 22P05). La action de guardar lo ataja antes
  (`revisarTextoParaLaBase()`, con una pila y un tope de 8 niveles) y lo dice junto al campo.
- **La lectura** (`leerPlantillaDelOrigen()`): el borrador y la publicada (la que ya no tiene la forma llega con su `motivo` y sin plantilla), la fórmula publicada del origen con lo que
  mira el validador (no su esquema entero) y el catálogo de tonos (tope 24); sin fórmula publicada no hay contexto. Desde el 4.19-3a el editor lee `plantillas_tarjeta` con la sesión de
  quien mira (la policy limita; el comentario de `20261106190219_plantillas_tarjeta_leer.sql`, «Nadie en la app lee la tabla», ya no vale y la migración no se edita).

### La lectura de la tarjeta (4.18-1)

**`cotizacion_tarjeta(p_formula)`**, `security definer`, da lo que dibuja la tarjeta de **una versión** de la fórmula. Pide `cotizaciones.ver`
(cualquier alcance) del origen de la versión; una versión que no existe y un borrador dan el mismo 42501 que no tener el permiso, también a la dueña.
La plantilla es la **publicada hoy** del origen, validada otra vez contra **esa** versión (con `tonos` nulo): si no le sirve, `{estado: 'sin_plantilla'}`
sin regla ni `donde` (la tarjeta «por omisión», 4.18-2). Con ella, `{estado: 'lista', plantilla: {version}, logo, nota, columnas, total: {nodo,
etiqueta, leyenda}, secundarios: [{nodo, etiqueta}], grupos: [{id, etiqueta, plazo, tono, bucket, filas: [{nodo, etiqueta, leyenda}]}],
tipos_de_cambio: {buckets: {bucket: nombre}, modos: {clave: {bucket: nombre}}}, variante: {nodo, opciones: [{clave, titulo}]}, tonos, moneda_bs}`.
Las filas van en el orden de la fórmula; la etiqueta, la de la plantilla o la del nodo; la leyenda, la de la plantilla o la `descripcion`. El tono de un
grupo es el que elige la plantilla si sigue en el catálogo; si no, el del grupo (`tono_eliminar` no mira las plantillas). Los tipos de cambio van por
su `nombre` de `tipos_cambio` (nulo si no hay uno activo) y nunca por el id ni la clave del nodo; sin la columna, vacíos. `tonos` tiene la forma de la
hoja (claro y oscuro) y `moneda_bs`, su regla. **Ningún id, etiqueta ni texto de un nodo sin `ver: todos` sale, para nadie** (K4 de
`cotizacion-tarjeta.sql`, por cada nivel; el inventario de `cotizaciones-visibilidad.sql` la registra con ese bloque).

### El PDF (4.18-3a)

`GET /cotizaciones/<id>/pdf` da la tarjeta de una cotización **guardada** en A4: el mismo `modeloDeLaTarjeta()` que «Vista previa», con `calculoDeLoGuardado()` (valores y
totales del snapshot, los estados del primer recálculo), así el PDF dice lo mismo que la tarjeta de esa guardada y nunca lo de hoy. Lee `cotizacion_hoja_guardada`,
`cotizacion_evaluar(p_cotizacion)` y `cotizacion_tarjeta(p_formula)` con la sesión de quien pide: lo descarga quien ve la cotización, sin clave propia, y lo que un nivel esconde
no está (sólo lo del nivel «todos»). Lo que no existe, está en la papelera o no se ve es el mismo 404 en texto que la página. El total impreso es el del snapshot: con dos tipos de
cambio (`subasta_usa` en «Paralelo», Aduana a `tc_oficial`) **no es la suma de las filas** sino Bs ÷ tc(`total_en`), con Bs = Σ grupo × tc(su bucket); el e2e
(`e2e/cotizar-pdf.spec.ts`) lo cuenta con las filas impresas y la tolerancia del redondeo. Los montos van con `formatearMonto()` y siempre con cifras (el Modo Live es de la
pantalla); el logo, en `Buffer` y sólo si react-pdf lo dibuja fiel (4-98). Lo dibuja `src/modules/cotizaciones/infra/tarjeta/pdf/` con `@react-pdf/renderer` y Geist en TTF.
