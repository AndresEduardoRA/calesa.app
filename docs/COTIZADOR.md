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
| `constante`      | `condicion?`. Ninguna se llama `tablas`                                                                                               | `params[id]`: el «valor por defecto global» que cambia el ⚙ (publica la N+1)  |
| `tipo_cambio`    | `clave` (oficial, paralelo…; una clave, un solo nodo)                                                                                 | el valor vigente de `tipos_cambio` al cotizar; se congela                     |
| `campo_vehiculo` | `campo` (`anio`, `atributos.*`)                                                                                                       | del vehículo vinculado; null si no hay                                        |
| `bandera`        | —                                                                                                                                     | el interruptor de la cotización, 0 o 1                                        |
| `opcion`         | `opciones: [{clave, etiqueta, titulo}]` (dos o más), `por_defecto?`. A lo sumo una por fórmula                                        | la clave elegida (texto). La nombran `solo_en` y un `match`, nunca un cálculo |
| `tabla`          | `tabla`, `match` {columna: nodo anterior o, si no hay uno con ese id, campo del vehículo}, `columna`, `sobrescribible?`, `condicion?` | la fila que coincide → la columna                                             |
| `tramo`          | `tabla`, `sobre` (un nodo), `columna`, `sobrescribible?`, `condicion?`                                                                | la fila cuyo `desde ≤ sobre ≤ hasta` → la columna                             |
| `calculo`        | `op` con su aridad, `sobrescribible?`, `condicion?`                                                                                   | la operación                                                                  |

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

**Fórmulas como texto (4.07):** quien configura escribe con nombres (`=(remate+fees)*4%`, `SUMA(grupo)`, `HOY()`). El texto se compila a
este grafo **al configurar**, y `SUMA(grupo)` pasa a un `suma` con los miembros del grupo. Al cotizar no se evalúa texto. No hay
referencias A1 ni funciones que el grafo no tenga.

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

**Después, 29 reglas cruzadas,** cada una con un código estable. El código es el contrato con la base; el texto es de cada lado
(`entities/motivos-de-formula.ts`). `donde` es el id del nodo, el grupo o la clave donde se rompe, y la base lo pone en `hint`.

