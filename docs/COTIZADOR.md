# El cotizador: fórmula como grafo

La fórmula de un origen vive en `formulas.definicion` y `formulas.params` (jsonb) y se versiona entera. El candado que impide publicar
una fórmula rota es doble y aplica las mismas reglas: `validar.ts` (`src/modules/cotizaciones/entities/`) y `validar_formula()` en la
base. Los dos comparten un juego de prueba, `entities/casos-de-formula.json`, y un corpus diferencial,
`supabase/tests/corpus-de-formula.json` («Las reglas» › «En la base»). La evalúan el motor TS (`entities/motor.ts`, 4.05) y
`evaluar_formula()` en la base (4.06). La forma es la del paso 4.05 (`docs/DECISIONES.md`, 2026-10-23, decisiones a a f). La referencia es
el Excel que la hoja reemplaza (`docs/referencias/excel-de-cotizacion.md`).

## Forma

```jsonc
{
  "nodos": [/* lista ORDENADA: el orden es el de evaluación; sólo se referencia hacia atrás */],
  "buckets": { "exterior": "tc_paralelo", "aduana": "tc_oficial" }, // nombre libre → id de nodo tipo_cambio
  "total_en": "tc_paralelo", // el tipo de cambio que divide el total en Bs; obligatorio con grupos
  "grupos": [
    {
      "id": "compra",
      "etiqueta": "Compra",
      "plazo": "2 días",
      "tono": "compra",
      "bucket": "exterior",
    },
  ],
}
// params: { <constante>: número, …, "tablas"?: { <clave de tabla>: [ { <columna>: número | texto | null } ] } }
```

### Los nodos

Lo **común a todo nodo**:

- `id` (`^[a-z][a-z0-9_]{0,40}$`), `tipo` y `etiqueta`;
- `formato?`: `usd` (por defecto), `pct`, `raw` o `moneda`;
- `descripcion?`;
- `seccion?` y `color?`: son de la Fase 0, y el diseño los reemplaza (4.08);
- `salida?`: `total`, `base_imponible` o `aparte`;
- `bucket?`: sólo en una fórmula sin grupos;
- `grupo?`;
- `solo_en?`: claves de la variante; no en `tipo_cambio` ni en `opcion`.

Cada objeto es **estricto**: una clave mal escrita es un error.

| tipo             | campos propios                                                                                                                        | valor                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `input`          | `sugerido_de?` (un nodo anterior), `requerido_si?` (una bandera), `condicion?`                                                        | lo tipea el asesor; con `sugerido_de`, hasta que lo tipee vale lo de ese nodo |
| `constante`      | `condicion?`, `texto?`. Ninguna se llama `tablas`                                                                                     | `params[id]`: el «valor por defecto global» que cambia el ⚙ (publica la N+1)  |
| `tipo_cambio`    | `clave` (oficial, paralelo…; una clave, un solo nodo)                                                                                 | el valor vigente de `tipos_cambio` al cotizar; se congela                     |
| `campo_vehiculo` | `campo` (`anio`, o la clave de un campo del origen: `cilindrada`)                                                                     | del vehículo vinculado; null si no hay                                        |
| `bandera`        | —                                                                                                                                     | el interruptor de la cotización, 0 o 1                                        |
| `opcion`         | `opciones: [{clave, etiqueta, titulo}]` (dos o más), `por_defecto?`. A lo sumo una por fórmula                                        | la clave elegida (texto). La nombran `solo_en` y un `match`, nunca un cálculo |
| `tabla`          | `tabla`, `match` {columna: nodo anterior o, si no hay uno con ese id, campo del vehículo}, `columna`, `sobrescribible?`, `condicion?` | la fila que coincide → la columna                                             |
| `tramo`          | `tabla`, `sobre` (un nodo), `columna`, `sobrescribible?`, `condicion?`                                                                | la fila cuyo `desde ≤ sobre ≤ hasta` → la columna                             |
| `calculo`        | `op` con su aridad, `sobrescribible?`, `condicion?`, `texto?`                                                                         | la operación                                                                  |

Las **operaciones cerradas de `calculo`**, con su aridad, discriminadas por `op`:

- `suma(de ≥ 1)`;
- `porcentaje_de(de ≥ 1, pct)` = Σde × pct;
- `multiplicar(de ≥ 2)`;
- `restar(de[0] − de[1…])`;
- `dividir(de[0] / de[1])`;
- `si(condicion, de[0])`;
- `depreciar(de[0], tabla, sobre, columna)`;
- `redondear(de[0], n de 0 a 6)`.

**Un nodo nuevo** lleva tres cosas: su tipo en el Zod de `nodos.ts`, su caso en el `switch` de `referenciasDe()` y su caso en
`validar_formula()` y en el juego.

**Fórmulas como texto (4.07):** quien configura escribe con nombres (`=(remate+fees)*4%`, `=SUMA(aduana)`) y el texto se compila a este mismo
grafo **al configurar**. Al cotizar no se evalúa texto. Está hecho: «Fórmulas como texto (4.07)», más abajo.

### Grupos, buckets y el total

- **Un grupo** tiene su plazo de pago (texto), su tono (una clave del catálogo `tonos` de la empresa) y su bucket. No es un nodo: un nodo
  entra con `grupo: id`.
  - Su subtotal en USD es la suma de sus miembros, y el de Bs, ese subtotal por el tipo de cambio de su bucket.
  - El orden de `grupos` es el de las bandas de la plantilla.
  - Un grupo cuyos miembros están todos fuera de la variante no se dibuja: EE. UU.–Chile no tiene aduana.
- **Un bucket** es el papel del dinero, lo que se paga afuera o en la aduana, y `buckets` le da a cada uno un nodo `tipo_cambio`.
  Bs = Σ grupo × tc(su bucket).
- **El total:**
  - con `total_en`, **manda Bs ÷ tc(`total_en`)**: el «TOTAL DÓLARES» del Excel, 16.826,354 en la moto;
  - el nodo `salida: total`, único, es la suma de los dólares (N22 = 16.910), y también se ve;
  - con grupos, `total_en` es obligatorio.
- **La forma de la Fase 0 (sin `grupos`, como las dos fórmulas del seed)** lleva el bucket en el nodo y **reparte el total**:
  - si el total tiene bucket, Bs = total × su tc (`oficina`);
  - si no, es un `suma` cuyos términos directos tienen bucket, y Bs = Σ término × tc(su bucket) (`subasta_usa`: `origen_total` ×
    paralelo + `destino_total` × oficial).
  - La regla vieja, «un nodo con bucket entra a la suma de su bucket», contaba dos veces con el seed.
- `base_imponible` se muestra y no suma. `aparte` (la garantía) se muestra y nunca suma. Ninguno de los dos va en un grupo.

### Sugerido, sobrescribible y el par porcentaje-monto

- **Un nodo `tabla`, `tramo` o `calculo` con `sobrescribible: true`** calcula su valor (el sugerido) y la cotización puede traer otro.
  Así se hacen la nacionalización (sugerida por la calculadora de póliza), el factor de depreciación y el transporte, que el Excel tipea
  a mano. Un atajo de año elige una fila y deja su valor como sugerido.
- **El par porcentaje-monto** es un `porcentaje_de` sobrescribible y su `pct`.
  - **Manda el monto si tiene override**, y si no, el %.
  - Cuando manda el monto, `valores[pct]` guarda monto ÷ base (null si la base es 0) y `fuentes[pct] = override`. Así la hoja y el PDF
    dicen lo mismo.
  - Con base 0 y el % mandando, el monto es 0.
  - Ningún otro nodo lee ese `pct`, y el `pct` acepta un valor: un `input`, una `constante` o una tabla, un tramo o un cálculo
    sobrescribibles (`aceptaValor()` en `nodos.ts`, y `par_mal_tipado` si no).
  - Cómo lo evalúa el motor: «El motor» › «El par porcentaje-monto».

### La variante y el interruptor

- **La evaluación es una sola pasada en el orden de la lista**, después de una pasada previa que decide la variante y el estado de cada
  nodo («El motor» › «La variante y el estado»). Un nodo que no está en su variante (`solo_en`), o cuya `condicion` está apagada:
  - vale 0 sin leer sus referencias;
  - no guarda override;
  - se dibuja deshabilitado con su motivo («Sólo en Híbrido / eléctrico»).
- El `opcion` va antes que todo nodo con `solo_en`.
- El total no lleva `solo_en`, `condicion` ni `sobrescribible`.

### Las tablas congeladas (D5)

- Editar una tabla de referencia publica la N+1 de cada fórmula de su origen que la usa.
- La fórmula congela en `params.tablas` las filas que usa, así que recalcular con su versión vale también para las tablas.
- El seed todavía no las trae.
- **El motor usa la congelada si existe, aunque esté vacía**; si no, la viva que le pasa quien llama (el 4.06, la de
  `tablas_referencia_filas`). Sin ninguna, el nodo queda null con `tabla_sin_filas` («El motor», abajo).

## Las reglas

**Primero la forma (`forma`):** el Zod de `nodos.ts` y `formula.ts`. Cubre el tipo, la `op`, el formato, una clave desconocida, la
aridad, un campo que falta, el id y un param que no es número.

**Después, 30 reglas cruzadas,** cada una con un código estable. El código es el contrato con la base; el texto es de cada lado
(`entities/motivos-de-formula.ts`). `donde` es el id del nodo, el grupo o la clave donde se rompe, y la base lo pone en `hint`.

