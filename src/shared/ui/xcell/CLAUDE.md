# shared/ui/xcell

La celda de la hoja de cotizar (`docs/COTIZADOR.md` › «Binding con la XCell»; `docs/UX.md` › «Cotizar», 3). Dibuja y maneja **una** celda a partir de props:
no lee la base y **no calcula nada**. Dice «esta celda pasó a N» (`onCommit`) o «volver» (`onReset`) y la base recalcula (4.13). La hoja que la usa es el 4.13.

## Entra y sale

- Entra: `@/shared/lib` (`formato`, `color`, `campos/esquema-de-valor`), `../monto`, `../regional`, `../live`, `../lista/simbolos-de-lista` (los trazos de los iconos).
- Sale: `index.ts` → `XCell`, `EstiloDeTonos`, `SimbolosDeXCell` y los tipos. Nadie la importa todavía.
- La hoja monta **una vez** `<SimbolosDeXCell/>` y `<EstiloDeTonos tonos={…}/>` (las filas de `tonos`, que lee ella; `shared` no las busca).

## El contrato con la hoja (props primitivas)

`id, label, format ('monto'|'porcentaje'|'numero'), currency?, decimals?` (sólo la vista), `value, defaultValue?, suggested, overridden,
disabledReason?, tone?, error?, secondaryId?, secondaryValue?, secondaryFormat?, secondaryDecimals?, onCommit(id, valor|null), onReset(id)`.

- `suggested = fuentes[id] === 'sugerido'` y `overridden = fuentes[id] === 'override'`. **`overridden` no estaba en el binding**: con `value`, `defaultValue` y
  `suggested` no se distingue «modificado» de «input» en un sobrescribible (con un override el motor no calcula el sugerido, 4-1).
- `defaultValue` sólo decide la palabra de ↺: con él, «Volver al valor por defecto»; sin él, «Volver al sugerido». **Nunca la cifra** (4-1).
- Los callbacks son uno por hoja y estables: la celda está en `memo` y una hoja de cientos de celdas recalcula cada 150 ms. Un objeto o una función nuevos por
  render dibujan **todas** las celdas (`xcell-hoja.test.tsx` lo mide: cambiar una dibuja una).
- **El par porcentaje–monto es una celda con dos lados**, editables los dos: el principal es el nodo de la celda y el secundario es `secondaryId`. Cada uno emite
  `onCommit(suId, valor)`; ↺ emite `onReset(id)` con el id de la celda. **Es la hoja la que traduce:** editar el % quita el override del monto (si no, el monto lo
  pisa: `COTIZADOR.md` › «El par porcentaje-monto») y ↺ quita los dos.

## Estados (`data-estado`, suman)

`normal` · `sugerido` (punto + «Sugerido» para el lector, sin «Sugerido: X» junto al modificado) · `modificado` (anillo interior en la tinta + ↺) · `deshabilitado`
(candado + el motivo escrito, borde discontinuo; `aria-disabled`, no `disabled`: se lee y se alcanza con Tab, y no abre la edición). Ningún estado es sólo color.

## Qué emite y quién valida

- Emite sólo si **cambió**: el texto es otro que el que se abrió **y** el número leído, a 15 cifras, es otro que `value` a 15 cifras. Abrir y salir con Tab sin tocar nada
  no convierte un sugerido en override. El texto de edición lleva la precisión completa (`formatearParaEditar`), no los decimales con que se muestra.
- Vacío emite `null` (la hoja decide qué significa). Lo que no es un número finito («abc», «Infinity», «1e999», «1,2,3») no se emite: la edición sigue, con su aviso.
- **El rango, lo obligatorio y lo entero los valida la base** (`cotizacion_evaluar`, `_cotizacion_tipeado`); su mensaje llega por la prop `error`.
- Un porcentaje se tipea en puntos («14,94») y se emite como la fracción que guarda `valores` (0,1494), a 15 cifras: una unidad, no un cálculo.
- El número se lee con `aNumero` de `@/shared/lib/campos/esquema-de-valor` (coma o punto decimal), igual que los campos numéricos; se hace `trim` antes y se exige
  `Number.isFinite`. Heredado, y de ese parser compartido: «1e3» y «0x10» se leen, y «1.234» es 1,234 (`docs/PLAN.md`).