| Regla                                                                        | Qué rechaza                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodo_duplicado`, `referencia_inexistente`                                   | dos nodos con el mismo id; nombrar un nodo que no existe (un `match` sin nodo es un campo del vehículo)                                                                       |
| `ciclo`, `referencia_hacia_adelante`                                         | un nodo que se usa a sí mismo; usar uno posterior, también `solo_en` antes del `opcion`. Sin ciclos por construcción                                                          |
| `referencia_de_tipo`                                                         | `condicion` o `requerido_si` que no nombran una bandera; un cálculo que nombra el `opcion`                                                                                    |
| `total_unico`, `total_fijo`, `total_no_es_monto`                             | cero o dos totales; un total con `solo_en`, `condicion` o `sobrescribible`; un total que no da un monto (un tipo de cambio, un campo, una bandera o la variante)              |
| `constante_sin_valor`, `param_sin_constante`                                 | una constante sin su valor; una clave de params que no es constante                                                                                                           |
| `par_mal_tipado`, `pct_compartido`                                           | un `porcentaje_de` que no es monto o cuyo `pct` no es pct; el `pct` de un par que no da un monto o no acepta un valor; otro nodo lee el `pct` de un par sobrescribible        |
| `tipo_de_cambio_repetido`, `tipo_de_cambio_inexistente`                      | dos nodos con la misma clave; `buckets` o `total_en` que no nombran un `tipo_cambio`                                                                                          |
| `bucket_inexistente`, `total_sin_tipo_de_cambio`                             | un nodo o un grupo con un bucket que no está; sin grupos, un total que no se puede repartir                                                                                   |
| `grupos_sin_total_en`, `grupo_duplicado`, `grupo_inexistente`, `grupo_vacio` | con grupos y sin `total_en`; dos grupos con un id; un nodo en un grupo que no existe; un grupo sin nodos                                                                      |
| `bucket_con_grupos`, `miembro_no_es_monto`, `miembro_con_salida`             | con grupos, un nodo con su bucket; un miembro que no da un monto (sólo `input`, `constante`, `tabla`, `tramo` y `calculo`) o no es usd o moneda; un miembro que es una salida |
| `doble_conteo`                                                               | un miembro que acumula otro miembro (un cálculo que no es `porcentaje_de`, o un `sugerido_de`, también a través de un nodo fuera del grupo)                                   |
| `opcion_repetida`, `opcion_clave_repetida`, `opcion_por_defecto_inexistente` | dos `opcion`; una clave repetida; un `por_defecto` que no es una opción                                                                                                       |
| `solo_en_sin_opcion`, `solo_en_opcion_inexistente`                           | `solo_en` sin variante; una clave que la variante no tiene                                                                                                                    |

- **Devuelve el primer rechazo**, en un orden fijo, como el `raise` de la base.
- **Es lineal en nodos y aristas.** Hace unas 12 pasadas por nodo y 6 por arista, y no recorre una lista dentro de otra: todo bucle y
  toda búsqueda pasan por el contador de `medidor.ts`.
  - La prueba de escala lo mira con 200 y 2.000 nodos: 6.525 y 65.565 visitas, 3,51 por unidad de tamaño.
- **Cada caso inválido del juego rompe una sola regla.** Se comprueba apagando las reglas de a una: los 29 códigos, el 2026-10-23
  (`docs/BITACORA.md`), y en el 4.05-3 `total_no_es_monto` (cuatro casos, uno por tipo) y el pct del par (cinco), que sin su chequeo
  dan «válida».

### En la base (4.05-4)

`validar_formula(definicion, params)` está en `supabase/migrations/20261019004900_validar_formula.sql`, y es STABLE desde `…005100`.
Hace lo mismo que `validarFormula()`.

- **El rechazo:** `22023`, con el código de la regla en DETAIL (PostgREST lo devuelve como `details`) y `donde` en HINT. Si no hay
  `donde`, no lleva HINT. El texto es el de `motivos-de-formula.ts`, pero no es contrato: sólo el código y `donde` lo son.
- **La forma (§0) copia el Zod comprobación por comprobación.** Cada una está marcada `/*Fnn*/` y pasa antes por `jsonb_typeof`:
  `->>` convierte `true` en un texto que pasa el patrón de un id. Cuenta los largos en code points, como Zod 4.6.5. Lee los números
  como JS: `abs(x) < 2^1024 − 2^970`, y `n` como `z.int()`.
- **Las reglas cruzadas (§1 a §7) van en el orden de TS,** una función por archivo de TS (`_formula_cambio_y_grupos`,
  `_formula_variante`).
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
  - Los 61 casos no dependen del orden, y el corpus se guarda en orden jsonb.
- **Una divergencia declarada,** con la base más estricta que TS: una clave `__proto__` en `buckets`, `match`, `tablas`, una fila o
  `params`. Zod la descarta en silencio. La base la rechaza como `forma` en las cuatro primeras, y en `params` como
  `param_sin_constante` (con `donde = __proto__`: pasa la forma porque su valor es un número, y no es una constante). Queda como
  **4-2** en `docs/PLAN.md`. El corpus no la lleva.
- **Las pruebas (`supabase/tests/validar-formula.sql`, en `pnpm db:probar`):**
  - los 61 casos de `casos-de-formula.json` y el corpus diferencial `corpus-de-formula.json` comparan regla y `donde`, y la base
    nunca acepta lo que Zod rechaza;
  - el corpus son 544 mutaciones deterministas de las 4 válidas, con uno, dos o tres defectos mezclados. Lo arman
    `corpus-de-formula.ts` y los `mutadores-*.ts`, y `corpus-de-formula.test.ts` lo regenera y lo compara con el guardado.
- **Las mutaciones (2026-10-23, `docs/BITACORA.md`): 110.**
  - Cada uno de los 30 códigos apagado tumba exactamente sus casos del juego y ninguno más.
  - Cada comprobación de forma tumba al menos un caso del corpus, salvo F01 y F50. Son equivalentes: un nodo o una definición que
    no es objeto no tiene `tipo` ni `nodos`, y la comprobación siguiente lo rechaza con el mismo `donde`.
  - Los seis cambios de orden no tocan los 61 casos (cada uno rompe una sola regla) y cada uno tumba al menos un caso del corpus.

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
| `vehiculo`     | por campo, tal cual lo escribe la fórmula (`anio`, `atributos.cilindrada`): número, texto o null                              |
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

## Tipos de cambio y modos (D7, H1)

- Los tipos de cambio son **una lista de la empresa**: `tipos_cambio` (oficial, paralelo, unificado, aduana y los que se sumen), con
  `tipos_cambio_historial` y `empresa.tipos_cambio.gestionar`. Un nodo `tipo_cambio` nombra su clave; **la cotización congela** en
  `tipos_cambio` lo que usó.
- El asesor puede sobrescribir un tipo de cambio en su cotización si la celda es editable para su nivel (`fuente = override`, ↺).
  - El ⚙ de esa celda es `tipo_cambio_guardar`, que afecta a todos los orígenes, con «Aplicar también a esta cotización».
  - Cambiarlo vuelve «desactualizada» una cotización nueva abierta (D2).
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

`formulas.diseno` (jsonb), versionado y publicado con la fórmula: entra en D5 y en «desactualizada». Lo validan el Zod de
`entities/diseno.ts` y `validar_diseno(def, diseno)` en la base, con un juego de prueba que los dos rechazan igual. **Declarativo:**
nada de CSS, clases, HTML ni hex.

- **`cabecera`:** los modos que se ofrecen (arriba) y si se ofrece «Ver total Bs».
- **`secciones[]`, en orden:** cada una con `id`, título opcional, `presentacion` (`principal` o `avanzado`; avanzado es un modal con su
  URL), `nivel_ver` y `nivel_editar` opcionales e `items[]`.
- **`items`**, de cinco tipos:
  - **`celda`**: `nodo`, `ancho` (`completo`, `mitad` o `tercio` de la sección), `secundario` (`porcentaje` o `monto`), `ayuda` (clave
    de tabla o texto), `nivel_ver` y `nivel_editar`. **El candado se deriva:** tipo de cambio de la empresa sin permiso de editarlo, un
    cálculo, una condición apagada, otra variante o un nivel que falta. Siempre dice su motivo.
  - **`atajos`**: un nodo de tabla, la columna que etiqueta y cuántas filas se ofrecen como chips (los años del factor de depreciación).
  - **`variante`**: el nodo `opcion`, como chips.
  - **`interruptor`**: un nodo `bandera` con `efecto` `habilita` (la fila se dibuja deshabilitada con su motivo cuando está apagado) o
    `muestra` (la garantía en la tarjeta y en la plantilla).
  - **`subtotal`**: un nodo de cálculo dibujado como franja (el «CIF (base imponible)» de «avanzado»).
- **`tarjeta_total`:** el nodo total y sus secundarios (la garantía, que es `aparte`). La tarjeta no se ubica en el diseño: es el
  resumen fijo de UX (al pie en el celular, al costado en escritorio).
- **El tono es del grupo de la fórmula**, una clave del catálogo `tonos` de la empresa (claro y oscuro: fondo, borde, tinta), con
  validación AA como `color_acento` (`src/shared/lib/color.ts`), sembrado desde los tokens de celda. La plantilla puede elegir otra
  clave para un grupo (H5).
- **Celular y 200 % sin un segundo diseño:**
  - un solo orden declarado, que es el orden del DOM, de lectura y del `Tab`;
  - cada sección es una grilla de 12 pistas con `@container`;
  - las secciones van en dos columnas si el contenedor mide 64 rem o más;
  - por debajo, una columna en el mismo orden, con `mitad` y `tercio` como `completo`;
  - como el corte es en rem del contenedor, el 200 % colapsa solo (`ui.md`: `minmax(0,1fr)`, `min-w-0`, y la etiqueta arriba del valor
    si la celda mide menos de 16 rem, nunca cortada).
- **Se asserta:**
  - **Zod y la base:**
    - cada nodo existe y aparece una vez;
    - toda `input` y `constante` está en una sección;
    - `solo_en` nombra opciones que existen;
    - `atajos` apunta a un nodo de tabla;
    - un nodo no aparece en dos secciones con niveles distintos;
    - los niveles existen y no están retirados.
  - **e2e** con los dos diseños de la semilla a 412 y 1.280 px, al 100 y al 200 %:
    - `sinScrollHorizontal()`;
    - `sinTextoCortado()` en cada etiqueta;
    - `aLaVistaSinDesplazar()` en el valor y los iconos;
    - el orden del DOM igual al declarado.

## Niveles de acceso (D7, H3 y H4)

- **Qué es un nivel:** una fila de `cotizaciones_niveles`, sembrada con «todos» y «costos».
  - Cada nivel, salvo «todos», genera dos permisos por origen, `cotizaciones.nivel.<clave>.ver` y `….editar`, que aparecen en la matriz
    de Roles.
  - «Todos» usa `cotizaciones.ver` y `cotizaciones.crear` o `cotizaciones.editar`.
  - Cómo nace, cómo se retira y por qué no rompe la regla del enforcement: `docs/DECISIONES.md`, «D7».
- **Al publicar, el diseño se compila a `formulas.visibilidad`** (`{nodo: {ver, editar}}`), que es lo único que lee la base.
- **Lo que no se ve no viaja:**
  - `revoke select (valores, fuentes, totales)` en `cotizaciones`;
  - `cotizacion_leer(id)` recorta por `_nodos_visibles(formula_id)` y siempre trae el total y las salidas `aparte`;
  - las revisiones se recortan por nodo;
  - `formula_para_cotizar(origen)` y la lectura de `formulas` son sólo para `cotizaciones.configurar`;
  - el PDF lee con `cotizacion_leer`, y `validar_plantilla` rechaza un nodo que no sea del nivel «todos»;
  - el comprobante se arma con lo mismo;
  - un inventario (como `numero-global.sql`) registra cada función que devuelve `valores`, `fuentes`, `diff` o `params`.
- **La hoja calcula en la base para todos:** `cotizacion_evaluar(origen o cotización, entradas)` (definer) usa `evaluar_formula()`,
  espejo de `motor.ts`, y devuelve sólo lo visible y el total. Guardar recalcula en la base y conserva lo que quien guarda no ve ni
  edita. El motor TS queda para el editor de la fórmula.
- **El límite:** un nodo restringido que es el único oculto de una suma visible se deduce restando. El editor del diseño lo avisa y
  no lo bloquea.
- **Prueba** (`cotizaciones-visibilidad.sql`): sin el permiso del nivel, la clave del nodo no llega por ninguna función del inventario,
  el total sí, y guardar sin mandarla la conserva; con el permiso, llega. «Ver como» no cambia lo que decide la base.

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

## Binding con la XCell

Cada `input`, `constante`, `tipo_cambio` y nodo `sobrescribible` es una `XCell` (el par porcentaje-monto es una sola, con su secundario): `value = valores[id]`, `defaultValue = defaults[id]`,
`suggested = fuentes[id] === 'sugerido'`, `disabledReason` si su `condicion` está apagada o es de otra variante,
`onHelp` si el nodo viene de una tabla (abre la tabla editable inline), `settingsSlot` (⚙) si es
`constante` y el usuario tiene `cotizaciones.configurar` del origen → `formula_cambiar_constante`, o si es
`tipo_cambio` y tiene `empresa.tipos_cambio.gestionar` → `tipo_cambio_guardar` (afecta a todos los orígenes; D7). Desde D7 el
binding sale del diseño de la hoja y de los niveles: una celda que el nivel esconde no se dibuja.
El ⚙ cambia el default global (versión N+1); «Aplicar también a esta cotización» es el único
puente hacia la cotización abierta.

## Plantilla de tarjeta (PDF)

**Desde D7:** filas por grupo con el tono del grupo (o el que la plantilla elija del catálogo), celdas combinadas de tipo de cambio y plazo por grupo, título de la opción de la variante, «Asesor:», banda del vehículo, leyenda, logo de la empresa, banda de nota y la garantía condicionada a su interruptor; una etiqueta propia por fila. Sólo nodos del nivel «todos».

`plantillas_tarjeta.definicion`: `paleta`, `columnas[{id, ancho}]` (suma fija), `encabezado`,
`grupos` (bandas con filas; una fila puede ser `secciones` para volcar las secciones de la
fórmula), `totales`, `pie`. Las variables son los `id` de los nodos más `titulo`, `fecha`,
`asesor`, `cliente`, `vehiculo`, `ocultar_moneda` (Modo Live). Sin motor de expresiones: sólo
`{{id|formato}}`. Se renderiza a PDF en servidor con `@react-pdf/renderer`.