| Regla                                                                        | Qué rechaza                                                                                                                                                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodo_duplicado`, `referencia_inexistente`                                   | dos nodos con el mismo id; nombrar un nodo que no existe (un `match` sin nodo es un campo del vehículo)                                                                                   |
| `ciclo`, `referencia_hacia_adelante`                                         | un nodo que se usa a sí mismo; usar uno posterior, también `solo_en` antes del `opcion`. Sin ciclos por construcción                                                                      |
| `referencia_de_tipo`                                                         | `condicion` o `requerido_si` que no nombran una bandera; un cálculo que nombra el `opcion`                                                                                                |
| `total_unico`, `total_fijo`, `total_no_es_monto`                             | cero o dos totales; un total con `solo_en`, `condicion` o `sobrescribible`; un total que no da un monto (un tipo de cambio, un campo, una bandera o la variante)                          |
| `constante_sin_valor`, `param_sin_constante`                                 | una constante sin su valor; una clave de params que no es constante                                                                                                                       |
| `par_mal_tipado`, `pct_compartido`                                           | un `porcentaje_de` que no es monto o cuyo `pct` no es pct; el `pct` de un par que no da un monto o no acepta un valor; otro nodo lee el `pct` de un par sobrescribible                    |
| `tipo_de_cambio_repetido`, `tipo_de_cambio_inexistente`                      | dos nodos con la misma clave; `buckets` o `total_en` que no nombran un `tipo_cambio`                                                                                                      |
| `bucket_inexistente`, `total_sin_tipo_de_cambio`                             | un nodo o un grupo con un bucket que no está; sin grupos, un total que no se puede repartir                                                                                               |
| `grupos_sin_total_en`, `grupo_duplicado`, `grupo_inexistente`, `grupo_vacio` | con grupos y sin `total_en`; dos grupos con un id; un nodo en un grupo que no existe; un grupo sin nodos                                                                                  |
| `bucket_con_grupos`, `miembro_no_es_monto`, `miembro_con_salida`             | con grupos, un nodo con su bucket; un miembro que no da un monto (sólo `input`, `constante`, `tabla`, `tramo` y `calculo`) o no es usd o moneda; un miembro que es una salida             |
| `doble_conteo`                                                               | un miembro que acumula otro miembro (un cálculo que no es `porcentaje_de`, o un `sugerido_de`, también a través de un nodo fuera del grupo)                                               |
| `opcion_repetida`, `opcion_clave_repetida`, `opcion_por_defecto_inexistente` | dos `opcion`; una clave repetida; un `por_defecto` que no es una opción                                                                                                                   |
| `solo_en_sin_opcion`, `solo_en_opcion_inexistente`                           | `solo_en` sin variante; una clave que la variante no tiene                                                                                                                                |
| `campo_con_punto`                                                            | un `campo_vehiculo`, o un valor de `match` que no es un nodo, con un punto (`atributos.cilindrada`): un campo es una columna o la clave de un campo del origen, que no lleva puntos (4-3) |

- **Devuelve el primer rechazo**, en un orden fijo, como el `raise` de la base.
- **Es lineal en nodos y aristas.** Hace unas 12 pasadas por nodo y 6 por arista, y no recorre una lista dentro de otra: todo bucle y
  toda búsqueda pasan por el contador de `medidor.ts`.
  - La prueba de escala lo mira con 200 y 2.000 nodos: 6.525 y 65.565 visitas, 3,51 por unidad de tamaño.
- **Cada caso inválido del juego rompe una sola regla.** Se comprueba apagando las reglas de a una: los 29 códigos de entonces, el 2026-10-23
  (`docs/BITACORA.md`), y en el 4.05-3 `total_no_es_monto` (cuatro casos, uno por tipo) y el pct del par (cinco), que sin su chequeo
  dan «válida».

### En la base (4.05-4)

`validar_formula(definicion, params)` está en `supabase/migrations/20261019004900_validar_formula.sql`, y es STABLE desde `…005100`.
Hace lo mismo que `validarFormula()`. `…005500` redefine `_formula_forma_nodo()` entera (STABLE) para admitir `texto` (`/*F70*/`). La regla 30, `campo_con_punto`, la añade `…005400`, que **redefine `validar_formula()` entera** (la
base de `…004900` no se edita) y su ayudante `_formula_campos()`; la copia tiene que decir STABLE, o deshace `…005100`
(`validar-formula.sql` lo comprueba).

- **El rechazo:** `22023`, con el código de la regla en DETAIL (PostgREST lo devuelve como `details`) y `donde` en HINT. Si no hay
  `donde`, no lleva HINT. El texto es el de `motivos-de-formula.ts`, pero no es contrato: sólo el código y `donde` lo son.
- **La forma (§0) copia el Zod comprobación por comprobación.** Cada una está marcada `/*Fnn*/` y pasa antes por `jsonb_typeof`:
  `->>` convierte `true` en un texto que pasa el patrón de un id. Cuenta los largos en code points, como Zod 4.6.5. Lee los números
  como JS: `abs(x) < 2^1024 − 2^970`, y `n` como `z.int()`.
- **Las reglas cruzadas (§1 a §8) van en el orden de TS,** una función por archivo de TS (`_formula_cambio_y_grupos`,
  `_formula_variante`, `_formula_campos`).
  - Las claves de la primera `opcion` se revisan antes de ver una segunda.
  - Un id repetido deja en el mapa su última posición, como el `pos.set` de TS.
  - Una posición nula es el `undefined` de TS.
- **Es lineal:**
  - `p_def` se desarma una sola vez;
  - los mapas (id → posición, grupo → lugar, clave → nodo) se arman por conjuntos;
  - buscar es la búsqueda binaria de jsonb;
  - el estado por nodo va en arreglos de plpgsql;
  - no hay `||` sobre jsonb ni `= any` dentro de un bucle.

  `medir-validar-formula.sql` (`pnpm db:medir`) mide 8,4 ms con 200 nodos y 78,4 ms con 2.000, como `authenticated`. Asserta 0
  buffers, los topes de 26 y 245 ms y una razón ≤ 12 (medida: 9,4). Detalle en `docs/RENDIMIENTO.md`.

- **El orden de las claves es el de jsonb** (largo en bytes y después bytes), que es lo único que la base ve y lo que se guarda.
  Decidido con la persona el 2026-10-23.
  - Aceptar o rechazar coincide con TS en cualquier orden.
  - Con dos errores en el mismo `params`, `buckets` o `match`, el editor (que recorre en orden de inserción) puede nombrar el otro.
  - Los casos del juego no dependen del orden, y el corpus se guarda en orden jsonb.
- **Una divergencia declarada,** con la base más estricta que TS, en cuatro lugares: una clave `__proto__` en `buckets`, `tablas`, una fila
  de una tabla o un `match` de un `calculo`. Zod la descarta en silencio y la base la rechaza como `forma`. **Cerrada en dos de los cinco
  lugares (4-2, 4.07):** `validar.ts` mira lo crudo y rechaza un `__proto__` en un `match` (`forma`, con `donde` = el id del nodo) y en
  `params` (`param_sin_constante` con `donde = __proto__` si su valor es un número, y `forma` si no lo es), con la misma regla y el mismo
  `donde` que la base; cinco casos del juego lo prueban (también el orden entre nodos: un nodo roto antes del `match` va primero, uno
  roto después no). Quedan `buckets`, `tablas` y una fila, que el compilador nunca arma.
- **Las pruebas (`supabase/tests/validar-formula.sql`, en `pnpm db:probar`):**
  - los 90 casos de `casos-de-formula.json` y el corpus diferencial `corpus-de-formula.json` comparan regla y `donde`, y la base
    nunca acepta lo que Zod rechaza;
  - un `texto` rechazado nombra su ruta en el mensaje (`definicion.nodos.<i>.texto`), como el `campo` de `validarFormula()`: la paridad
    no lo ve, porque el `donde` de `forma` es el id del nodo;
  - el corpus son 641 mutaciones deterministas de las 4 válidas, con uno, dos o tres defectos mezclados. Lo arman
    `corpus-de-formula.ts` y los `mutadores-*.ts`, y `corpus-de-formula.test.ts` lo regenera y lo compara con el guardado.
- **Las mutaciones (2026-10-23, `docs/BITACORA.md`): 110.**
  - Cada uno de los 30 códigos apagado tumba exactamente sus casos del juego y ninguno más.
  - Cada comprobación de forma tumba al menos un caso del corpus, salvo F01 y F50. Son equivalentes: un nodo o una definición que
    no es objeto no tiene `tipo` ni `nodos`, y la comprobación siguiente lo rechaza con el mismo `donde`.
  - Los seis cambios de orden no tocan los 61 casos de entonces (cada uno rompe una sola regla) y cada uno tumba al menos un caso del corpus.

## El motor (4.05, prompts 2 y 3)

`evaluar(formula, entrada, modo?, medidor?)` en `entities/motor.ts`. Es puro: sin I/O, sin fecha, sin azar, sin leer la base.
`formula` es la salida de `validarFormula()`. `evaluar_formula()` (4.06) es su espejo, y los dos comparten el juego
`entities/casos-del-motor.json`: cada caso con su fórmula (o el nombre de un caso de `casos-de-formula.json`), su entrada, su modo y
lo esperado, hecho a mano (las cifras del Excel, desde sus celdas).

**La entrada** (`esquemaEntrada`, en `motor-entrada.ts`):

| Campo          | Qué es                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `inputs`       | lo tipeado, por id de nodo `input`; lo que no está, sin tipear. Una clave que no es un `input` es un error                    |
| `banderas`     | por id de nodo `bandera`; lo que no está, apagada. Una clave que no es una `bandera` es un error                              |
| `tipos_cambio` | por clave (oficial, paralelo…), mayores que 0: los de la empresa, la forma de `cotizaciones.tipos_cambio`                     |
| `vehiculo`     | por campo, tal cual lo escribe la fórmula (`anio`, `cilindrada`): número, texto o null                                        |
| `tablas`       | las vivas, por clave; la congelada de `params.tablas` manda                                                                   |
| `variante?`    | la clave elegida del `opcion`. Sin clave, su `por_defecto`                                                                    |
| `overrides`    | `{id de nodo: número}`: lo que la persona escribió sobre un default o un sugerido. El que no se aplica no es un error (abajo) |

**El resultado:**

- `valores`: todos los nodos, en el orden de la lista; null cuando falta algo que lo alcanza; el `opcion`, su clave (texto).
- `estados`: todos los nodos, en el orden de la lista: `activo`, `fuera_de_variante` o `condicion_apagada`.
- `fuentes`: `default`, `sugerido`, `override` o `input`, sólo de los nodos activos que aceptan un valor (`aceptaValor()`: `input`,
  `constante`, `tipo_cambio` y lo sobrescribible), en el orden de la lista.
- `totales`:
  - `grupos`: `{usd, bs, se_dibuja}` de cada grupo, en el orden de `grupos`;
  - `bs`;
  - `usd`: Bs ÷ tc(`total_en`). Sin `total_en` y sin modo (la Fase 0), es la suma de los dólares;
  - `suma_usd`: el nodo `salida: total`.
- `faltantes`: `{codigo, donde, ref?}`, uno por cada null que nace, en el orden en que nace.
- `overrides_descartados`: `{id, motivo}`, los que no se aplicaron (abajo).

**Los errores de llamada lanzan** `ErrorDelMotor` con su `codigo`:

- `modo_invalido`: un modo que nombra algo que no es un `tipo_cambio` de la fórmula o no cubre un bucket que se usa;
- `entrada_invalida`: una clave de `inputs` o `banderas` de otro tipo; una `variante` que la opción no tiene, o con una fórmula sin
  variante; sin `variante` y sin `por_defecto` («Amnistia»);
- `formula_sin_validar`: también dos `opcion` o un `solo_en` sin variante.

Lo que puede causar una persona no lanza: viaja como `faltantes` o como `overrides_descartados`.

### La variante y el estado

**Una pasada previa y lineal** (`motor-estados.ts`), antes de calcular nada, decide la variante y el estado de cada nodo. Depende sólo
de la variante, del `solo_en` de cada nodo y de las banderas de la entrada (una bandera fuera de su variante está apagada). La misma
pasada marca los grupos que se dibujan y los pct «pisados» (abajo).

| Orden | Si…                                      | Estado              | Valor                                       | Override                       | Fuente  |
| ----- | ---------------------------------------- | ------------------- | ------------------------------------------- | ------------------------------ | ------- |
| 1     | tiene `solo_en` y la variante no está    | `fuera_de_variante` | 0, sin leer sus referencias ni su condición | descartado `fuera_de_variante` | ninguna |
| 2     | tiene `condicion` y la bandera no vale 1 | `condicion_apagada` | 0, sin leer sus referencias                 | descartado `condicion_apagada` | ninguna |
| 3     | si no                                    | `activo`            | se calcula                                  | se aplica si su tipo lo admite | la suya |

- La variante gana a la condición: un nodo con las dos, fuera de su variante, dice «Sólo en …».
- **Un `match` que nombra la variante** compara la clave elegida (texto) con la columna, con la igualdad estricta de siempre: es la
  comisión por variante del Excel. Sin fila, null con `fila_sin_coincidencia`.
- Un input tipeado fuera de su variante vale 0 y no es un error.

### Overrides y fuentes

**Precedencia: override > sugerido.** Un nodo activo con override vale el override (pasa por el mismo `asentar`: −0 a 0, lo no finito a
null) y **no calcula su sugerido**: no busca su tabla ni anota faltantes. ↺ quita el override y la hoja recalcula.

| Nodo                                                                             | Sin override                                               | Con override                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `constante`                                                                      | `params`, `default`                                        | el override, `override` (la captura 05)                          |
| `tipo_cambio`                                                                    | `tipos_cambio` de la empresa, `default`                    | el override, `override`; ≤ 0 es sin valor, como el de la empresa |
| `tabla`, `tramo` o `calculo` con `sobrescribible`                                | lo calculado, `sugerido`                                   | el override, `override`                                          |
| `input` sin `sugerido_de`                                                        | tipeado o 0, `input`                                       | descartado `no_sobrescribible` (lo tipeado va en `inputs`)       |
| `input` con `sugerido_de`                                                        | tipeado (`override`) o el del nodo que nombra (`sugerido`) | descartado `no_sobrescribible`                                   |
| lo demás (cálculo, tabla o tramo sin `sobrescribible`, campo, bandera, `opcion`) | sin fuente                                                 | descartado `no_sobrescribible`                                   |

- **El motivo, en este orden:** el id no es un nodo (`nodo_inexistente`), el nodo está fuera de su variante, está apagado, su tipo no
  se sobrescribe. Los de nodos van en el orden de la lista; los inexistentes, al final y **ordenados por id** (bytes, como
  `collate "C"`): así no dependen del orden de las claves de la entrada. Una cotización que pasa a la N+1 trae overrides de la N.
- **El tipo de cambio:** el de la empresa viene en `tipos_cambio` y el de la persona en `overrides`, por el id del nodo. La captura 09:
  `unificado` 12,2 y el override 12 dan $72.951,51, con `fuentes.tc_unificado = override`.
- **`total_en` y los buckets** leen el valor final del nodo, con su override.

### El par porcentaje-monto

Un `porcentaje_de` sobrescribible (el monto) y su `pct`; base = Σde de izquierda a derecha. **Si el monto trae override, el pct está
«pisado»** (lo marca la pasada previa, si el monto y el pct están activos): no se calcula, no aplica su propio override, su fuente es
`override` y, al llegar el par, vale monto ÷ base.

| Caso                                             | monto (fuente)            | `valores[pct]` (fuente)        | faltante                                                                                |
| ------------------------------------------------ | ------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| ninguno                                          | base × pct (`sugerido`)   | el suyo (la de su tipo)        | —                                                                                       |
| override del monto                               | el override (`override`)  | monto ÷ base (`override`)      | —                                                                                       |
| override del pct                                 | base × pct (`sugerido`)   | el override (`override`)       | —                                                                                       |
| los dos                                          | el del monto (`override`) | monto ÷ base (`override`)      | — (el del pct no se descarta: releer una cotización con el monto mandando trae los dos) |
| base 0, manda el %                               | 0 (`sugerido`)            | el suyo                        | —                                                                                       |
| base 0, override del monto                       | el override               | null (`override`)              | `division_por_cero` en el pct, al llegar al par                                         |
| el pct es una tabla sin fila, override del monto | el override               | monto ÷ base                   | — (el pct pisado no busca)                                                              |
| el pct fuera de la variante o apagado            | el override               | 0, sin fuente (no está pisado) | —                                                                                       |

Fees tipeado 1.300 sobre 9.500 (la moto, `H15`): el pct guarda 0,1368421052631579.

### `sugerido_de` y `requerido_si`

- **«Tipeado»** es que la clave está en `inputs`, aunque valga 0.
- **`sugerido_de`:** sin tipear vale lo del nodo que nombra (null si es null, sin faltante nuevo), fuente `sugerido`; tipeado, lo tipeado
  con fuente `override` (había un sugerido; ↺ vuelve a él).
- **`requerido_si` encendida y sin tipear:** null con `requerido_sin_valor` (donde = el input, ref = la bandera), fuente `input`. Un
  sugerido no lo cumple: «requerido» es que la persona lo escriba. Un input inactivo no exige nada.

### Qué pasa cuando falta algo

| Situación                                                                             | Valor                            | En `faltantes` (`donde` / `ref`)                                    |
| ------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| Input sin valor tipeado                                                               | **0** (la celda vacía del Excel) | —                                                                   |
| Input sin tipear con `requerido_si` encendida                                         | null                             | `requerido_sin_valor` (el input / la bandera)                       |
| Bandera sin valor                                                                     | **0** (apagada)                  | —                                                                   |
| `campo_vehiculo` sin valor (no está, es null o no es número)                          | null                             | `campo_sin_valor` (el nodo / el campo)                              |
| `match` sobre un campo del vehículo que no está o es null                             | null                             | `campo_sin_valor` (la tabla / el campo; si faltan varios, el menor) |
| Tabla sin filas: ni congelada ni viva, o la que manda está vacía                      | null                             | `tabla_sin_filas` (el nodo / la clave de la tabla)                  |
| Ninguna fila coincide (`tabla`, `tramo`, `depreciar`)                                 | null                             | `fila_sin_coincidencia` (el nodo / la tabla)                        |
| La celda no es un número (null, que es la «X» del Excel; texto; o la columna no está) | null                             | `celda_sin_valor` (el nodo / la tabla)                              |
| `dividir` por 0, o el pct de un par con base 0 cuando manda el monto                  | null                             | `division_por_cero` (el nodo, o el pct)                             |
| Tipo de cambio ausente o ≤ 0 (también el sobrescrito)                                 | null                             | `tipo_de_cambio_sin_valor` (el nodo / la clave)                     |
| Un resultado no finito (desborde)                                                     | null                             | `fuera_de_rango` (el nodo, el grupo o `total`)                      |
| Un nodo lee un null                                                                   | null                             | nada nuevo: el faltante es de donde nació                           |
| Fuera de la variante o condición apagada (también la del `si`)                        | **0, sin leer sus referencias**  | — (ahí el null **no** se propaga)                                   |
| Un nodo con override                                                                  | el override                      | — (no calcula su sugerido)                                          |

- **Un nodo anota a lo sumo un faltante**, el primero en este orden: tabla sin filas, campo sin valor, fila sin coincidencia, celda
  sin valor.
- **Los totales:**
  - el USD de un grupo es null si lo es un miembro (hasta el 4.05-3 salía 0: un `?? 0` lo tapaba);
  - su Bs, si lo es su USD o su tipo de cambio;
  - **un grupo que no se dibuja** (todos sus miembros fuera de la variante) vale `{usd: 0, bs: 0, se_dibuja: false}` y no lee su tipo
    de cambio: EE. UU.–Chile no necesita el oficial. Uno con todos sus miembros apagados se dibuja y sí lo lee;
  - el total en Bs, si lo es el Bs de un grupo (o, sin grupos, un término del reparto o su tipo de cambio; un término fuera de la
    variante aporta 0 sin leerlo);
  - el total en USD, si lo es el total en Bs o tc(`total_en`).
- **Los códigos** (`CODIGOS_DE_FALTANTE`, `ESTADOS`, `FUENTES` y `MOTIVOS_DE_DESCARTE`, en `motor-contexto.ts`) son el contrato con la
  base; el texto lo pone la interfaz.

### La aritmética

- **Dobles (float8), de izquierda a derecha en el orden de `de`:**
  - `suma` = ((d0 + d1) + d2)…;
  - `restar` = ((d0 − d1) − d2)…, nunca d0 − Σresto;
  - `multiplicar` = ((d0 × d1) × d2)…;
  - `porcentaje_de` = (Σde) × pct; el pct pisado, monto ÷ (Σde).
- **Los grupos:** sus miembros se suman en el orden de la lista; los grupos, en el orden de `grupos`; el reparto, en el de `total.de`.
  Los casos lo fijan bit a bit: suma(0,1; 0,2; 0,3) = 0,6000000000000001, y al revés da 0,6.
- **Sin −0 ni infinitos:** −0 se guarda como 0, y lo no finito, como null con `fuera_de_rango`. JSON y jsonb no guardan ninguno de los
  dos.
- **`redondear(x, n)` es `round(x::float8::numeric, n)::float8`:**
  - el cast toma 15 cifras significativas (`%.15g` de glibc, mitad al par sobre el valor exacto del doble);
  - `round(numeric)` redondea mitad lejos de cero, como ROUND del Excel;
  - así 2,675 da 2,68, 1,005 da 1,01 y −2,5 da −3.
  - `redondeo.ts` lo hace exacto con BigInt. `toExponential(14)` no alcanza: en un empate en la cifra 16 sube, y glibc va al par
    (100000000,0078125 con n = 6 da …812 en Postgres).

### Las tablas, los tramos y `depreciar`

- **Cuál manda:** la congelada de `params.tablas` si existe, aunque esté vacía; si no, la de `entrada.tablas`.
- **`tabla`:** gana la **primera fila**, en el orden de la tabla, cuyas columnas del `match` son todas iguales a lo que nombran: un
  nodo anterior con ese id (la variante, su clave) o, si no hay, el campo del vehículo.
  - **La igualdad es estricta y sin conversión** (2024 ≠ "2024", "Moto" ≠ "moto"), como la de jsonb.
  - Un `match` vacío da la primera fila.
  - Un `match` que nombra un nodo null da null, sin faltante nuevo.
- **`tramo`:** la primera fila con `desde ≤ sobre ≤ hasta`, los dos extremos incluidos. Una fila sin `desde` o sin `hasta` numérico
  no coincide nunca: no hay extremos abiertos (la semilla usa 1900 y 2100).
- **`depreciar(d0, tabla, sobre, columna)` = d0 × el `tramo` de esa tabla.** Tiene los mismos campos que un `tramo`, y la depreciación
  del Excel son rangos con un mismo factor (2018–2021 = 0,328). Hoy nadie lo usa: el seed y el Excel hacen `tabla` + `multiplicar`.

### Lo que el 4.06 tiene que copiar

(Hecho en `evaluar_formula()`: «En la base (4.06-1)», abajo. Cada punto está marcado `/*Pnn*/` en la migración.)

- Sumar con un bucle en el orden de la lista: `sum()` sin `order by` no garantiza el orden.
- Redondear con `round(x::numeric, n)::float8`.
- Elegir la primera fila por `orden` (las congeladas, por su posición en el arreglo).
- Comparar el `match` como dobles: un número con un número, un texto con un texto (la variante, como texto). La igualdad de jsonb es la
  del decimal exacto y no sirve (`0.10000000000000001` no es `0.1` para jsonb y sí para JS). jsonb no guarda el orden de las claves,
  por eso el faltante de varios campos nombra el menor (en orden de código, `collate "C"`).
- Guardar −0 como 0.
- **La pasada previa** antes de calcular: la variante (la de la entrada o la `por_defecto`), el estado de cada nodo (primero la
  variante, después la condición, con la bandera fuera de su variante apagada), los grupos que se dibujan y los pct pisados.
- **Un nodo inactivo** vale 0 sin leer nada y descarta su override con su estado; **un grupo que no se dibuja** no lee su tipo de cambio,
  ni un término del reparto fuera de la variante.
- **El override** antes del cálculo, por tipo; **el pct pisado** vale null hasta que llega el par, y el `division_por_cero` de la base 0 se
  anota ahí, en el orden de los faltantes.
- **Los descartados:** los de nodos en el orden de la lista, los inexistentes al final, por id con `collate "C"`.
- **Las fuentes,** sólo de los nodos activos que aceptan un valor, en el orden de la lista.
- El USD de un grupo con un miembro null es null.
- Leer `casos-del-motor.json` (84 casos).

### Escala

Una pasada previa, una pasada por los nodos y unas pocas por la entrada y los grupos; una búsqueda de tabla recorre sus filas una vez y
un nodo con override no la recorre. Todo bucle y toda búsqueda pasan por `medidor.ts` (`ordenar()` cuenta cada comparación).

- **La prueba** usa una sintética de 200 y 2.000 nodos, con dos tablas de 50 filas, la variante (un `multiplicar` en ella y un
  `restar` fuera), inputs sin tipear con `sugerido_de`, overrides en los tramos, uno descartado en cada `redondear` y tres
  inexistentes: 6.408 y 65.381 visitas, 0,95 por unidad de tamaño y ×10,20.
- **El tamaño** es nodos + aristas + grupos + claves de la entrada (con los overrides) y de params + entradas de `solo_en` + opciones +
  filas × (1 + columnas comparadas).
- **k = 14** se fija por la cuenta de pasadas: lo que más cuesta es un nodo `tabla` sobrescribible de un grupo, con su condición y su
  tabla viva.

### En la base (4.06-1)

`evaluar_formula(p_def, p_params, p_entrada, p_modo default null)` está en `supabase/migrations/20261019005200_evaluar_formula.sql` y es
STABLE. Hace lo mismo que `evaluar()`, y `cotizacion_evaluar()` (4.06-2) la llamará.

- **La llamada:**
  - la fórmula son las dos columnas de `formulas`, tal cual (`definicion` y `params` plano, con `tablas` entre las constantes);
  - la entrada es la de `esquemaEntrada`, y el modo, `{buckets, total_en}` completo: un NULL de SQL es «sin modo» y un `'null'::jsonb`
    es `modo_invalido`;
  - **no revalida la fórmula:** la precondición es la de `evaluar()`, la salida de `validar_formula()`. Lanza `formula_sin_validar` en
    los mismos puntos alcanzables.
- **El resultado** es un jsonb con `valores`, `estados`, `fuentes`, `totales`, `faltantes` y `overrides_descartados`.
  - jsonb no guarda el orden de las claves: `valores`, `estados`, `fuentes` y `totales.grupos` son objetos, y su orden (el de la lista)
    sale de `definicion.nodos` y `definicion.grupos`.
  - `faltantes` y `overrides_descartados` son **arreglos**, porque su orden es contrato («en el orden en que nace»; los de nodos en el
    orden de la lista y los inexistentes al final, por id con `collate "C"`).
  - Un faltante sin `ref` no lleva la clave. Los agregados vacíos son `[]` y `{}`, no null.
- **Los errores de llamada** son 22023 con el código en DETAIL y `donde` en HINT (sin HINT si no hay `donde`), como `validar_formula`.
  - **La forma de la entrada y del modo** se revisa como `esquemaEntrada` y `esquemaModoDeCambio`: el HINT es el primer campo que
    falla en el orden del Zod (`inputs`, `banderas`, `tipos_cambio`, `vehiculo`, `tablas`, `variante`, `overrides`; `buckets`,
    `total_en`), y no hay si la entrada no es un objeto o trae una clave de más.
  - **Orden:** la forma de la entrada, la del modo, dos `opcion`, sin total, los `inputs` y las `banderas`, la variante, un `solo_en`
    sin variante, los buckets y el `total_en`, el reparto y los buckets que se usan.
  - **No se copian cuatro `formula_sin_validar`** que un chequeo anterior vuelve inalcanzables: el estado que falta, la variante sin
    clave elegida, el bucket sin tipo de cambio en los totales y la lectura del reparto (`totalesDe` ya leyó el total, y los demás
    términos son los `de` del total, que su `sumar` ya leyó).
- **Las tablas vivas** llegan en `entrada.tablas`, ya en su orden: «la primera fila» es la primera del arreglo. La congelada de
  `params.tablas` manda, aunque esté vacía. La función no lee `tablas_referencia_filas`: `cotizacion_evaluar()` (4.06-2) arma ese
  objeto con las claves que la fórmula usa y no congela, `order by orden` con un desempate estable (`orden` admite repetidos).
- **Los números son los de JS:**
  - **Dobles de izquierda a derecha,** y `redondear` como `round(x::numeric, n)::float8`, con la guarda de lo que ya no cabe en un
    doble (≥ 2^1024 − 2^970 es ±∞, como `redondeo.ts`).
  - **Desborde y subdesborde:** Postgres lanza 22003 donde IEEE da ±∞ o ±0 (1e200 × 1e200). Los ayudantes `_motor_mas`, `_motor_menos`,
    `_motor_por` y `_motor_entre` usan la cuenta de Postgres cuando los operandos son seguros (`+` y `−` bajo 1e307; `*` y `/` en
    [1e-150, 1e150] o 0), y sólo en el borde un ayudante plpgsql atrapa el 22003 y devuelve lo de IEEE. Se inlinean (`language sql`,
    `stable`, sin `set` ni `strict`).
  - **Lo no finito** se asienta como null con `fuera_de_rango`, también el NaN de ∞ × 0, y −0 como 0.
  - **Un número de jsonb se lee como `JSON.parse`:** `1e-400` vale 0 (el cast a float8 lanza 22003 exactamente donde JS da 0) y lo que JS
    lee como infinito es una entrada inválida.
  - **El `match` y el tramo comparan como float8:** un número con un número (`0.10000000000000001` es `0.1`, y `2024.0` es `2024`), un
    texto con un texto, y nunca uno con otro. jsonb compara el decimal exacto y daría «distintos».
  - **`set extra_float_digits = 3`** en la definición: con la sesión en 0, `float8out` daría 15 cifras y jsonb perdería el último bit.
- **Es lineal:** los argumentos se desarman **una sola vez al entrar** (un jsonb que llega de una columna comprimida se descomprime
  entero en cada `->`: con 1.000 filas congeladas, 86 ms contra 0,7), el estado por nodo va en arreglos de plpgsql y una búsqueda de
  tabla recorre sus filas una vez. Ningún `||` toca un jsonb en un bucle.
- **Lo que se prueba** (`supabase/tests/evaluar-formula.sql`, en `pnpm db:probar`, y la misma prueba en Postgres 17):
  - **los 84 casos de `casos-del-motor.json`,** con el resultado entero de `evaluar()`, no sólo lo que cada caso comprueba;
  - **el corpus diferencial `supabase/tests/corpus-del-motor.json`:** 775 casos que comparan cada número como float8, sin tolerancia (un
    NaN o un Infinity como texto no pasa); lo generan `corpus-del-motor.ts` y los `mutadores-*` y `casos-*` de esa carpeta, con una
    semilla fija, y lo regenera `corpus-del-motor.test.ts`;
  - **la aritmética contra JS:** 5.632 operaciones de los cuatro ayudantes, con los signos de ±∞ y de ±0, y 731 redondeos contra
    `redondeo.ts` (exacto, con BigInt);
  - **guardas:** los ayudantes se inlinean (`proconfig` nulo, sin `strict`), todo es STABLE, y la pasada no nombra `p_def`, `p_params`,
    `p_entrada` ni `p_modo`.
- **Mutaciones:** 312 por texto del SQL, cada una en una transacción que se revierte y contra Postgres 17 (`docs/BITACORA.md`,
  2026-10-23): 300 muertas y 12 equivalentes, cada una con su razón.
- **Escala** (`medir-evaluar-formula.sql`, `pnpm db:medir`): 5,1 ms con 200 nodos y 43,7 ms con 2.000 (×8,5), sin leer un buffer. Con
  4 tablas de 1.000 filas, 200 nodos cuestan 28 ms con las tablas vivas y 16 ms con las congeladas (`docs/RENDIMIENTO.md`).
- **Dos divergencias declaradas,** en las que la base es más estricta o elige el orden de jsonb:
  - una clave `__proto__` dentro de un record de la entrada (`inputs`, `banderas`, `tipos_cambio`, `vehiculo`, `tablas`, una fila,
    `overrides`, `modo.buckets`): Zod la descarta en silencio y la base la rechaza como `entrada_invalida` o `modo_invalido` (4-2);
  - con dos claves malas en `inputs`, `banderas` o un modo, TS nombra la primera en orden de inserción y la base, en orden de jsonb. El
    corpus se guarda en orden de jsonb.

### En la base (4.06-2)

`cotizacion_evaluar(p_entradas, p_cotizacion, p_origen, p_vehiculo, p_modo)` y su ayudante `_cotizacion_armar()` están en
`supabase/migrations/20261019005300_cotizacion_evaluar.sql`: STABLE y `security definer`. `_cotizacion_armar()` comprueba y lee; la otra
llama a `evaluar_formula()` con lo que armó. `evaluar_formula()` no cambió.

- **La llamada:** exactamente uno de `p_cotizacion` y `p_origen` (si no, `llamada_invalida`).
  - **Con una cotización:** SU fórmula (`formula_id`, nunca la vigente), SUS tipos de cambio congelados (`cotizaciones.tipos_cambio`) y SU
    vehículo. Los tipos de cambio no se completan con los vigentes: el que falta es un `tipo_de_cambio_sin_valor`. `p_vehiculo` con una
    cotización es `llamada_invalida` (`donde = p_vehiculo`).
  - **Con un origen:** la fórmula publicada (`origen_sin_formula` si no hay), los tipos de cambio activos de la empresa y `p_vehiculo`
    (opcional; de otro origen es `vehiculo_de_otro_origen`).
  - Los errores de llamada son 22023 con el código en DETAIL y `donde` en HINT, como los de `evaluar_formula()`.
- **Lo que tipea la persona** es `p_entradas = {inputs, banderas, overrides, variante}` y nada más. `tipos_cambio`, `vehiculo` y `tablas`
  los pone la base: una clave de más es `entradas_invalidas` con esa clave en HINT. La forma de cada una la revisa `evaluar_formula()`.
- **Quién puede,** como la policy:
  - una cotización, `puede_cotizacion(id, 'cotizaciones.ver')` (una que no existe y una que no se ve dan el mismo 42501); un origen,
    `cotizaciones.crear` de ese origen; una persona bloqueada, 42501 en los dos;
  - **el vehículo:** la función corre con los derechos de la base y no puede devolver lo que quien llama no vería. Lee el vehículo sólo si
    `puede_vehiculo(id, 'vehiculos.ver')` (si no, 42501, también con el vehículo de su cotización), y de él sólo salen los campos que la
    fórmula nombra y que valen un número o un texto de hasta 200 letras.
- **Qué lee,** cada consulta con su índice:
  - **la fórmula:** `formulas_pkey` (cotización) o `formulas_publicada_unica` (origen);
  - **las tablas:** sólo las que un nodo nombra (`tabla` de un nodo `tabla`, `tramo` o del cálculo `depreciar`) y la fórmula no congeló.
    Cada una por `tablas_referencia_origen_id_clave_key`: la del origen y, si no hay una activa, la compartida (`origen_id is null`); sus
    filas activas por `tablas_referencia_filas_tabla_orden_idx (tabla_id, orden, id)` (**índice nuevo** en `schemas/`: la tabla no tenía
    ninguno). La congelada de `params.tablas` manda aunque esté vacía: esa clave no se lee viva. Una tabla sin filas activas llega como
    `[]`, una sin tabla no llega (las dos dan `tabla_sin_filas`);
  - **los tipos de cambio:** sólo las claves de los nodos `tipo_cambio`;
  - **un campo del vehículo** (`campo_vehiculo.campo` y los valores de un `match` que no son un nodo) es una columna de `anio`, `marca`,
    `modelo`, `kilometraje` o `precio` o, si no, la clave de un campo **activo del origen del vehículo** (`atributos -> clave`). `atributos.x`
    no es el nombre de nada: una clave de campo no lleva puntos (`origenes_campos`), así que no llega y la fórmula anota `campo_sin_valor`
    (desde el 4.07 una fórmula así ni valida: `campo_con_punto`).
    Un booleano, una lista, un texto de más de 200 letras y un número que no cabe en un doble no llegan (la hoja no se rompe por un dato
    del vehículo).
- **«La primera fila»** es la de menor `orden` y, con el `orden` repetido, la de menor `id`: no depende de cómo se insertaron.
- **Exposición:** devuelve el resultado entero, y todavía no hay `formulas.visibilidad` (4.08) ni niveles (4.09) que lo recorten. Por
  eso `revoke execute … from public, anon, authenticated` en las dos hasta el 4.10, y nada de ellas llega a la interfaz antes. Las pruebas
  le dan el permiso dentro de una transacción que se revierte, y `cotizacion-evaluar.sql` asserta que hoy `authenticated`, `anon` y PUBLIC
  no pueden ejecutarlas.
- **Lo que se prueba:**
  - **`supabase/tests/cotizacion-evaluar.sql`** (`pnpm db:probar`): la paridad, con el juego de 84 casos y el corpus de
    `corpus-del-motor.json`: 82 y 603 casos dan **exactamente** lo que `evaluar_formula()` con la entrada entera (462 resultados y 223
    errores de llamada, sembrando en la base las tablas, los tipos de cambio y el vehículo de cada caso). Los demás se saltan por un motivo
    contado: la base no guarda o no deja pasar lo que piden (un tipo de cambio con más de 6 decimales, un año fuera de 1900 a 2100, un
    campo con punto o de una letra, un valor que no es número ni texto, una entrada sin uno de sus miembros). Además: el orden repetido
    (en los dos órdenes de inserción), la congelada que gana a la viva (también vacía), una cotización vieja con SU versión y SU tipo de
    cambio, la resolución de tablas (propia, compartida, inactiva, de otro origen, no nombrada), los campos del vehículo y los permisos
    (una asesora, logística, una persona bloqueada, una cotización o un vehículo que no se ven);
  - **31 mutaciones** del texto de la función, cada una contra esa prueba (`docs/BITACORA.md`, 2026-10-23): caen las 31.
- **Escala** (`supabase/tests/medir-evaluar.sql`, `pnpm db:medir:volumen`; detalle en `docs/RENDIMIENTO.md`): 200 llamadas seguidas como
  `authenticated`, con 50.000 y con 250.000 cotizaciones. La fórmula del seed da una mediana de 2,5 ms y un p95 de 2,8 (topes 10 y 20);
  200 nodos con 4 tablas vivas de 1.000 filas, un p95 de 36 ms (tope 50), de los cuales ARMAR cuesta 7,4 ms y EVALUAR 27,4. No crece con las
  cotizaciones: el p95 con 250.000 es 1,0 veces el de 50.000, y por origen la llamada toca 0 bloques de `cotizaciones`.
- **Lo que no hace:** recortar por nivel (4.09 y 4.10); revalidar la fórmula (un `campo` con punto lo rechaza `validar_formula()` desde el 4.07,
  `campo_con_punto`; `_cotizacion_armar()` lo seguiría ignorando si una fórmula vieja lo trajera).

## Fórmulas como texto (4.07)

`compilarExpresion(texto, contexto, medidor?)` (`entities/compilador.ts`) convierte `=(remate+fees)*4%` en nodos del mismo grafo. Es puro, sin
`eval`, sin `Function` y sin expresiones regulares, **nunca lanza** (un texto que no compila devuelve su error) y no necesita ningún nodo ni
operación que el grafo no tenga. Sale por `index.ts` (con `CODIGOS_DE_COMPILACION`, `MAXIMO_DE_TEXTO` y los tipos): lo usa el editor (4.21) y lo guarda la fila con su `texto` (abajo).

- **Recibe** el texto y un contexto: los `nodos` anteriores a la fila (lo único que el texto puede nombrar), los `posteriores` (sólo para decir
  «está más abajo»), los ids de los `grupos`, las constantes que ya existen (`params`) y el `destino`, la fila que se compila (`id`, `etiqueta`
  y lo que la fila ya lleva: `formato`, `descripcion`, `grupo`, `salida`, `bucket`, `solo_en`).
- **El texto de la fila** (`texto?`, sólo en una `constante` y en un `calculo`, que son las raíces que el compilador emite): el editor (4.21)
  guarda `{ ...raíz compilada, texto }` para mostrarlo y recompilarlo. Es de 1 a 2.000 caracteres (`MAXIMO_DE_TEXTO` en `nodos.ts`;
  `char_length` en la base: caracteres, no bytes; un emoji cuenta uno). Va en `definicion`, así que D7 lo cubre (viaja sólo con
  `cotizaciones.configurar`). **`compilarExpresion()` no lo lee ni lo escribe** (un destino que lo trae compila igual), así que el compilador sigue
  aceptando 100.000 caracteres y el tope vive en un solo sitio, el esquema; el motor lo ignora. Cualquier otro nodo con `texto` es `forma`.
- **Devuelve** `{ ok: true, nodos, params, tramos }` o `{ ok: false, error }`:
  - `nodos`: los auxiliares y, al final, la fila compilada (sólo ella lleva lo del `destino`);
  - `params`: las constantes nuevas (cada número escrito);
  - `tramos`: dónde está en el texto cada nodo que se creó, por id, para señalar un rechazo de `validarFormula()` que nombra un auxiliar;
  - `error`: `{ codigo, mensaje, tramo }`, el `tramo` con `desde` y `largo` en unidades UTF-16 (como un `<textarea>`), y `linea` y `columna`
    desde 1 (las líneas se parten en «\n»). El mensaje habla con tuteo.

### La gramática

Un `=` inicial es opcional. Los espacios, el tab, el salto de línea y el espacio duro valen como espacio.

| Se escribe                            | Qué es                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `12`, `0.5`, `1e3`                    | un número, con punto decimal; los ceros a la izquierda valen (`01` es 1). Sin separador de miles ni `.5` ni `1.`                  |
| `4%`, `0.1%`                          | un número con `%` pegado; vale el número ÷ 100 y la constante es de formato `pct`                                                 |
| `-5`                                  | un número negativo: el menos va pegado al número. Delante de un nombre o de un paréntesis es un error (para restar, `0 - nombre`) |
| `+ - * /` y `( )`                     | la precedencia usual; `*` y `/` antes que `+` y `-`; todo asocia a la izquierda                                                   |
| `remate`                              | el id de un nodo anterior                                                                                                         |
| `SUMA(grupo)`                         | un `suma` con los miembros del grupo, en el orden de la lista                                                                     |
| `SI(bandera; x)`                      | un `si` con `condicion` = la bandera                                                                                              |
| `REDONDEAR(x; n)`                     | un `redondear`, con `n` un entero literal de 0 a 6                                                                                |
| `PORCENTAJE_DE(x; pct)`               | un `porcentaje_de`; `pct` es un nodo de formato `pct` o un número (`4%`, `0.04`)                                                  |
| `DEPRECIAR(x; tabla; sobre; columna)` | un `depreciar`; `tabla` y `columna` son ids en minúsculas, `sobre` un nodo                                                        |

- **Los argumentos se separan con `;`** (como el Excel en español); una `,` es un error propio. Los nombres de función no distinguen
  mayúsculas (`suma(g)` vale), los de un nodo sí.
- **No se escribe:** `MULTIPLICAR`, `RESTAR` ni `DIVIDIR` (para eso están los operadores), los nodos que no calculan (`input`, `tabla`,
  `tramo`…: son filas del editor), referencias A1 ni **`HOY()`**. `HOY()` se rechaza con `hoy_no_soportado` en el nombre; queda como
  **4-4** (`docs/PLAN.md`) hasta que una fórmula real lo pida.
- **Un nombre es sólo el id de un nodo.** La etiqueta no sirve: se repite y se renombra, y el texto se rompería. Así no hay colisiones. Un
  grupo se nombra sólo dentro de `SUMA`. Un token con forma de celda (`B12`, `$A$1`) que no sea un nodo es `referencia_a1`.
- **Un literal es una `constante`** con su valor en `params`, de formato `pct` si se escribió con `%` o se usó donde va un porcentaje, y `raw`
  si no. `4%` corre el punto en el TEXTO (`4e-2`), no divide el doble entre 100: `0.1%` es el doble de `0.001`. **Un número que no cabe es
  `numero_fuera_de_rango`**, y no cabe si pasa del doble más grande (`1e999`) o si no es cero y se redondea a 0 (`1e-400`, `2e-324`, o `0.`
  con 400 ceros y un 1, que sería un 0 aceptado en silencio): vale el doble más cercano, como `Number()`, y el menor subnormal (`5e-324`)
  cabe. Una mantisa de puros ceros es 0 con el exponente que sea (`0e999999999`). Con `%` el tramo del error incluye el signo y el `%`, y
  **el número tal como se escribe tiene que caber solo**: `1e309%` no cabe aunque valga 1e307, porque se mide antes de ver el `%`. **Los
  ceros a la izquierda se aceptan** (`00` vale 0, `01` vale 1, `007.50` vale 7,5, `01e2` vale 100): no hay octales, y el Excel hace lo
  mismo. −0 se guarda como 0. Escrito solo (`=100`), el literal es la propia fila, una `constante`.

### Cómo se arma el grafo

- **Aplanar.** Una cadena `a+b+c` es UN `suma` en el orden del texto, y `a-b-c` un `restar`, `a*b*c` un `multiplicar` (el motor dobla de
  izquierda a derecha). Un paréntesis, una función o un cambio de operación cortan el aplanado: `a+(b+c)` y `(a+b)+c` son dos sumas, `a+b-c`
  un `restar` de un `suma`, y `a/b/c` un `dividir` dentro de otro (`/` nunca se aplana). Es exacto bit a bit con el motor.
- **PORCENTAJE_DE** pone una cadena `+` sin paréntesis directo en `de` (Σde × pct es lo mismo), y si no, un nodo.
- **Los auxiliares.** Cada operación anidada y cada número escrito es un nodo `<destino>__<n>`. `n` cuenta desde 1 en **post-orden**: los
  hijos de izquierda a derecha y después el padre. La fila es la raíz y no se numera: `(remate+fees)*4%` da `total__1` (el `suma`),
  `total__2` (la constante `4%`) y `total` (el `multiplicar`). Si el id no entra en 41 caracteres se recorta el prefijo. Un nombre solo es un
  `suma` de uno (`total = suma(remate)`). Un id que ya existe (un nodo, un posterior o una clave de `params`) es `auxiliar_ocupado`: quien
  recompila no pasa los auxiliares viejos de la misma fila. La etiqueta de un auxiliar es el fragmento del texto, con los espacios juntos y
  a lo sumo 80 caracteres. El mismo texto y el mismo contexto dan siempre los mismos ids, en el mismo orden.
- **Lo que decide `validarFormula()`**, no el compilador: un `SI` en la fila del total (`total_fijo`), un total que no es un monto, el
  `doble_conteo` de un grupo. Todo grafo que compila y respeta esas reglas pasa `validarFormula()` y `validar_formula()`.

### Los errores

Cada error tiene un código estable (`CODIGOS_DE_COMPILACION` en `entities/motivos-del-compilador.ts`) y su tramo exacto. Se nombra **el
primero del texto** (el léxico se lee de a un token, junto al parser); al final del texto, un operador suelto va antes que un paréntesis
sin cerrar.

| Grupo                | Códigos                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| el texto             | `texto_vacio` (vacío, sólo espacios o sólo `=`), `caracter_invalido`, `coma`, `separador_fuera_de_funcion`, `numero_mal_escrito`, `numero_fuera_de_rango`                    |
| paréntesis y valores | `parentesis_sin_cerrar` (en el último abierto), `parentesis_de_mas`, `operador_suelto`, `falta_un_valor`, `falta_un_operador`, `porcentaje_sin_numero`, `demasiado_profundo` |
| los nombres          | `nombre_desconocido`, `referencia_a1`, `referencia_hacia_adelante`, `ciclo`, `grupo_sin_suma`, `variante_en_calculo`                                                         |
| las funciones        | `funcion_desconocida`, `hoy_no_soportado`, `cantidad_de_argumentos`, `argumento_invalido`, `no_es_bandera`, `grupo_inexistente`, `grupo_vacio`                               |
| el resultado         | `auxiliar_ocupado`, `demasiados_terminos` (más de 100.000 términos, contando lo que expande un `SUMA`)                                                                       |

### Escala y entrada adversaria

- **Nada recursivo.** Un parser de dos pilas (operandos y operadores) con una pila de marcos para los paréntesis y las funciones, y una
  emisión en post-orden con pila explícita. Diez mil paréntesis dan `demasiado_profundo` (el 65.º, en su posición) y una cadena de 30.000
  operadores alternados, un árbol de 30.000 niveles, sin un `RangeError`. La profundidad máxima es 64 (`MAXIMO_DE_PROFUNDIDAD`).
- **Lineal.** Todo bucle y toda búsqueda pasan por `medidor.ts`. `k = 70` se fija contando pasadas (`compilador-escala.test.ts`): por carácter
  el léxico y la tabla de líneas (2), por token leerlo, el bucle, buscar el nombre y reducir (4), por auxiliar la emisión (3), su etiqueta
  (a lo sumo 100) y su posición, y 3 por nodo del contexto y por miembro expandido. Medido: de 2,8 a 22 visitas por unidad de tamaño, y diez
  veces más texto son entre 9,5 y 10,0 veces más visitas (100.000 caracteres con 2.000 referencias; 30.000 operadores alternados; paréntesis
  y precedencia; `SUMA` de 1.000 miembros repetida).
- **Las pruebas:** `casos-del-compilador.json` (a mano: nodos, `params`, tramos y cada código con su posición exacta),
  `compilador-propiedades.test.ts` (2.500 expresiones al azar con semilla fija contra el cálculo directo en JS, bit a bit: un resultado que
  no es finito es null, −0 es 0 y dividir por 0 es null; 0,1+0,2+0,3 y su orden contrario, ±0, ∞ y 1e-300; 6.000 cadenas al azar y 1.500
  textos válidos con un carácter cambiado que nunca lanzan) y `compilador-escala.test.ts`. Trece de los casos compilados están en
  `casos-de-formula.json` como válidos (`compilada: …`), así que `validar_formula()` los compara sola en `pnpm db:probar`;
  `compilador-casos-de-formula.test.ts` los recompila (con el `texto` en la fila raíz, como lo guardará el editor) y exige que el JSON sea igual.

## Tipos de cambio y modos (D7, H1)

- Los tipos de cambio son **una lista de la empresa**: `tipos_cambio` (oficial, paralelo, unificado, aduana y los que se sumen), con
  `tipos_cambio_historial` y `empresa.tipos_cambio.gestionar`. Un nodo `tipo_cambio` nombra su clave; **la cotización congela** en
  `tipos_cambio` lo que usó.
- El asesor puede sobrescribir un tipo de cambio en su cotización si la celda es editable para su nivel (`fuente = override`, ↺).
  - El ⚙ de esa celda es `tipo_cambio_guardar`, que afecta a todos los orígenes, con «Aplicar también a esta cotización».
  - Cambiarlo vuelve «desactualizada» una cotización nueva abierta (D2).
  - **Publicar no comprueba** que `tipos_cambio` tenga la clave de cada nodo `tipo_cambio` (el validador sólo mira que el nodo exista en la fórmula);
    `cotizacion_evaluar()` lo da como faltante. La semilla (4.08-3) trae `oficial`, `paralelo`, `unificado` y `aduana`, y una prueba comprueba que toda clave que
    nombra una fórmula sembrada existe.
- **Un modo** (Aduana, Paralelo, Unificado…) lo declara el diseño, y el elegido se guarda en `cotizaciones.modo_tc` (reemplaza el «por
  bucket / uno solo» de D4).
  - **El motor lo recibe con la misma forma que la fórmula**, completo: `{ buckets: {bucket: id de nodo tipo_cambio}, total_en }`
    (`ModoDeCambio` en `entities/formula.ts`). Sin modo, usa `buckets` y `total_en` de la fórmula.
  - Un modo es otro mapa, no otra cuenta.
  - Si el diseño lo nombra por clave de tipo de cambio, la regla «una clave, un solo nodo» deja traducirlo.
- **Las cuentas de las capturas** (`docs/referencias/cotizador-actual.md`), con el modo Unificado `{exterior: tc_unificado, aduana:
tc_oficial}`, `total_en: tc_unificado`:
  - la 02 da 1.200 × 12,2 + 1.201 × 11,68 = 28.667,68; ÷ 12,2 = **$2.350**;
  - la 09, con el unificado sobrescrito a 12, da (53.610,4 × 12 + 19.871 × 11,68) ÷ 12 = **$72.952**.

## El diseño de la hoja (D7)

`formulas.diseno` (jsonb), versionado y publicado con la fórmula: entra en D5 y en «desactualizada» (un cambio de diseño publica la N+1, así que
las dos lo ven sin código nuevo; la columna existe desde el 4.08-2). Lo validan `validarDiseno()` (`entities/validar-diseno.ts`, sobre el Zod de `entities/diseno.ts`) y `validar_diseno()` en la base,
con un juego de prueba (`entities/casos-de-diseno.json`) que los dos rechazan igual: la misma regla y el mismo `donde`. **Declarativo:**
nada de CSS, clases, HTML ni hex. Hecho en el paso 4.08, prompt 1.

```jsonc
{
  "cabecera": {
    "modos": [
      {
        "clave": "unificado",
        "nombre": "Unificado",
        "buckets": [
          { "bucket": "exterior", "nodo": "tc_unificado" },
          { "bucket": "aduana", "nodo": "tc_oficial" },
        ],
        "total_en": "tc_unificado",
      },
    ],
    "ver_total_bs": true,
  },
  "secciones": [
    {
      "id": "compra",
      "titulo": "Compra",
      "presentacion": "principal",
      "nivel_ver": "costos",
      "nivel_editar": "costos",
      "items": [
        {
          "tipo": "celda",
          "nodo": "fees",
          "ancho": "mitad",
          "secundario": "porcentaje",
          "ayuda": { "tabla": "fees" },
        },
      ],
    },
  ],
  "tarjeta_total": { "nodo": "total", "secundarios": ["garantia"] },
}
```

- **Sin registros.** Toda colección es un arreglo con su clave adentro (`modos[].clave`, `buckets[].bucket`): ninguna clave del JSON es un
  dato. Una clave `__proto__` sólo puede ser una clave desconocida de un objeto estricto (`forma`), igual en Zod y en la base, y el orden de
  las claves de jsonb no cambia ningún resultado (la divergencia declarada de `validar_formula()` no se repite).
- **`cabecera`:** los modos que se ofrecen y si se ofrece «Ver total Bs».
  - **Un modo** es otro `buckets` y otro `total_en`: nombra **nodos `tipo_cambio`** (no claves), igual que la fórmula y que el
    `ModoDeCambio` del motor (una lista en vez de un registro). Llena **exactamente** los buckets de la fórmula.
  - **No hay modos en una fórmula sin `total_en`** (`oficina`): con un modo el total pasaría de la suma de los dólares a Bs ÷ tc, y
    «un modo es otro mapa, no otra cuenta».
  - Sin `por_defecto`: si no se elige un modo, mandan los de la fórmula.
- **`secciones[]`, en orden** (el del DOM, de lectura y del `Tab`): `id`, `titulo?` (1 a 80), `presentacion` (`principal` o `avanzado`),
  `nivel_ver?` y `nivel_editar?` (el de la sección lo heredan sus ítems) e `items[]`. Todas las `avanzado` van, en su orden, en **un** modal
  «Avanzado» con su URL (captura 07; el modal es de 4.13).
- **`items`**, de cinco tipos:
  - **`celda`**: `nodo`, `ancho` (`completo`, `mitad` o `tercio` de la sección), `secundario?` (`porcentaje` o `monto`), `ayuda?` (la
    `tabla` de referencia que se abre **o** un `texto` de 1 a 300, no los dos), `nivel_ver?` y `nivel_editar?`. **El candado se deriva:**
    tipo de cambio de la empresa sin permiso de editarlo, un cálculo, una condición apagada, otra variante o un nivel que falta. Siempre dice
    su motivo. **El par porcentaje-monto es una sola celda:** la de un `porcentaje_de` lleva `secundario` y dibuja el `pct` (el IVA
    «14,94 % · $181»); si se sobrescribe, es obligatorio.
  - **`atajos`**: un nodo de **tabla sobrescribible**, la `columna` que etiqueta y cuántas `filas` (1 a 12) se ofrecen como chips (los
    años del factor de depreciación). No dibuja el valor: va sobre la celda de su nodo (o sobre el porcentaje que ella muestra), con sus
    mismos niveles.
  - **`variante`**: el nodo `opcion`, como chips. Es obligatoria si la fórmula tiene variante (sin `por_defecto` el motor falla en cada
    cálculo, y con una no se podría cambiar).
  - **`interruptor`**: una `bandera` con `efecto` `habilita` (los nodos que la bandera condiciona se dibujan deshabilitados con su motivo
    cuando está apagada) o `muestra` (apagada, no se dibujan: la garantía en la tarjeta y en la plantilla). Los nodos son los de
    `condicion` = la bandera, que es lo único que el motor apaga; `habilita` cuenta también los inputs que la piden en `requerido_si`.
    Una bandera que condiciona algo o pide un dato tiene que tener su interruptor.
  - **`subtotal`**: un nodo de cálculo dibujado como franja (el «CIF (base imponible)» de «avanzado»).
- **`tarjeta_total`:** el nodo total y sus `secundarios` (la garantía, que es `aparte`). La tarjeta no se ubica en el diseño: es el
  resumen fijo de UX (al pie en el celular, al costado en escritorio). **Repite** lo que la hoja ya dibuja y no cuenta como aparición.
- **«Aparecer una vez».** Dibujan el valor de un nodo una `celda`, el `pct` que muestra una celda con `secundario`, un `subtotal`, la
  `variante` y un `interruptor`; entre todas, un nodo aparece a lo sumo una vez. El nivel efectivo de un ítem es el suyo (sólo la celda lo
  trae), si no el de su sección, si no `todos`.
- **El diseño no lleva `solo_en`.** Lo que cambia con la variante lo dice el nodo (el `solo_en` de la fórmula) y la hoja lo dibuja
  deshabilitado con su motivo; `validar_formula()` ya asegura que nombre opciones que existen (`solo_en_opcion_inexistente`).
- **El tono es del grupo de la fórmula** (`definicion.grupos[].tono`, no del diseño), una clave del catálogo `tonos` de la empresa (claro y oscuro:
  fondo, borde y tinta). La plantilla puede elegir otra clave para un grupo (H5, 4.18). El validador sólo exige que la clave exista; el catálogo, su
  validación AA y su semilla están en «En la base (4.08-2)».
- **Celular y 200 % sin un segundo diseño:**
  - un solo orden declarado, que es el orden del DOM, de lectura y del `Tab`;
  - cada sección es una grilla de 12 pistas con `@container`;
  - las secciones van en dos columnas si el contenedor mide 64 rem o más;
  - por debajo, una columna en el mismo orden, con `mitad` y `tercio` como `completo`;
  - como el corte es en rem del contenedor, el 200 % colapsa solo (`ui.md`: `minmax(0,1fr)`, `min-w-0`, y la etiqueta arriba del valor
    si la celda mide menos de 16 rem, nunca cortada).

### Las reglas (4.08-1)

**Primero la forma (`forma`):** el Zod de `diseno.ts`. Cubre tipo, clave desconocida (CSS, clase, `__proto__`…), `ancho`, `presentacion`,
`secundario` y `efecto` fuera de su lista, largos (en caracteres: 80 emojis pasan un título y 81 no), un `null`, `filas` (como las lee JS:
`1.0` y `0.99999999999999999` valen 1) e ids. Su `donde` es el id (crudo, si es un texto) de la sección donde está el primer error de Zod;
en la cabecera, la tarjeta o la raíz, ninguno. Zod recorre cabecera, secciones (en orden), tarjeta y, al final, las claves desconocidas.

**Después, 28 reglas cruzadas,** cada una con un código estable (`entities/motivos-de-diseno.ts`; el texto es de cada lado). `donde` es el
id del nodo, la sección, el modo o el grupo donde se rompe; la base lo pone en `hint`.

| Regla                                                       | Qué rechaza                                                                                                                                                                                                                                                                                                                           | `donde`                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `modo_duplicado`, `modo_sin_total_en`                       | dos modos con una clave; un modo en una fórmula sin `total_en`                                                                                                                                                                                                                                                                        | la clave del modo                  |
| `modo_bucket_inexistente`, `modo_bucket_repetido`           | un bucket que la fórmula no tiene; el mismo bucket dos veces                                                                                                                                                                                                                                                                          | la clave del modo                  |
| `modo_tipo_de_cambio_inexistente`, `modo_incompleto`        | el `nodo` de un bucket o el `total_en` que no es un `tipo_cambio`; un bucket de la fórmula sin llenar                                                                                                                                                                                                                                 | la clave del modo                  |
| `seccion_duplicada`                                         | dos secciones con un id                                                                                                                                                                                                                                                                                                               | el id                              |
| `nivel_inexistente`, `nivel_retirado`                       | un nivel de una sección o de una celda que no es «todos» ni existe; uno retirado                                                                                                                                                                                                                                                      | la sección o el nodo               |
| `nodo_inexistente`                                          | un ítem o la tarjeta nombran un nodo que no existe                                                                                                                                                                                                                                                                                    | el id nombrado                     |
| `celda_no_es_valor`                                         | una celda de la variante o de una bandera                                                                                                                                                                                                                                                                                             | el nodo                            |
| `secundario_sin_porcentaje`, `par_sin_secundario`           | un `secundario` en una celda que no es un `porcentaje_de`; la celda de un `porcentaje_de` sobrescribible sin él                                                                                                                                                                                                                       | el nodo                            |
| `atajos_no_es_tabla`, `atajos_no_sobrescribible`            | atajos sobre un nodo que no es `tabla`; sobre una tabla que no se sobrescribe                                                                                                                                                                                                                                                         | el nodo                            |
| `variante_no_es_opcion`, `interruptor_no_es_bandera`        | una variante que no nombra el `opcion`; un interruptor que no nombra una `bandera`                                                                                                                                                                                                                                                    | el nodo                            |
| `interruptor_sin_efecto`, `subtotal_no_es_calculo`          | su bandera no condiciona nada (ni pide un dato, si es «habilita»); un subtotal que no es un `calculo`                                                                                                                                                                                                                                 | el nodo                            |
| `nivel_no_admitido`                                         | el total, una salida `aparte` (en una celda o un subtotal), el `pct` `aparte` que muestra una celda con `secundario`, la bandera `aparte` de un interruptor o la variante con un nivel efectivo de ver que no es «todos»: la base siempre manda el total y lo `aparte` (D7) y la variante titula el PDF, que sólo lleva lo de «todos» | el nodo (o el `pct`, o la bandera) |
| `editar_sin_ver`                                            | una sección con `nivel_ver` restringido y `nivel_editar` ausente o «todos»; una celda cuyo nivel efectivo de ver es restringido y el de editar «todos» (lo que no se ve no se edita; **ver abierto con editar restringido vale**, y también dos niveles restringidos distintos)                                                       | la sección o el nodo               |
| `nodo_repetido`                                             | un nodo dibujado dos veces; un segundo atajos del mismo nodo; un secundario repetido en la tarjeta                                                                                                                                                                                                                                    | el id repetido                     |
| `tarjeta_no_es_el_total`, `tarjeta_secundario_no_es_aparte` | la tarjeta no nombra el total; un secundario que no es una salida `aparte`                                                                                                                                                                                                                                                            | el nodo                            |
| `atajos_sin_celda`, `nodo_con_dos_niveles`                  | unos atajos cuyo nodo no se dibuja; con otro nivel (de ver o de editar) que la celda                                                                                                                                                                                                                                                  | el nodo                            |
| `nodo_sin_seccion`                                          | un `input` o una `constante` sin celda (ni como secundario); el `opcion` sin sus chips; una bandera que condiciona algo o pide un dato sin interruptor                                                                                                                                                                                | el nodo                            |
| `tono_inexistente`                                          | el tono de un grupo de la fórmula que no está en el catálogo                                                                                                                                                                                                                                                                          | el id del grupo                    |

- **El orden (el primero que falla manda):** la forma; los modos (por modo: duplicado, sin `total_en`, por cada entrada bucket inexistente,
  repetido y tipo de cambio; después el `total_en` y lo incompleto); las secciones, ítem por ítem (sección repetida, sus niveles y `editar_sin_ver` de la sección; por ítem:
  nodo inexistente, lo propio de su tipo, niveles de la celda, `nivel_no_admitido` —el nodo, después su `pct`, después la bandera de un interruptor—, `editar_sin_ver` de la celda, `nodo_repetido`); la tarjeta; los atajos (sin celda, otro
  nivel); la cobertura, en el orden de la fórmula; los tonos, en el de los grupos. El juego trae un caso de orden por pasada.
- **El contexto** son tres listas, para que el validador no dependa de tablas que no existen todavía (niveles: 4.09; tonos: prompt 2): los
  niveles que existen, los retirados y las claves de tono. «todos» siempre existe y nunca se retira. El publicar las leerá de sus tablas; el
  ⚙ y la N+1 de una tabla (D5) republican el diseño sin cambiarlo y pasan `retirados` vacío, porque lo que ya usa un nivel retirado se sigue
  filtrando igual. **La definición llega ya validada** por `validarFormula()` (el publicar llama a las dos, en ese orden).
- **No se valida, a propósito:** que `ayuda.tabla` y `atajos.columna` existan (las tablas viven fuera de la fórmula); qué opciones de la
  variante dan chip (todas); que una salida `aparte` esté en la tarjeta (la base la manda igual). (Lo de «un `nivel_ver` restringido con `nivel_editar` abierto» se decidió en el 4.09-1: se rechaza, `editar_sin_ver`.)

### En la base (4.08-1)

`validar_diseno(def, diseno, niveles, retirados, tonos)` está en `supabase/migrations/20261019005600_validar_diseno.sql`, con cinco
ayudantes `_diseno_*`: STABLE, invoker y con `search_path` vacío, y los mismos grants que `validar_formula()`. Rechaza con `22023`, la regla
en DETAIL y `donde` en HINT, por el mismo `_formula_rechazar()`. Un arreglo nulo del contexto es uno vacío; un diseño nulo es `forma`.

- **La forma copia el Zod comprobación por comprobación:** cada una lleva su `/*Dnn*/` y pasa antes por `jsonb_typeof` (un `->>` convierte
  `true` en un texto). Cuenta los largos con `char_length` y lee `filas` como JS.
- **Es lineal:** la fórmula y el diseño se desarman una vez; los mapas (id → posición, quién condiciona, el contexto) se arman por
  conjuntos y se buscan con `?`; el estado por nodo va en arreglos de plpgsql; sin `||` sobre jsonb ni `= any` dentro de un bucle.

### Las pruebas (4.08-1)

- **El juego a mano** (`entities/casos-de-diseno.json`, 244 casos): 40 válidos —el diseño de las capturas con sus modos, el del Excel, el de
  cada fórmula del seed, el de «Amnistia» (variante sin opción por defecto) y los bordes— y 192 inválidos, uno por regla o por cada forma
  de las que tienen varias, más los de forma (`__proto__` en cada nivel, `ancho: "50%"`, `"mitad; color: red"`, `clase`, `html`…) y los de
  orden. Cuatro fórmulas propias (`capturas`, `minima`, `secundaria`, `tonos_distintos`) y el resto de `casos-de-formula.json`.
- **El corpus diferencial** (`supabase/tests/corpus-de-diseno.json`, 814 casos, 76 válidos): las 40 válidas mutadas de forma determinista (semilla
  20261024), cada mutador cruzado seis veces solo, uno de forma por cada `/*Dnn*/`, 200 mezclas de dos o tres reglas y 60 con la forma. Lo
  arman `corpus-de-diseno.ts` y los `mutadores-de-diseno*.ts`, y `corpus-de-diseno.test.ts` lo regenera (`ACTUALIZAR_CORPUS=1`) y exige que
  cada comprobación de la migración tenga su mutador. `supabase/tests/validar-diseno.sql` (`pnpm db:probar`) compara regla y `donde` de
  los 244 y de los 814, y que la base nunca acepte lo que Zod rechaza.
- **Las mutaciones (2026-10-24, `docs/BITACORA.md`):** 132 de TS (128 caen y 4 son equivalentes demostradas) y 187 de SQL (180 caen y 7 son
  equivalentes demostradas). Cada regla apagada tumba exactamente sus casos del juego. Los topes de `ayuda.texto` y del `nombre` de un
  modo se cuentan en caracteres (`char_length`): con `octet_length` caen los casos multibyte del juego y del corpus (remiendo 4-7).

### Escala (4.08-1)

- **TS:** todo bucle y toda búsqueda pasan por `medidor.ts`. k = 8 por tamaño (el peor ítem: recorrerlo, buscar su nodo, dos niveles y su
  registro), y diez veces más unidades son a lo sumo 10,5 veces más visitas (`validar-diseno-escala.test.ts`). Un bucle sin `recorrer()`, un
  `find` o un bucle anidado caen.
- **Base:** `supabase/tests/medir-validar-diseno.sql` (`pnpm db:medir`) mide como `authenticated`, mediana de 5 de 7, con 206 y 2.018
  ítems (255 y 2.487 nodos): 4,8 y 44,3 ms (razón 9,3; tope 12), 0 buffers con literales, y de una columna fuera de línea 265 y 1.665
  buffers (razón 6,3; tope 12). Comprimida cuesta 1,0 veces los literales. Las guardas muerden: una búsqueda lineal por ítem da una razón
  de 18 en ms y releer `p_def` por grupo, 57 en buffers. Detalle en `docs/RENDIMIENTO.md`.

### En la base (4.08-2)

`supabase/migrations/20261019005700_tonos.sql`, `…005800_formula_con_diseno.sql` y `…005900_formulas_solo_configurar.sql`; la tabla `tonos` y las dos
columnas viven en `schemas/07_cotizaciones`.

- **`formulas.diseno` y `formulas.visibilidad`** (jsonb, comprimidas por defecto): nulas sólo en un borrador. **Publicar exige el diseño** (22023,
  `diseno_faltante`, hint `diseno`). El `check` que lo impone (`formulas_publicada_con_diseno`) llegó con la semilla (4.08-3).
- **Guardar:** `formula_guardar_borrador(origen, definición, params, diseño, nota?)` valida la fórmula (`validar_formula()`) y sólo la **forma** del
  diseño (`_diseno_forma()`): el borrador puede estar a medio camino entre una y otro. `p_diseno` no tiene default (quien se olvida del diseño no lo
  borra en silencio) y la firma de cuatro parámetros se borró. Guardar deja `visibilidad` nula.
- **Publicar** (`formula_publicar()` y el ⚙ → `_publicar_formula()`): toma el borrador `for update` y los tonos de sus grupos `for key share`, valida
  la fórmula y el diseño completo (`validar_diseno()` con los niveles de `_niveles_de_cotizacion()` y los tonos de la tabla) y compila `visibilidad`.
  Dos publicar a la vez: el segundo da PT409 o «No hay borrador». El ⚙ copia el diseño de la publicada y publica con `retirados` vacío.
- **Los niveles que existen salen de un solo punto,** `_niveles_de_cotizacion(niveles, retirados)`: hasta el 4.08 `{costos}` y `{}`; desde el 4.09-1 lee
  `cotizaciones_niveles` (con «todos» y «costos» sembrados) sin cambiar su firma. «todos» no figura: siempre existe y nunca se retira.
- **`visibilidad`** = `{nodo: {ver, editar}}` con **claves de nivel**, no permisos (los permisos nacen en el 4.09). La regla (`_compilar_visibilidad()`):
  1. cada `celda`, `subtotal`, `variante` e `interruptor` da su nodo con su nivel efectivo (el de la celda, si no el de su sección, si no «todos»), por
     separado para ver y para editar;
  2. una celda con `secundario` da también el `pct` de su nodo, con los mismos niveles;
  3. el total y lo `aparte` tienen `ver: todos` aunque se dibujen en una sección restringida (D7: la base los manda siempre), y los que no se dibujan
     entran como `{ver: todos, editar: null}`: lo que no se dibuja no se edita;
  4. los atajos y la tarjeta no agregan nada (los atajos tienen los niveles de su celda; la prueba lo comprueba en cada diseño con atajos del juego).

  Lo que no figura no viaja, salvo a quien configura. **No cubre** los subtotales por grupo (no son nodos) ni las filas de las tablas de referencia
  (`tablas_referencia(_filas)` tienen policy `true`): el 4.10 los recorta aparte. Y `nivel_no_admitido` no mira el `pct` de un par ni un interruptor,
  así que un `aparte` que es el `pct` de una celda restringida se ve igual (la compilación lo cubre; que los validadores lo rechacen es 4-9).

- **Los tonos** (`tonos`: clave, nombre, y fondo, borde y tinta en claro y en oscuro). Se escriben sólo por `tono_crear|guardar|eliminar`, con
  `cotizaciones.configurar` (cualquier concesión: el catálogo es de la empresa); los lee toda sesión. Hasta **24** (`_tonos_tope()`). La clave sale del
  nombre, sin tildes, y no cambia. Sembrados: `amarillo`, `verde` y `naranja`, de los tokens de celda (`design/tokens.css`; los hex los calcula
  `supabase/tests/corpus-de-contraste.ts`).
- **El AA se valida en la base,** porque no hay otra capa: la tinta sobre su fondo da al menos 4,5:1 (`_contraste_aa()`) en claro y en oscuro; el borde sólo
  tiene que ser un `#rrggbb`. `_color_luminancia()` y `_color_contraste()` copian `luminancia()` y `contraste()` de `src/shared/lib/color.ts`, y un corpus
  que genera TS (`corpus-de-contraste.json`, 360 pares) comprueba que dicen lo mismo, también pegado al umbral. El contrato para la hoja: el texto sobre el
  fondo de un tono va en su **tinta** (`--color-ink-faint` sobre ese fondo da 3,6).