## Teclado

- **Una parada de `Tab` por valor** (dos en un par). Las acciones (↺, y en el prompt 2 la ayuda y el ⚙) llevan `tabIndex -1` y se alcanzan con `→` / `←` desde el valor,
  en el orden valor → secundario → ayuda → ⚙ → ↺; `Esc` en una acción vuelve al valor. Así «Tab avanza» es de celda en celda aunque la acción vaya antes en el DOM.
  Las flechas son **de la celda**: la hoja no las usa para moverse entre celdas. Dentro de la entrada abierta mueven el cursor.
- Tipear un carácter abre la edición con él (el `keydown` se frena: si no, el navegador lo inserta otra vez en la entrada que se monta, «55»); Enter, F2 y el clic abren con
  el valor seleccionado; Retroceso o Supr abren vacía.
- Enter confirma y devuelve el foco al valor (el `keydown` se frena: si no, su `keypress` cae en el botón que ocupa su lugar y vuelve a abrir). `Esc` cancela (y no sube al modal
  que contiene la celda). `Tab` confirma **sin** frenar el keydown y la entrada se va cuando pierde el foco: desmontarla antes deja al navegador sin lugar de partida.
  Con un texto que no es un número, Enter y Tab no avanzan. Un clic afuera confirma un número y descarta lo demás.
- El foco vuelve al botón por un ref que sólo se marca al cerrar una edición: montar 300 celdas no le roba el foco a la página.

## Tono, Modo Live y tamaños

- **El tono:** la celda sólo pone `data-tono="<clave>"` y lee `--tono-fondo|borde|tinta`; `<EstiloDeTonos>` los escribe por clave, en claro y en `.dark`, desde las filas de `tonos`
  (AA validado en la base, `…005700_tonos.sql`). Una clave desconocida no casa con ninguna regla y cae a los tokens neutros. `cssDeTonos()` valida con Zod (la clave de
  `_tono_clave()` y `#rrggbb`) y descarta el tono entero si algo falla: nada que no sea validado llega al `<style>`. Todo lo que dice la celda va en la tinta.
- **Modo Live:** el valor sin editar pasa por `<Monto>`. La entrada abierta es `type="password"` con el modo encendido: `-webkit-text-security` tapa lo que se dibuja pero
  el valor sigue en el árbol de accesibilidad (medido con CDP, `e2e/xcell-geometria.spec.ts`).
- **Tamaños:** la etiqueta se parte (`[overflow-wrap:anywhere]`), nunca se corta. La entrada ocupa la caja exacta del valor (sin salto) y mide 44 px en px con el dedo.
  El anillo del modificado es **interior** (`ring-inset`) y el foco, un contorno **exterior**: se ven a la vez.
- **Nodos por celda** (medidos, `xcell-hoja.test.tsx`): normal 8, par 9, modificado 11, deshabilitado 11, par modificado con error 15 (el peor). Iconos por sprite
  (`<SimbolosDeXCell/>`, 2 nodos cada uno). Una hoja de 300 celdas de la mezcla del banco: 2.688. El prompt 2 suma la ayuda y el ⚙ a la misma ranura y vuelve a medir.

## Cómo se prueba

- Vitest (`xcell-*.test.tsx`, `estado.test.ts`, `tonos.test.tsx`): estados, teclado, lo tipeado, sin emisión falsa, el par, las flechas, el tono, el sprite, los nodos y el memo.
  **jsdom no reproduce dónde cae el primer carácter ni qué hace el navegador con un `keypress` ni a dónde va Tab:** eso lo prueba el e2e.
- e2e (`e2e/xcell-teclado.spec.ts`, `e2e/xcell-geometria.spec.ts`, en los dos proyectos): la celda sola, hidratada, en un **banco** que no es una ruta de `src/app`
  (`e2e/soporte/banco.ts` compila `banco-de-xcell.tsx` con el esbuild que trae `tsx` y lo sirve con `page.route`, con los estilos de `/ingreso`). Teclado de verdad y geometría
  (claro/oscuro, 100/200 %, 412/1.280 px). Firefox no se prueba (los proyectos son Chromium).
