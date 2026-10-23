# El cotizador: fórmula como grafo

La fórmula de un origen vive en `formulas.definicion` y `formulas.params` (jsonb) y se versiona entera. El candado que impide publicar
una fórmula rota es doble y aplica las mismas reglas: `validar.ts` (`src/modules/cotizaciones/entities/`) y `validar_formula()` en la
base. Los dos comparten un juego de prueba, `entities/casos-de-formula.json`. La evalúan el motor TS (`entities/motor.ts`, 4.05) y
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
  - Ningún otro nodo lee ese `pct`.

### La variante y el interruptor

- **La evaluación es una sola pasada en el orden de la lista.** Un nodo que no está en su variante (`solo_en`), o cuya `condicion` está
  apagada:
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

**Después, 28 reglas cruzadas,** cada una con un código estable. El código es el contrato con la base; el texto es de cada lado
(`entities/motivos-de-formula.ts`). `donde` es el id del nodo, el grupo o la clave donde se rompe, y la base lo pone en `hint`.

| Regla                                                                        | Qué rechaza                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodo_duplicado`, `referencia_inexistente`                                   | dos nodos con el mismo id; nombrar un nodo que no existe (un `match` sin nodo es un campo del vehículo)                                                                       |
| `ciclo`, `referencia_hacia_adelante`                                         | un nodo que se usa a sí mismo; usar uno posterior, también `solo_en` antes del `opcion`. Sin ciclos por construcción                                                          |
| `referencia_de_tipo`                                                         | `condicion` o `requerido_si` que no nombran una bandera; un cálculo que nombra el `opcion`                                                                                    |
| `total_unico`, `total_fijo`                                                  | cero o dos totales; un total con `solo_en`, `condicion` o `sobrescribible`                                                                                                    |
| `constante_sin_valor`, `param_sin_constante`                                 | una constante sin su valor; una clave de params que no es constante                                                                                                           |
| `par_mal_tipado`, `pct_compartido`                                           | un `porcentaje_de` que no es monto o cuyo `pct` no es pct; otro nodo lee el `pct` de un par sobrescribible                                                                    |
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
  (`docs/BITACORA.md`).

## El motor (4.05, prompt 2)

`evaluar(formula, entrada, modo?, medidor?)` en `entities/motor.ts`. Es puro: sin I/O, sin fecha, sin azar, sin leer la base.
`formula` es la salida de `validarFormula()`. `evaluar_formula()` (4.06) es su espejo, y los dos comparten el juego
`entities/casos-del-motor.json`: cada caso con su fórmula (o el nombre de un caso de `casos-de-formula.json`), su entrada, su modo y
lo esperado, hecho a mano.

**La entrada** (`esquemaEntrada`, en `motor-entrada.ts`):

| Campo          | Qué es                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| `inputs`       | lo tipeado, por id de nodo `input`; lo que no está vale 0. Una clave que no es un `input` es un error |
| `banderas`     | por id de nodo `bandera`; lo que no está, apagada. Una clave que no es una `bandera` es un error      |
| `tipos_cambio` | por clave (oficial, paralelo…), mayores que 0: la forma de `cotizaciones.tipos_cambio`                |
| `vehiculo`     | por campo, tal cual lo escribe la fórmula (`anio`, `atributos.cilindrada`): número, texto o null      |
| `tablas`       | las vivas, por clave; la congelada de `params.tablas` manda                                           |

**El resultado:**

- `valores`: todos los nodos, en el orden de la lista; null cuando falta algo que lo alcanza.
- `fuentes`: vacío hasta el prompt 3, que lo llena.
- `totales`:
  - `grupos`: `{usd, bs}` de cada grupo, en el orden de `grupos`;
  - `bs`;
  - `usd`: Bs ÷ tc(`total_en`). Sin `total_en` y sin modo (la Fase 0), es la suma de los dólares;
  - `suma_usd`: el nodo `salida: total`.
- `faltantes`: `{codigo, donde, ref?}`, uno por cada null que nace, en el orden en que nace.

**Los errores de llamada lanzan** `ErrorDelMotor` con su `codigo`:

- `modo_invalido`: un modo que nombra algo que no es un `tipo_cambio` de la fórmula o no cubre un bucket que se usa;
- `entrada_invalida`;
- `formula_sin_validar`;
- `rasgo_pendiente` (abajo).

Lo que puede causar una persona no lanza: viaja como `faltantes`.

### Qué pasa cuando falta algo

| Situación                                                                             | Valor                            | En `faltantes` (`donde` / `ref`)                                    |
| ------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| Input sin valor tipeado                                                               | **0** (la celda vacía del Excel) | —                                                                   |
| Bandera sin valor                                                                     | **0** (apagada)                  | —                                                                   |
| `campo_vehiculo` sin valor (no está, es null o no es número)                          | null                             | `campo_sin_valor` (el nodo / el campo)                              |
| `match` sobre un campo del vehículo que no está o es null                             | null                             | `campo_sin_valor` (la tabla / el campo; si faltan varios, el menor) |
| Tabla sin filas: ni congelada ni viva, o la que manda está vacía                      | null                             | `tabla_sin_filas` (el nodo / la clave de la tabla)                  |
| Ninguna fila coincide (`tabla`, `tramo`, `depreciar`)                                 | null                             | `fila_sin_coincidencia` (el nodo / la tabla)                        |
| La celda no es un número (null, que es la «X» del Excel; texto; o la columna no está) | null                             | `celda_sin_valor` (el nodo / la tabla)                              |
| `dividir` por 0                                                                       | null                             | `division_por_cero` (el nodo)                                       |
| Tipo de cambio ausente o ≤ 0                                                          | null                             | `tipo_de_cambio_sin_valor` (el nodo / la clave)                     |
| Un resultado no finito (desborde)                                                     | null                             | `fuera_de_rango` (el nodo, el grupo o `total`)                      |
| Un nodo lee un null                                                                   | null                             | nada nuevo: el faltante es de donde nació                           |
| `condicion` apagada (también la del `si`)                                             | **0, sin leer sus referencias**  | — (ahí el null **no** se propaga)                                   |

- **Un nodo anota a lo sumo un faltante**, el primero en este orden: tabla sin filas, campo sin valor, fila sin coincidencia, celda
  sin valor.
- **Los totales:**
  - el USD de un grupo es null si lo es un miembro;
  - su Bs, si lo es su USD o su tipo de cambio;
  - el total en Bs, si lo es el Bs de un grupo (o, sin grupos, un término del reparto o su tipo de cambio);
  - el total en USD, si lo es el total en Bs o tc(`total_en`).
- **Los códigos** (`CODIGOS_DE_FALTANTE`, en `motor-contexto.ts`) son el contrato con la base; el texto lo pone la interfaz.

### La aritmética

- **Dobles (float8), de izquierda a derecha en el orden de `de`:**
  - `suma` = ((d0 + d1) + d2)…;
  - `restar` = ((d0 − d1) − d2)…, nunca d0 − Σresto;
  - `multiplicar` = ((d0 × d1) × d2)…;
  - `porcentaje_de` = (Σde) × pct.
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
  nodo anterior con ese id o, si no hay, el campo del vehículo.
  - **La igualdad es estricta y sin conversión** (2024 ≠ "2024", "Moto" ≠ "moto"), como la de jsonb.
  - Un `match` vacío da la primera fila.
  - Un `match` que nombra un nodo null da null, sin faltante nuevo.
- **`tramo`:** la primera fila con `desde ≤ sobre ≤ hasta`, los dos extremos incluidos. Una fila sin `desde` o sin `hasta` numérico
  no coincide nunca: no hay extremos abiertos (la semilla usa 1900 y 2100).
- **`depreciar(d0, tabla, sobre, columna)` = d0 × el `tramo` de esa tabla.** Tiene los mismos campos que un `tramo`, y la depreciación
  del Excel son rangos con un mismo factor (2018–2021 = 0,328). Hoy nadie lo usa: el seed y el Excel hacen `tabla` + `multiplicar`.

### Lo que el 4.06 tiene que copiar

- Sumar con un bucle en el orden de la lista: `sum()` sin `order by` no garantiza el orden.
- Redondear con `round(x::numeric, n)::float8`.
- Elegir la primera fila por `orden` (las congeladas, por su posición en el arreglo).
- Comparar el `match` como jsonb. jsonb no guarda el orden de las claves, por eso el faltante de varios campos nombra el menor (en
  orden de código, `collate "C"`).
- Guardar −0 como 0.

### Lo que todavía no evalúa (lanza `rasgo_pendiente`, y el prompt 3 lo quita)

- un nodo `opcion`;
- algún `solo_en`;
- algún `sobrescribible` (también el par porcentaje-monto);
- algún `requerido_si`;
- un `input` con `sugerido_de` **sin valor tipeado**. Con valor tipeado el número no depende del sugerido: así se evalúa la semilla
  `subasta_usa`, cuyo `fob_tabla` lo lleva.

Por eso el Excel entero y «Amnistia» lanzan (tienen variante). Sus cifras quedan para el 3 y el 4. El juego trae la moto y la gasolina
del Excel como fórmulas de prueba sin variante.

### Escala

Una pasada por los nodos más unas pocas por la entrada y los grupos, y una búsqueda de tabla recorre sus filas una vez. Todo bucle y
toda búsqueda pasan por `medidor.ts`.

- **La prueba** usa una sintética de 200 y 2.000 nodos, con dos tablas de 50 filas: 9.196 y 94.764 visitas, 1,38 por unidad de tamaño
  y ×10,31.
- **El tamaño** es nodos + aristas + grupos + claves de la entrada y de params + filas × (1 + columnas comparadas).
- **k = 9** se fija por la cuenta de pasadas: lo que más cuesta es un nodo `tabla` de un grupo, con su condición.

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
  - `input`: se tipeó y no había nada que sugerir.
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