- **Un tono o un nivel que alguna versión nombra no se elimina** (borrador, publicada o archivada: las cotizaciones viejas se leen con su versión).
  `_tono_en_uso()` mira los grupos de `definicion` y `_nivel_uso()` el diseño, cada una por su GIN angosto (`formulas_tonos_idx` y
  `formulas_niveles_idx`, sobre `jsonb_path_query_array`); con uso, `tono_eliminar` responde 23503 con el origen. Los tonos no se retiran: se cambian
  sus colores. `nivel_eliminar` (4.09) pregunta por `_nivel_motivo_de_uso()`, que cuenta con `_nivel_uso()`; `_nivel_en_uso()`, que escribió el 4.08-2 para eso, se quitó en el 4.10-1 (4-13).
- **La fórmula sólo la lee quien la configura:** la policy «formulas: leer» pasa de `true` a `cotizaciones.configurar` del origen, y la auditoría de
  `formulas` (`formula_auditar()`) ya no copia `definicion`, `params`, `diseno` ni `visibilidad` a `actividad`, que lee quien tiene `actividad.ver` sin
  filtro por origen.
- **Pruebas:** `supabase/tests/tonos.sql`, `publicar-diseno.sql` (la `visibilidad` del diseño de las capturas con «costos», calculada a mano) y el
  bloque de la policy en `humo.sql`; las carreras de `scripts/carreras/tonos.mjs` (eliminar contra publicar en los dos órdenes, publicar contra
  publicar, ⚙ contra ⚙); la medición `medir-publicar.sql` (`docs/RENDIMIENTO.md`).

