# El cotizador: fórmula como grafo

La fórmula de un origen vive en `formulas.definicion` (jsonb) y se versiona entera. El motor TS
de `src/modules/cotizaciones/entities/motor.ts` la evalúa; `validar_formula()` en SQL es el
candado que impide publicar una fórmula rota. Ambos aplican las mismas reglas.

## Forma

```jsonc
{
  "nodos": [/* lista ORDENADA: el orden es el de evaluación; sólo se referencia hacia atrás */],
  "buckets": { "origen": "tc_paralelo", "destino": "tc_oficial" }, // bucket → id de nodo tipo_cambio
}
```

Cada nodo: `{ id, tipo, etiqueta, formato: usd|pct|raw|moneda, seccion?, bucket?: origen|destino|ninguno, salida?: total|base_imponible|aparte, color?: amarillo|verde|naranja, descripcion? }` más lo propio de su tipo:

| tipo             | campos propios                                                                       | valor                                                                        |
| ---------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `input`          | `sugerido_de?` (id), `requerido_si?` (id de bandera)                                 | lo tipea el asesor; vacío = 0 salvo `requerido`                              |
| `constante`      | —                                                                                    | `params[id]`; es el «valor por defecto global» que el ⚙ cambia (publica N+1) |
| `tipo_cambio`    | `clave` (oficial, paralelo…)                                                         | valor vigente de `tipos_cambio` al cotizar; se congela                       |
| `campo_vehiculo` | `campo` (anio, kilometraje, atributos.*)                                             | del vehículo vinculado; NULL si no hay                                       |
| `bandera`        | —                                                                                    | toggle de la cotización (`valores[id]` 0/1)                                  |
| `tabla`          | `tabla` (clave de `tablas_referencia`), `match` {col: id de nodo o campo}, `columna` | fila que matchea → columna; marca la celda como **sugerida**                 |
| `tramo`          | `tabla`, `sobre` (id), `columna`                                                     | fila cuyo `desde ≤ sobre ≤ hasta` → columna                                  |
| `calculo`        | `op`, `de` [ids], `pct?` (id), `condicion?` (id de bandera)                          | ver operaciones                                                              |

Operaciones cerradas de `calculo`: `suma(de)`, `porcentaje_de(de, pct)` = Σde × pct,
`multiplicar(de)`, `restar(de[0] − de[1…])`, `dividir(de[0] / de[1])`, `si(condicion, de[0])`,
`depreciar(de[0], tabla por año)`, `redondear(de[0], n)`.

Salidas: exactamente **un** nodo con `salida: total`. `base_imponible` se muestra pero no suma al
total; `aparte` (garantía) se muestra y nunca suma. Un nodo con `bucket` entra a la suma de su
bucket; `total_bob = Σ bucket × tipo de cambio del bucket`; `total_base` = suma en moneda base.

## Lo que cambia con la apertura de la Fase 4 (D4 y D5, 2026-10-22)

La forma de arriba es la de la Fase 0 y **la amplía el paso 4.05** (`docs/DECISIONES.md`, «Apertura de la Fase 4 — Cotizaciones»).
La referencia es el Excel que la hoja reemplaza (`docs/referencias/excel-de-cotizacion.md`).

- **Tipos de cambio:** `buckets` deja de ser sólo `origen` y `destino`. Una fórmula usa N tipos de cambio (en el Excel, oficial y
  paralelo) y cada fila o grupo elige el suyo.
- **Grupos:** los nodos se agrupan con un plazo de pago (texto) y un subtotal en USD y en Bs, como en el Excel.
- **Total en dólares:** es el total en Bs ÷ el tipo de cambio paralelo, no la suma de los dólares de las filas.
- **Sugerido:** un nodo puede ser sugerido (de una tabla o de un cálculo) y sobrescribible: la nacionalización y el factor de
  depreciación, que el Excel tipea a mano.
- **Fórmulas como texto:** quien configura escribe con nombres (`=(remate+fees)*4%`, `SUMA(grupo)`, `HOY()`) y el texto se compila a
  este mismo grafo **al configurar**. Al cotizar no se evalúa texto. Sin referencias A1 ni funciones que el grafo no tenga.
- **Tablas de referencia (D5):** editar una publica la N+1 de cada fórmula de su origen que la usa, y la fórmula congela en `params` las
  filas que usa.
- **`validar_formula()` y `validar.ts`** siguen siendo el candado, y cambian juntos.
- **Desde D7:** la variante es un nodo `opcion` (sus opciones con clave, etiqueta y título para la plantilla), y un nodo puede declarar
  `solo_en: [opciones]`. Cada grupo lleva la clave de su tono. Fuera de su variante, un nodo vale 0 y se dibuja deshabilitado con su
  motivo.

## Tipos de cambio y modos (D7, H1)

- Los tipos de cambio son **una lista de la empresa**: `tipos_cambio` (oficial, paralelo, unificado, aduana y los que se sumen), con
  `tipos_cambio_historial` y `empresa.tipos_cambio.gestionar`. Un nodo `tipo_cambio` nombra su clave; **la cotización congela** en
  `tipos_cambio` lo que usó.
- El asesor puede sobrescribir un tipo de cambio en su cotización si la celda es editable para su nivel (`fuente = override`, ↺). El ⚙
  de esa celda es `tipo_cambio_guardar`, que afecta a todos los orígenes, con «Aplicar también a esta cotización». Cambiarlo vuelve
  «desactualizada» una cotización nueva abierta (D2).
- Un **modo** (Aduana, Paralelo, Unificado…) lo declara el diseño: `{clave, nombre, buckets: {bucket: clave de tipo de cambio}, total_en:
clave}`. El modo elegido se guarda en `cotizaciones.modo_tc` (reemplaza «por bucket / uno solo» de D4).
- Cuentas de las capturas: Unificado convierte los grupos que no son de aduana al unificado y el de aduana al oficial, y divide el total
  en Bs por el unificado ($72.952, `docs/referencias/cotizador-actual.md`).

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

- `formula_id`: de qué versión salieron los defaults (auditoría). Recalcular/editar usa **esa**
  versión, nunca la vigente.
- `valores`: `{nodo_id: número}` de TODOS los nodos, lo que de verdad se usó.
- `fuentes`: `{nodo_id: default|override|lookup|input}` — pinta el anillo «modificado» y el punto
  «sugerido» de la XCell.
- `tipos_cambio`: `{clave: valor}` congelados. `totales`: por moneda y por bucket.

## Binding con la XCell

Cada `input` y `constante` es una `XCell`: `value = valores[id]`, `defaultValue = defaults[id]`,
`suggested = fuentes[id] === 'lookup'`, `disabledReason` si su `condicion` está apagada,
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
