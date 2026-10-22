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

La forma de arriba es la de la Fase 0 y **la amplía el paso 4e** (`docs/DECISIONES.md`, «Apertura de la Fase 4 — Cotizaciones»).
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
`constante` y el usuario tiene `cotizaciones.configurar` del origen → `formula_cambiar_constante`.
El ⚙ cambia el default global (versión N+1); «Aplicar también a esta cotización» es el único
puente hacia la cotización abierta.

## Plantilla de tarjeta (PDF)

`plantillas_tarjeta.definicion`: `paleta`, `columnas[{id, ancho}]` (suma fija), `encabezado`,
`grupos` (bandas con filas; una fila puede ser `secciones` para volcar las secciones de la
fórmula), `totales`, `pie`. Las variables son los `id` de los nodos más `titulo`, `fecha`,
`asesor`, `cliente`, `vehiculo`, `ocultar_moneda` (Modo Live). Sin motor de expresiones: sólo
`{{id|formato}}`. Se renderiza a PDF en servidor con `@react-pdf/renderer`.