### La semilla (4.08-3)

El seed deja tres fórmulas publicadas (v1, nota «Fórmula inicial»), cada una con su diseño y su `visibilidad` compilada, en `supabase/semillas/cotizador-*.sql`
(`config.toml` › `[db.seed] sql_paths` fija el orden: `seed.sql`, las tres fórmulas, `estadisticas.sql`). Nacen por el camino de publicar:
`_preparar_publicacion(def, params, diseno, ignorar_retirados)` (migración `…006000`) es el tramo de `_publicar_formula()` que toma los tonos de los grupos, lee el
catálogo y los niveles, valida la fórmula y el diseño completo y devuelve `_compilar_visibilidad()`; el seed la llama y guarda lo que devuelve. Un diseño sembrado
inválido tumba el seed con la regla y su `donde`.

| Origen                            | Fórmula y diseño                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `subasta_usa` (Subasta EE. UU.)   | `formulas.capturas` de `casos-de-diseno.json`: variante (moto, gasolina, USA → Chile, híbrido), unificado y oficial con los modos **Unificado** y **Paralelo**, la garantía aparte y «Avanzado» del nivel `costos` |
| `planilla_usa` (Planilla EE. UU.) | el Excel entero («excel: las cuatro cotizaciones…»), sin modos ni celdas de tipo de cambio, y «Avanzado» del nivel `costos`                                                                                        |
| `oficina`                         | precio acordado − descuento; una sección de dos celdas, sin niveles                                                                                                                                                |

- **Cambios respecto del juego, comprobados por `entities/semilla.test.ts`:** los tonos de los grupos (compra → `verde`, logística → `amarillo`, aduana → `naranja`, del
  catálogo sembrado) y, en `subasta_usa`, el GA al **5 %** (captura 02, «GA 5 % = 57,75»). `planilla_usa` conserva el 10 % del Excel. La fórmula anterior de `subasta_usa`
  sigue en los juegos como «ip generalizado: la v1 del seed hasta el 4.08».
- **Tipos de cambio** (`seed.sql`): `oficial` 11,68 (el por defecto), `paralelo` 12,20, `unificado` 12,20 y `aduana` 11,68. Los 9,73 y 10 del Excel no se siembran: para
  reproducir sus totales se sobrescriben `tc_oficial` y `tc_paralelo`.
- **Tablas de referencia:** las cuatro de cada fórmula con tablas (`depreciacion`, `transporte_usa_bolivia`, `transporte_usa_chile`, `comision_por_variante`) se
  congelan en `params.tablas` y las vivas se generan **de ese mismo JSON**. El transporte es el del Excel (oficina / cliente; ATV y motos, nulas) y el nodo (`sobrescribible`)
  lee `cliente` casando `tipo` con el campo `tipo_vehiculo` del vehículo. Sin vehículo da null con `campo_sin_valor`; con un tipo que la tabla no tiene (la subasta trae
  «AUTOMOBILE», no `autos`), null con `fila_sin_coincidencia`; en los dos casos se tipea y el total deja de ser null.
- **El check:** `formulas_publicada_con_diseno` (`schemas/07_cotizaciones`): `estado = 'borrador' or (diseno is not null and visibilidad is not null)`. Cubre las archivadas.
- **Las anclas** (a mano, `docs/referencias/`), en `supabase/tests/semilla-cotizador.sql` (con `cotizacion_evaluar()`, y el modo armado desde el diseño sembrado) y en
  `entities/semilla.test.ts` (con `evaluar()`):
  - captura 02, Unificado, la póliza tipeada en 1.201: 1.200 × 12,2 + 1.201 × 11,68 = **28.667,68 Bs**, ÷ 12,2 = **$2.350**; con la póliza calculada por «Avanzado»
    (CIF 1.155, GA 57,75, IVA 181,18485, ICE 181,9125) la nacionalización es 1.200,84735 y el total 28.665,897048 Bs;
  - captura 09 (un híbrido, el unificado sobrescrito a 12, el transporte de 3.700 de la fila `vagonetas_grandes`): **875.418,08 Bs**, **$72.952** y la garantía **5.925**;
  - el Excel, con 9,73 y 10: la moto **16.826,354**, la gasolina **43.756,416** (transporte 3.600 de la fila), el híbrido **61.710,6** y Chile **20.157,6** (3.300);
  - `oficina`: 25.000 − 1.500 = **23.500** y × 12,20 = 286.700 Bs.
- **Pruebas:** `semilla-cotizador.sql` corre **antes** de `humo.sql` (mira el seed sin tocar: el humo publica la v2 de `subasta_usa` con el ⚙ y cambia el oficial) y crea su
  persona dentro de una transacción que se revierte (el humo exige que su dueña sea la primera cuenta). 18 mutaciones, las 18 caen (`docs/DECISIONES.md`, 2026-10-24, «Paso 4.08 (3 de 3)»).

## Niveles de acceso (D7, H3 y H4)

- **Qué es un nivel:** una fila de `cotizaciones_niveles`, sembrada con «todos» y «costos».
  - Cada nivel, salvo «todos», genera dos permisos por origen, `cotizaciones.nivel.<clave>.ver` y `….editar`, que aparecen en la matriz
    de Roles.
  - «Todos» usa `cotizaciones.ver` y `cotizaciones.crear` o `cotizaciones.editar`.
  - Cómo nace, cómo se retira y por qué no rompe la regla del enforcement: `docs/DECISIONES.md`, «D7».
- **Al publicar, el diseño se compila a `formulas.visibilidad`** (`{nodo: {ver, editar}}`, claves de nivel), que es lo único que lee la base (la regla, en
  «En la base (4.08-2)»). Los niveles que existen salen de `_niveles_de_cotizacion()`, que desde el 4.09-1 lee la tabla `cotizaciones_niveles` (abajo, «En la base (4.09-1)»).
- **Lo que no se ve no viaja** (hecho en el 4.10-1, abajo en «En la base (4.10-1)»):
  - `authenticated` no lee directo `valores`, `fuentes`, `totales` ni `tipos_cambio` de `cotizaciones`, ni el `diff` de sus revisiones (grant de columnas, el patrón de `leads`);
  - `cotizacion_leer(id)` recorta por `_nodos_visibles(formula_id)` y siempre trae el total y las salidas `aparte`;
  - las revisiones se recortan por nodo (`cotizacion_revisiones`);
  - `formula_para_cotizar(origen)` y la lectura de `formulas` son sólo para `cotizaciones.configurar`;
  - las tablas de referencia se leen por las columnas que leen los nodos que se ven (`cotizacion_tabla`);
  - el PDF y el comprobante (4.18) leen con `cotizacion_leer`, y `validar_plantilla` rechaza un nodo que no sea del nivel «todos»;
  - un inventario (como `numero-global.sql`) registra cada función que puede devolver esas columnas, `formulas.*` o las tablas de referencia.
- **La hoja calcula en la base para todos:** `cotizacion_evaluar(entradas, cotización o origen)` (definer, «En la base (4.06-2)») usa
  `evaluar_formula()`, espejo de `motor.ts`, y devuelve sólo lo visible y el total (desde el 4.10-1 la ejecuta `authenticated`). Guardar recalcula en la base y conserva lo que quien guarda no ve ni
  edita (prompt 3 del 4.10). El motor TS queda para el editor de la fórmula.
- **El límite:** un nodo restringido que es el único oculto de una suma visible se deduce restando. El editor del diseño lo avisa y
  no lo bloquea.
- **Prueba** (`cotizaciones-visibilidad.sql`): sin el permiso del nivel, la clave del nodo no llega por ninguna función del inventario,
  el total sí, y guardar sin mandarla la conserva; con el permiso, llega. «Ver como» no cambia lo que decide la base.

### En la base (4.09-1)

`supabase/migrations/20261019006100_niveles_de_acceso.sql` (la tabla y `permisos.nivel_clave` viven en `schemas/`), `…006200_nivel_no_admitido_del_pct.sql` y `…006300_editar_sin_ver.sql`.

- **La tabla** `cotizaciones_niveles (id, clave, nombre, retirado_en, creado_en, actualizado_en)`: «todos» y «costos» sembrados. La clave sale del nombre (minúsculas, sin tildes,
  `n_` delante si empieza con un dígito, hasta 30) y no cambia; **no se desambigua**: una clave que ya existe —viva, retirada o «todos»— se rechaza (23505, «Ya hay un nivel con la clave
  «costos» (retirado)…»). **Tope: 10 niveles** contando «todos» y los retirados (`_niveles_tope()`): como mucho 9 generan permisos, 18 filas más en la matriz de Roles sobre las 72 de hoy
  y 18 concesiones más en el `mi_sesion()` del dueño; 24 (el de los tonos) la duplicaría para algo que se usa de a dos o tres. Se lee con `select` abierto; se escribe sólo por RPC.
- **Los permisos** `cotizaciones.nivel.<clave>.ver` y `….editar` (`permisos.nivel_clave`, `por_origen`, sin alcance, `orden` 700 y 701, `aplicado_en` = `_nodos_visibles`) nacen en la
  misma transacción que el nivel (`_nivel_permisos_crear()`), concedidos al rol `dueno` para todos los orígenes. Los ata en los dos sentidos: un **check** (`permisos_nivel_check`: clave de
  nivel ⇔ `nivel_clave`, y exactamente `.ver` o `.editar` de ese nivel), una **FK** `on delete restrict` y un **trigger diferido** (`trg_nivel_con_permisos`: al cerrar la transacción, todo
  nivel salvo «todos» tiene los dos). La regla de la clave de un permiso admite dígitos (`^[a-z]+(\.[a-z0-9_]+){1,3}$`). `_nivel_protegido()`: la clave no cambia, «todos» no se toca y
  «costos» no se borra.
- **Las RPC** (`equipo.roles.gestionar`; `search_path` vacío; devuelven `{…, lista}`):
  - `nivel_crear(p_id, p_nombre)` (idempotente por el id del intento; el candado de la tabla ordena el tope, el nombre y la clave);
  - `nivel_renombrar(p_id, p_actualizado_en_esperado, p_nombre)` (cambia el nombre del nivel y el de sus dos permisos; no vuelve a conceder lo que alguien le haya quitado al dueño);
  - `nivel_retirar(p_id, p_actualizado_en_esperado)` (el nivel deja de ofrecerse; sus permisos, concesiones y usos siguen; la fecha de retiro no se pisa);
  - `nivel_restaurar(p_id, p_actualizado_en_esperado)` (4.09-2, 4-12: deshace un retiro; no cambia la clave, los permisos, las concesiones ni el tope; uno que no está retirado responde `sin_cambios` sin mirar la versión);
  - `nivel_eliminar(p_id, p_actualizado_en_esperado)`: `for update` del nivel **antes** de mirar el uso (`_nivel_motivo_de_uso()` sobre `_nivel_uso()`: borrador, publicada o archivada); con uso responde 23503, `detail
nivel_en_uso`, «Está en 6 celdas de 2 orígenes (en alguna versión de su fórmula): no se elimina. Puedes retirarlo…» (`_nivel_uso()` cuenta sólo la versión más nueva de cada origen que lo
    nombra); sin uso toma `for update` de los roles que lo tienen concedido, borra sus dos permisos (las concesiones caen con ellos), toca la versión de esos roles y borra el nivel.
  - Todo queda en `actividad` (`nivel.crear|renombrar|retirar|restaurar|eliminar` con `{clave, nombre}`), sin contenido de fórmula.
- **Publicar y eliminar no se cruzan:** `_preparar_publicacion()` toma `for key share` los niveles que nombra el diseño (como los tonos); `nivel_eliminar` toma `for update` antes de mirar el
  uso. O se publica y el nivel no se elimina (23503), o se elimina y publicar da `nivel_inexistente`. **Invariante:** ninguna versión publicada o archivada nombra un nivel que no existe.
- **`_nodos_visibles(formula_id)`** → `(nodo, editar)` (de nadie; la llamarán las RPC definer de lectura y guardado, 4.10): **un nivel sólo estrecha.** Se ve un nodo de `ver: todos` con
  `cotizaciones.ver` del origen, y uno de `ver: X` con `cotizaciones.ver` **y** `cotizaciones.nivel.X.ver`; se edita lo que se ve con `cotizaciones.crear` o `cotizaciones.editar` y, si `editar` no es
  «todos», `cotizaciones.nivel.Y.editar` (un `editar` nulo no se edita; lo que no se ve no se edita, tampoco entre dos niveles distintos). Lo que la fórmula tiene y la visibilidad no nombra sólo
  llega a quien tiene `cotizaciones.configurar` del origen, sin editar. Usa los permisos **reales** (`mis_permisos()`, una vez); «Ver como» no cambia lo que decide la base. El alcance
  (`propios`/`todos`) y crear contra editar son de la fila: los decide quien llama (`puede_cotizacion`). Lineal en los nodos: 2.487 nodos en 3,1 ms y 110 buffers (leer la fila cuesta 70).
- **Las dos reglas del validador** (mismo código y `donde` en TS y en SQL): `editar_sin_ver` y la ampliación de `nivel_no_admitido` (4-9), en la tabla de «Las reglas (4.08-1)».
- **Pruebas:** `supabase/tests/niveles.sql` (la siembra, el tope, las cuatro RPC, la estructura, el uso, los grants y la actividad), el caso genérico de `permisos-enforcement.sql` (por cada
  nivel de la tabla, los sembrados y uno creado con `nivel_crear`: sin el permiso los nodos no llegan, con él sí, ver y editar por separado), `scripts/carreras/niveles.mjs` (dos crear con la misma
  clave, eliminar contra publicar en los dos órdenes, contra retirar y renombrar, crear contra renombrar al mismo nombre, eliminar contra el borrado de un rol sin bloqueo mutuo) y
  `medir-nodos-visibles.sql`. Detalle de las mutaciones: `docs/BITACORA.md`, 4.09-1.
- **No está todavía** (4.10): las lecturas que consumen `_nodos_visibles()` (el alcance y crear contra editar los decide `puede_cotizacion`).

### La pantalla y la matriz de Roles (4.09-2)

`…006400_nivel_restaurar.sql`, `…006500_niveles_con_uso.sql` y `…006600_motivo_de_uso_en_una_sola_pasada.sql`.

- **`niveles_con_uso()`** (`equipo.roles.ver` o `equipo.roles.gestionar`) devuelve `{tope, niveles}`: de cada nivel, `se_renombra`, `se_retira` y `se_elimina` (la misma regla que `_nivel_protegido()`: «todos» no se toca, «costos» no se
  elimina) y `motivo_de_uso`, el texto que también dice `nivel_eliminar` al rechazar (`_nivel_motivo_de_uso()`: «Está en 6 celdas de 2 orígenes (en alguna versión de su fórmula): no se elimina. Puedes retirarlo…»; uno ya retirado no
  ofrece retirarse). **`_niveles_lista()` lo lleva en la respuesta de cada escritura**: la pantalla nunca lo pierde al cambiar algo. Cuesta una cuenta por nivel que alguna versión nombra: 2,6 ms con ninguno, 21 ms con los nueve que pueden tener
  permisos en uso y 200 versiones cada uno, 199 con 2.000 (`medir-nodos-visibles.sql`, topes de 60 y 400 ms). Con esto `equipo.roles.ver` tiene enforcement en la base.
- **En TS** los permisos de un nivel no están en `CLAVES_PERMISO`: se reconocen por su forma, la del check de `cotizaciones_niveles.clave` menos «todos» (`esClaveDeNivel()` de `@/shared/lib/permisos`). La sesión, las actions de la matriz y
  `catalogoDesde()` los dejan pasar; la prueba corre `_nivel_clave()` de la base sobre nombres difíciles y exige que cada clave que da pase el patrón.
- **La matriz de Roles** los trae con su nivel por la FK (`PermisoDelCatalogo.nivel`): van al final de «Cotizaciones» (`orden` 700 y 701 empatan entre niveles; los desempata `ordenarPermisosDeNivel()` por nombre en español y «Ver» antes
  de «Editar»), y uno retirado dice «(retirado)» porque lo que se le dio sigue valiendo. Otorgarlos pasa por `rbac_otorgar` (por origen, sin alcance) con la dominancia de siempre; «Ver como» los refleja porque la sesión ya los trae
  (un rol sin el permiso del nivel no se lo puede dar a otro). Sin paginación (la matriz es la excepción de `listas-con-patron.ts`): con el tope de niveles suma 18 filas a las 72, y cabe al 200 % en 412 y 1.280 px.
- **La pantalla** `/configuracion/cotizacion?seccion=niveles` (`docs/UX.md`, «Cotización: niveles de acceso»): la lista con «N de 10», los retirados aparte, y crear, renombrar, retirar y restaurar (con «Deshacer») y eliminar. No razona
  por el nombre ni por la clave de un nivel: lo que admite cada uno lo dicen las banderas de su fila.

### En la base (4.10-1)

La lectura de una cotización: lo que quien llama no ve no viaja. Migraciones `…006700` a `…007500`; pruebas en `supabase/tests/cotizaciones-visibilidad.sql`, medición en `medir-cotizaciones-lectura.sql`.

- **Ninguna lectura directa del snapshot.** `authenticated` y `anon` ya no leen `cotizaciones.valores|fuentes|totales|tipos_cambio` ni `cotizaciones_revisiones.diff` (`…006800`). Un `revoke select (columna)` no hace nada
  mientras exista el `select` de tabla que da `_rls()`: se quitó el de la tabla y se dio el de las columnas que sí se leen (el patrón de `leads`). Una columna nueva nace sin grant. `tipos_cambio` también se
  esconde: el nodo `tipo_cambio` de una sección restringida congela su valor ahí. `total_base`, `modo_tc`, `titulo`… siguen legibles. `auditar()` copiaba la fila entera a `actividad`: `cotizacion_auditar()`
  (`…006900`) quita esas cuatro columnas y limpia lo que ya estaba.
- **La policy y `puede_cotizacion()` por fila** (`…007000`): los orígenes con «todos» y con «propios» se calculan una vez por sentencia (`origenes_con_alcance()`) y lo propio es `creado_por` o
  `en_cartera(lead_id)` por fila; ya no se arma `lead_id in (select mis_leads())`. La visibilidad no cambia (al transferir un lead, la cartera nueva ve sus cotizaciones en el acto; quien se va, si
  queda compartido, también). Índices del listado: `cotizaciones_listado_idx (creado_en desc, id desc)` y `cotizaciones_creador_idx (creado_por, creado_en desc, id desc)`.
- **El recorte** (`…007200`): `_cotizacion_contexto(visibles, definición, visibilidad)` arma una vez por llamada conjuntos jsonb (los nodos que viajan, todos, los grupos que se ven enteros, los tipos de
  cambio que un nivel esconde) y `_cotizacion_recorte(resultado, contexto)` los aplica. Las reglas:

  | Parte                           | Qué viaja                                                                                                                                                                                                                                                                                                |
  | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `valores`, `estados`, `fuentes` | los nodos de `_nodos_visibles(formula_id)`, y siempre el total y los de salida `aparte` (aunque la visibilidad los restrinja)                                                                                                                                                                            |
  | `totales`                       | `bs`, `usd` y `suma_usd`, siempre. Un grupo (`grupos[g]`: `usd`, `bs`, `se_dibuja`) sólo si se ven **todos** sus nodos, y su `bs` sólo si ningún tipo de cambio de la fórmula está restringido por un nivel que quien lee no tiene (Bs ÷ USD es esa tarifa). Otra clave (la forma de la Fase 0) no viaja |
  | `tipos_cambio` (lo congelado)   | todas las claves salvo las de un nodo restringido por un nivel. Una tarifa que el diseño no dibuja no figura en `visibilidad`: es la de la empresa (toda sesión lee `tipos_cambio`) y no cuenta como oculta                                                                                              |
  | `faltantes`                     | uno cuyo `donde` es un nodo visible, `total` (la letra) o un grupo que viaja, y cuyo `ref`, si es un nodo, también se ve. Las demás sólo marcan `hay_faltantes_ocultos: true`, que se omite cuando es falso                                                                                              |
  | `overrides_descartados`         | los de un nodo visible y los de un id que la fórmula no tiene                                                                                                                                                                                                                                            |

  Quien lo ve todo recibe exactamente lo que dio el motor.

- **`cotizacion_leer(id)`**: `puede_cotizacion(id, 'cotizaciones.ver')` (una que no existe, una en la papelera y una que no se ve dan el mismo 42501), `_nodos_visibles(formula_id)` de SU versión —nunca la vigente— y
  el recorte. Devuelve `{cotizacion, valores, fuentes, totales, tipos_cambio}`; las columnas de `cotizacion` son las que dice el grant. `configurar` suma los nodos que la visibilidad no nombra, sin saltarse un nivel.
- **`cotizacion_evaluar(entradas, cotización | origen, vehículo, modo)`** (`…007200`) se concede a `authenticated` y devuelve lo recortado. **No es un oráculo**: lo tipeado sólo nombra nodos que se ven;
  un `input` o una `bandera` oculta da el mismo error que uno que no existe (texto, `donde` y orden del motor: la forma —sin las tablas que arma la base—, la fórmula inválida, los inputs, las banderas); un
  override de un nodo oculto se quita antes del motor y vuelve como `nodo_inexistente` (después de recortar, entre los inexistentes, ordenados por id en bytes). Quien no configura el origen sólo elige uno de
  los `cabecera.modos` del diseño de esa versión (`modo_invalido` si no). El tipo de cambio congelado se mira con un `case` y no con un `and` (el orden de un AND no está garantizado).
- **`cotizacion_revisiones(cotización, antes?, tamaño?)`** (`…007300`): una página de revisiones, de la más nueva a la más vieja, por el cursor `id` (`_acotar_pagina(tamaño, 20, 100)`; `{revisiones, hay_mas,
siguiente}`), con cada `diff` recortado: las columnas legibles tal cual; `valores` y `fuentes` sólo con los nodos que se ven; `totales` y `tipos_cambio` por el recorte; si lo que cambió es sólo lo oculto
  la columna no figura (una revisión de sólo lo oculto viaja con `diff: {}`: se sabe quién y cuándo, no qué). Índice `cotizaciones_revisiones_cotizacion_idx`. Aún no figura en
  `scripts/guardas/paginas-en-la-base.ts` (esa guarda pide quién la llame desde `src/`): la registra el 4.15.
- **`formula_para_cotizar(origen)`** (`…007400`): la publicada entera (`definicion`, `params`, `diseno`, `visibilidad`), sólo con `cotizaciones.configurar` del origen; el permiso se pide antes de mirar si el origen existe.
- **Las tablas de referencia** (`…007500`): la policy de lectura pide `cotizaciones.configurar`. `cotizacion_tabla(clave, cotización | origen)` da la tabla sólo si un nodo que quien llama ve la lee, y sólo las
  columnas que leen esos nodos (las de su `match` y su `columna`; `desde` y `hasta` en un tramo; la de unos atajos que se ven), con la copia congelada de `params.tablas` de esa versión si existe; si no, la
  viva (la del origen o la compartida). Hasta 1.000 filas. Sin acceso, el error de una tabla que no existe. Una `ayuda` sola no da nada.
- **El inventario** (`cotizaciones-visibilidad.sql`, el modelo de `numero-global.sql`): toda función de `public` o `web` que un cliente puede ejecutar y que puede devolver el contenido de esas tablas
  (por su texto sin comentarios y su tipo de retorno, y por quien la llama) figura en `pg_temp.cv_registro()` con su clase —`recorta`, `configurar` o `no_devuelve`— y su motivo; una nueva sin registrar rompe la
  prueba. Cada una que recorta lleva su sonda y el caso genérico la corre por cada nivel de `cotizaciones_niveles` (y uno creado con `nivel_crear`): sin el permiso ni el id ni el valor del nodo; con él, los dos;
  «Ver como» no cambia nada.
- **Costos** (`medir-cotizaciones-lectura.sql`, `docs/RENDIMIENTO.md`): una página de 101 cotizaciones, con 50.000 y con 250.000: la dueña 0,4 ms y 92 buffers, Ana («mías») 0,7 y 241, la «chica» 0 y 3;
  `cotizacion_leer` 1,4 a 1,6 ms, `cotizacion_revisiones` (500 revisiones) 4 a 5 ms, `cotizacion_evaluar` 3,9 ms la fórmula del seed y 39,9 ms de p95 la sintética de 200 nodos. «Todas las que veo» de quien ve «propios» recorre el índice global (≈ 1,6 s con 250.000): `docs/PLAN.md`, **4-14**.

### Quién escribe una cotización y cómo (4.10-2)

Desde el 4.10-2 **nadie escribe `cotizaciones` ni `cotizaciones_revisiones` con `insert`, `update` o `delete`**: `authenticated`, `anon` y PUBLIC no tienen ningún privilegio de escritura, ni de tabla ni de columna (`…007900`; lo comprueba `cotizaciones-visibilidad.sql` en PGlite y `scripts/carreras/cotizaciones.mjs` en la base real), y las policies de crear y de editar ya no existen. Escriben, todas con `security definer`:

| Quién                                                                                                                                      | Qué escribe                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `cotizacion_crear()`                                                                                                                       | el alta (esta sección)                                                                                    |
| `cotizacion_guardar()`                                                                                                                     | la edición con su versión; conserva lo que quien guarda no ve ni edita (abajo, «Cómo se guarda (4.10-3)») |
| `cotizacion_marcar_final()`, `cotizacion_moderar()`                                                                                        | la clase y el estado                                                                                      |
| `papelera_enviar                                                                                                                           | restaurar                                                                                                 | purgar()`, `vehiculos_papelera_*()`, `limpieza_automatica_correr()` (cron) | la papelera y su purga |
| los triggers `cotizacion_revision()` (la única escritura de `cotizaciones_revisiones`), `cotizacion_contadores()` y `cotizacion_auditar()` | revisiones, contadores y `actividad`                                                                      |

`service_role` y `postgres` conservan lo suyo. La auditoría sigue completa con la escritura por RPC (alta, edición y papelera), sin el snapshot. Un `revoke … on table` ya quita los grants de columna (lo dice la documentación de `REVOKE`, y la mutación que no los quita sobrevive); la migración los quita también por columna, explícitos, y `has_column_privilege` de cada rol sobre cada columna lo comprueba.

**`cotizacion_crear(id, origen, lead, entradas, fórmula_abierta, abierta_en, vehículo?, vehículo_nuevo?, modo_tc?, clase = 'preventa', con_la_abierta = false)`** (`…007800`; la firma de ahora, `…008500`) calcula en la base con `evaluar_formula()` sobre la fórmula publicada del origen y devuelve `{cotizacion, valores, fuentes, totales, tipos_cambio, repetido}`, recortado por `_cotizacion_respuesta()` (el mismo recorte que `cotizacion_leer()`; no se duplica). En este orden:

1. `cotizaciones.crear` **del origen de la cotización** (un lead no tiene origen de vehículo: sólo su canal) antes de mirar nada; con una final, además `cotizaciones.final.gestionar`.
2. **El intento** (`p_id`, que manda el cliente): un candado consultivo por id ordena dos llamadas a la vez; si el id existe y es **mío, de este origen y de una cotización viva**, se devuelve con `repetido: true` (aunque el lead haya cambiado de manos). Un id ajeno, de otro origen o de la papelera no se mira: sigue y choca con la clave en el `insert`, que responde 42501 «No tienes acceso a esta cotización.» (lo mismo que `cotizacion_leer()` con un id que no existe), sin una consulta previa que sirva para sondear ids.
3. **El lead es obligatorio** (D3) y tiene que verlo quien llama (`leads.ver`, la regla de la policy de insert que se fue; no hace falta estar en su cartera): se comprueba, se bloquea con `for key share` (frena a transferir y a la papelera) y se vuelve a comprobar, así nadie bloquea un lead que no ve. Inexistente, de la papelera o ajeno: 42501 «No encontramos este lead o no tienes acceso.».
4. **El vehículo**: obligatorio si lo dice el ajuste `ajustes_empresa.vehiculo_obligatorio_al_cotizar` (sí por defecto) y siempre en una final. «Cargar a mano» (`p_vehiculo_nuevo = {id, datos, consulta?}`) llama a `vehiculo_crear()` en la misma transacción. Uno que quien llama no ve —o que no existe, o está en la papelera— da el 42501 «No tienes acceso a este vehículo.», el mismo texto que `cotizacion_evaluar()`: otro error en crear haría de las dos funciones un oráculo.
5. **La fórmula** publicada, `for share` por su id. Publicar archiva la vigente con un `update` de `estado` (columna no clave), que no choca con `for key share`: sin este candado un alta cruzada con una publicación nacería sobre una versión archivada y `cotizacion_validar` la rechazaría (23514). Con `for share`, publicar espera a las altas en curso y el orden es determinista; si publicaron mientras esperaba, se vuelve a leer la nueva (tres vueltas y PT409).
6. **El modo** (`p_modo_tc`): nulo (los buckets de la fórmula) o la `clave` de un modo de `diseno.cabecera.modos` de esa versión (`modo_invalido`, pista `modo_tc`).
7. **Lo tipeado**, con `_cotizacion_tipeado()` y lo propio de guardar: un valor para un nodo que se ve y no se edita → 42501, `detail nodo_no_editable`, `hint` el nodo; un override de un nodo oculto o inexistente → el mismo `nodo_inexistente`.
8. **El cálculo.** Un override que el motor descarta en un nodo visible (fuera de la variante, apagado o no sobrescribible) se rechaza (22023, el motivo en `detail`): lo guardado es lo que se mandó. Se guardan `valores` y `fuentes` **enteros** (los nodos que quien llama no ve, y los que no mandó, con el valor de la fórmula), `totales`, `modo_tc` y `tipos_cambio` = las tarifas de la empresa que usó (las claves activas que nombra un nodo: lo mismo que usa recalcular; un override de un nodo `tipo_cambio` queda en `valores` con fuente `override`). **`total_base` es el total en la moneda base de la empresa**: `totales.usd` con `USD`, `totales.bs` con `BOB`, otra → 22023; sin valor, `total_sin_valor` (sin nombrar lo oculto) y si no cabe en `numeric(18,2)`, `fuera_de_rango`.
9. **El `insert`**: el índice único `cotizaciones_final_por_vehiculo` da 23505 «Este vehículo ya tiene una cotización final activa.» (pista `vehiculo`). Una final creada directo no hace lo de marcarla (vincular el vehículo al lead, mandar las preventas a la papelera, pasar el lead a cliente): **4-17**, para el 4.25.

Orden de candados: el del intento, el lead, el vehículo, la fórmula (el de `vehiculo_vincular`; `cotizacion_marcar_final` toma primero su cotización desde el 4.10-3 y el resto del orden lo arregla el 4.25). **D2** («desactualizada») está acá desde el 4.10-3, en `cotizacion_crear()`: ver «Cómo se guarda (4.10-3)».

**`_cotizacion_tipeado(definición, entrada, modo, visibles)`** (`…007700`, de nadie) es la revisión de lo que tipea la persona —la forma de la entrada y del modo, la fórmula inválida, que los inputs y las banderas sólo nombren nodos que se ven, y la variante— con el texto y el orden del motor, y devuelve los overrides de nodos que no se ven. La llaman `cotizacion_evaluar()` y `cotizacion_crear()`: dos copias del mismo chequeo acaban respondiendo distinto a la misma entrada. **4-18:** `cotizacion_evaluar()` no miraba la `variante` contra lo visible y el motor responde ««x» no es una opción de la variante «<id>»» con el id del nodo; ahora, con la opción oculta, elegir una variante da exactamente el error de una fórmula sin variante, y no elegir ninguna (sin `por_defecto`) da `variante_sin_eleccion`, que no nombra el nodo.

**Costos** (`medir-cotizacion-crear.sql`, en `db:medir`; `docs/RENDIMIENTO.md`): una llamada con 50.000 y con 250.000 cotizaciones, igual en las dos: la preventa de la dueña 5,6 ms y 282 buffers, la de la asesora («propios») 5,5 y 281, cargando el vehículo a mano 6,3 y 387, el intento repetido 1,5 y 42; ninguna recorre `cotizaciones`. Topes de 20 ms y 1.500 buffers; una copia que recorre la tabla da 44 ms y 62.700 buffers y rompe los dos.

### Cómo se guarda (4.10-3)

**`cotizacion_guardar(id, intento, actualizado_en_esperado, entradas, modo_tc, titulo, notas, vehículo)`** (`…008700`) es la única edición de una cotización: calcula en la base con SU versión de la fórmula (nunca la publicada de hoy) y SUS tipos de cambio congelados, conserva lo que quien guarda no ve ni edita, y devuelve `{cotizacion, valores, fuentes, totales, tipos_cambio, repetido}` por `_cotizacion_respuesta()` (el recorte de `cotizacion_leer()`). Recibe el **estado entero de lo que la persona edita**, como un formulario: `modo_tc`, `titulo`, `notas` y `vehículo` no tienen valor por omisión (nulo es un valor), y lo que edita y no manda en `entradas` queda sin tipear (↺).

**Qué columnas se editan y cuáles no** (el inventario del 4.10-3 de las que escribía el `grant update` que se fue):

| Columna                                       | En `cotizacion_guardar`                                                                                                                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `valores`, `fuentes`, `totales`, `total_base` | las calcula la base; nunca las manda el cliente                                                                                                                                                                      |
| `modo_tc`                                     | la clave de un modo de `diseno.cabecera.modos` de SU versión, o nulo                                                                                                                                                 |
| `titulo`, `notas`                             | sí: se recortan, vacío es nulo, hasta 120 y 2.000 caracteres (22023, `hint titulo` o `notas`)                                                                                                                        |
| `vehiculo_id`                                 | sí: poner o **cambiar** (D3: una preventa guardada sin vehículo necesita uno para ser final); no se quita; **una final no lo cambia** (marcarla ya vinculó ese vehículo al lead y mandó sus preventas a la papelera) |
| `tipos_cambio`                                | no: se congelan al crear (recalcular con los de hoy es cotizar encima, 4.15); el override de un nodo `tipo_cambio` vive en `valores` y sí se edita                                                                   |
| `clase`                                       | no: es de `cotizacion_marcar_final` (4.25)                                                                                                                                                                           |
| `lead_id`                                     | no: cambiar de lead cambia quién la ve, y ninguna pantalla lo pide                                                                                                                                                   |
| `plantilla_id`, `moneda_mostrar`              | no: nadie las lee; las pedirá la tarjeta (4.18) o «Ver total Bs» (4.13)                                                                                                                                              |

**En este orden** (cada error, igual para lo que no existe y para lo que no se ve):

1. **Permiso:** una preventa pide `cotizaciones.editar` sobre la cotización (`puede_cotizacion`, el mismo criterio que la lectura); una **final**, además de verla, `cotizaciones.final.gestionar` del origen (la policy que se fue lo pedía así; `cotizacion_validar` nunca miró permisos, sólo exige el vehículo). Una que no existe, está en la papelera o no se ve: 42501 «No tienes acceso a esta cotización.», el texto de `cotizacion_leer()`. El permiso se vuelve a mirar con la fila tomada.
2. **Candados** (abajo), el **intento**, la **versión** y título, notas, vehículo y modo.
3. **ARMAR con SU versión** (`_cotizacion_armar(entradas, cotización, null, vehículo nuevo)`: su fórmula, su visibilidad, sus tipos de cambio y **lo guardado**), `_cotizacion_tipeado()` (lo tipeado sólo nombra lo que se ve: un input, una bandera o una variante que no ve da el error de uno que no existe; un override oculto o inexistente, `nodo_inexistente`) y `_cotizacion_conservar()`.
4. `evaluar_formula()` y `_cotizacion_guardable()`: un override **mandado** que el motor descarta se rechaza con su motivo (22023); un total sin valor o que no cabe, también; `total_base` en la moneda base.
5. Si nada cambió, no escribe (ni la versión ni una revisión). Si no, `update` con `importadora.guardado` fijado (el intento y la huella para la revisión).

**Lo que se conserva y lo que se recalcula** (D7). Lo que quien llama no edita (un nodo que no ve, o que ve y no edita) se **reconstruye de `valores` y `fuentes`** guardados (`_cotizacion_entradas_de()`) y se completa antes del motor (`_cotizacion_conservar()`): lo oculto se conserva byte a byte. Un valor mandado para un nodo que se ve y no se edita, distinto de lo guardado, es 42501 `nodo_no_editable` (igual a lo guardado no es un cambio). Se reconstruye así:

| Nodo guardado                                                                                     | Se reconstruye como                                                       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `input` con fuente `input` (también el 0 sin tipear) u `override` (con `sugerido_de`), con número | `inputs[nodo]`                                                            |
| `constante`, `tipo_cambio`, tabla, tramo o cálculo sobrescribible con fuente `override`           | `overrides[nodo]` (un `tipo_cambio` sin valor, 0: «≤ 0 es sin valor»)     |
| `bandera` (guarda 1 o 0)                                                                          | `banderas[nodo]`, un booleano                                             |
| `opcion`                                                                                          | `variante` (la variante no tiene «sin tipear»: sin mandarla, la guardada) |
| fuente `sugerido` o `default`, valor nulo                                                         | nada: se recalcula                                                        |
| el `pct` de un par cuyo monto trae override («pisado»)                                            | nada: lo escribe el par con monto ÷ base                                  |
| un nodo apagado o fuera de la variante                                                            | nada                                                                      |

**El límite aceptado de D7:** lo oculto que se **deriva** de lo visible (un sugerido, un cálculo, el pct pisado) se recalcula, así que cambia con lo visible; el snapshot no guarda lo que se tipeó en un nodo inactivo (vale 0 y no tiene fuente), de modo que si lo visible lo reactiva vuelve sin tipear; y un input requerido y sin tipear queda así (el 0 «sin tipear» de un input no requerido cuenta como tipeado). Prueba: `evaluar(reconstruir(evaluar(E))) = evaluar(E)` en los casos con resultado del juego y del corpus del motor (`cotizacion-conservar.sql`). `cotizacion_evaluar(p_cotizacion := …)` hace lo mismo (`_cotizacion_conservar` con lo guardado que ARMAR devuelve) y acepta otro vehículo para el cálculo (una final no cambia): para la misma entrada, evaluar y guardar dan el mismo total y los mismos valores visibles (la prueba por nivel de `cotizaciones-visibilidad.sql`).

**El intento.** `p_intento` es un uuid que genera el cliente por cada guardado; vive en la revisión (`cotizaciones_revisiones.intento`, con la `huella`, un índice único por cotización e intento). Repetirlo, de la misma persona y con los mismos datos, devuelve lo guardado con `repetido: true` y **no cae en PT409** (la versión ya la movió ese mismo guardado); el mismo intento con otros datos, u otra persona, es 22023 `intento_reusado` («Ese guardado ya se hizo con otros datos. Recarga la cotización.»), nunca lo viejo en silencio. La huella es el `md5` de lo que mandó (la versión esperada, las entradas, el modo, el título, las notas y el vehículo). Dos con el mismo intento a la vez: la fila los ordena y el segundo ve la revisión del primero. **Ni `intento` ni `huella` se leen** (la huella se podría adivinar por fuerza bruta): `…008100` les quita el `select`.

**La versión.** `cotizaciones.actualizado_en` la sella `cotizacion_version()` (`…008000`) con `greatest(clock_timestamp(), anterior + 1 µs)`: se mueve también dos veces en la misma transacción y **no con los contadores de favoritos y reportes** (un favorito de cualquiera que la lee le daba PT409 a quien editaba). Vieja: `_conflicto_de_edicion()` (PT409 diciendo quién y cuándo); nula: «Falta la versión que tenías en pantalla».

**La revisión.** `cotizacion_revision()` (`…008100`) guarda, de `valores` y `fuentes`, **sólo los nodos que cambiaron** (`{de: {nodo}, a: {nodo}}`), incluidos los ocultos que cambian por derivación; `totales` y `tipos_cambio` enteros. `cotizacion_revisiones()` recorta cada columna al leer y lee las dos formas (las revisiones de antes llevan dos snapshots enteros): un guardado que sólo cambia lo oculto se lee, para quien no lo ve, con el `diff` vacío.

**D2, «desactualizada», en el alta** (`…008400` y `…008500`). El texto de D2 habla de «guardar una cotización **nueva**» y dice que «editar una vieja no avisa»: por eso vive en `cotizacion_crear()`, no en `cotizacion_guardar()`. `cotizacion_crear` recibe la versión de la hoja que se abrió y la hora (`p_formula_abierta`, `p_abierta_en`; los dará la lectura que abre la hoja, 4.13). La versión se compara **por id** (la hora de publicar es la de inicio de su transacción) y los tipos de cambio que la fórmula nombra, por `tipos_cambio_historial` (índice `(tipo_cambio_id, cambiado_en desc, id desc)`). Si la publicada de hoy es otra o una tarifa cambió: **PT409, `detail desactualizada`, `hint formula` o `tipo_cambio`**, sin guardar (no dice cuál tarifa: podría ser de un nodo oculto). «Usar la versión N+1» es que la hoja recalcule y vuelva a llamar con lo nuevo; **«Guardar con la N»** es `p_con_la_abierta := true`: se crea con la versión de la apertura (publicada o archivada del origen, `_cotizacion_abierta()`) y con las tarifas de entonces, que se congelan; sólo si la hoja se abrió hace menos de 24 h y esa versión dejó de ser la publicada hace menos de 24 h. `cotizacion_validar` deja nacer de una versión archivada (nunca de un borrador). El intento repetido vuelve antes que D2. Límites: una tarifa desactivada no se usa (su nodo queda sin valor) y el historial sella con la hora de inicio de su transacción.

**Orden de candados.** En este código los padres se toman antes que sus cotizaciones: la papelera de vehículos (también por lotes, en orden de id) toma el vehículo `for update` y después sus cotizaciones; purgar un lead lo toma `for update` y su `on delete set null` actualiza las cotizaciones. Por eso guardar **no** toma «cotización → lead → vehículo → fórmula»: toma **el vehículo actual y el nuevo (sólo si el vehículo cambia), `for key share`, en orden de id, y después la cotización `for no key update`**; ni el lead (guardar no crea una referencia a él) ni la fórmula (SU versión no cambia: `formulas` es append-only, así que publicar no espera a guardar ni al revés). Quien no puede editar o no ve el vehículo nuevo no toma ningún candado. Compatible con `cotizacion_crear` (intento → lead → vehículo → fórmula; no toma cotizaciones existentes) y con `cotizacion_marcar_final`, que desde `…008200` toma primero su cotización y las preventas de su vehículo. Si le cambian el vehículo mientras espera, la versión también cambió: PT409. Lo prueban las carreras de `scripts/carreras/cotizaciones-guardar.mjs` (incluido un lote de vehículos que se toma de a uno).

**Costos** (`medir-cotizacion-guardar.sql`, en `db:medir`; `docs/RENDIMIENTO.md`): con 50.000 y con 250.000 cotizaciones, iguales en las dos: 5,7 a 6,0 ms y 267 a 301 buffers la dueña, 6,4 a 6,5 y 291 a 316 la asesora, 6,4 a 6,7 y 293 a 327 cambiando de vehículo, 5 y 146 a 177 sin cambios, 1,8 y 54 a 63 el intento repetido y 42 ms y 404 a 446 buffers con la sintética de 200 nodos y 4 tablas de 1.000 filas; ninguna recorre `cotizaciones` ni sus revisiones. Topes de 20 ms y 1.500 buffers (60 y 1.000 la sintética).

## Lo que se guarda en una cotización

- `formula_id`: de qué versión salieron los defaults (auditoría). Recalcular o editar usa **esa** versión, nunca la vigente.
- `valores`: `{nodo_id: número | null}` de TODOS los nodos, lo que de verdad se usó.
  - El `opcion` guarda su clave (texto).
  - Un nodo de otra variante o con su condición apagada guarda 0.
  - El % de un par cuyo monto manda guarda monto ÷ base.
- `fuentes`: `{nodo_id: default|sugerido|override|input}`, uno por cada nodo que acepta un valor de la persona.
  - `default`: una constante o un tipo de cambio de la empresa.
  - `sugerido`: lo propuso una tabla, un tramo, un cálculo o `sugerido_de`; pinta el punto. Desde 4.05 reemplaza a `lookup`.
  - `override`: se cambió un default o un sugerido; pinta el anillo, y ↺ vuelve.
  - `input`: lo escribe la persona y no hay un sugerido en uso (tipeado sin `sugerido_de`, sin tipear, o requerido y sin tipear).
- `tipos_cambio`: `{clave: valor}` congelados.
- `totales`: por moneda y por grupo.
- **Nada de esto se lee directo** (desde el 4.10-1): `valores`, `fuentes`, `totales` y `tipos_cambio` salen por `cotizacion_leer()`, recortados por el nivel de quien lee; `total_base` y `modo_tc` sí son legibles.
- **Nada de esto se escribe directo** (desde el 4.10-2): se crea con `cotizacion_crear()` (arriba, «Quién escribe una cotización y cómo») y los nodos que quien crea no ve se guardan con el valor de la fórmula; se edita con `cotizacion_guardar()` («Cómo se guarda (4.10-3)»), que conserva lo que quien guarda no ve ni edita. `total_base` es el total en la moneda base de la empresa.

## Binding con la XCell

Cada `input`, `constante`, `tipo_cambio` y nodo `sobrescribible` es una `XCell` (el par porcentaje-monto es una sola, con su secundario): `value = valores[id]`, `defaultValue = defaults[id]`,
`suggested = fuentes[id] === 'sugerido'`, `disabledReason` si su `condicion` está apagada o es de otra variante,
`onHelp` si el nodo viene de una tabla (abre la tabla editable inline), `settingsSlot` (⚙) si es
`constante` y el usuario tiene `cotizaciones.configurar` del origen → `formula_cambiar_constante`, o si es
`tipo_cambio` y tiene `empresa.tipos_cambio.gestionar` → `tipo_cambio_guardar` (afecta a todos los orígenes; D7). Desde D7 el
binding sale del diseño de la hoja y de los niveles: una celda que el nivel esconde no se dibuja.
El ⚙ cambia el default global (versión N+1); «Aplicar también a esta cotización» es el único
puente hacia la cotización abierta.

**Lo que la `XCell` hace con el binding (4.12, prompt 1; `src/shared/ui/xcell/CLAUDE.md`).** Además de `value`, `defaultValue`, `suggested` y `disabledReason`, trae
**`overridden` = `fuentes[id] === 'override'`**: con un override el motor no calcula el sugerido (4-1) y `defaultValue` sólo existe para constantes y tipos de cambio, así que sin
esa bandera no se distingue «modificado» de «input». ↺ dice «Volver al valor por defecto» si hay `defaultValue` y «Volver al sugerido» si no, nunca con la cifra. El par es **una celda con
dos lados editables** (`secondaryId`, `secondaryValue`, `secondaryFormat`): cada lado emite `onCommit(suId, valor)` y ↺ emite `onReset(id)`; **la hoja traduce** (editar el % quita el override
del monto, porque si no el monto lo pisa; ↺ quita los dos). Emite sólo si el número cambió (a 15 cifras); vacío es `null`; un porcentaje se tipea en puntos y se emite como fracción.
**La celda no valida el rango, lo obligatorio ni lo entero: lo hace la base y su mensaje vuelve por `error`.** Los tonos llegan por `<EstiloDeTonos tonos>`, una vez por hoja, y la celda sólo
lleva `data-tono="<clave>"`. Una parada de `Tab` por valor; ↺ y, en el prompt 2, la ayuda y el ⚙ se alcanzan con `→` desde el valor: **las flechas son de la celda**, la hoja no las usa para moverse.

## Plantilla de tarjeta (PDF)

**Desde D7:** filas por grupo con el tono del grupo (o el que la plantilla elija del catálogo), celdas combinadas de tipo de cambio y plazo por grupo, título de la opción de la variante, «Asesor:», banda del vehículo, leyenda, logo de la empresa, banda de nota y la garantía condicionada a su interruptor; una etiqueta propia por fila. Sólo nodos del nivel «todos».

`plantillas_tarjeta.definicion`: `paleta`, `columnas[{id, ancho}]` (suma fija), `encabezado`,
`grupos` (bandas con filas; una fila puede ser `secciones` para volcar las secciones de la
fórmula), `totales`, `pie`. Las variables son los `id` de los nodos más `titulo`, `fecha`,
`asesor`, `cliente`, `vehiculo`, `ocultar_moneda` (Modo Live). Sin motor de expresiones: sólo
`{{id|formato}}`. Se renderiza a PDF en servidor con `@react-pdf/renderer`.
