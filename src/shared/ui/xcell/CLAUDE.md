# shared/ui/xcell

La celda de la hoja de cotizar (`docs/COTIZADOR.md` › «Binding con la XCell»; `docs/UX.md` › «Cotizar», 3). Dibuja y maneja **una** celda a partir de props:
no lee la base y **no calcula nada**. Dice «esta celda pasó a N» (`onCommit`) o «volver» (`onReset`) y la base recalcula (4.13). La hoja que la usa es el 4.13.

## Entra y sale

- Entra: `@/shared/lib` (`formato`, `color`, `campos/esquema-de-valor`), `../monto`, `../regional`, `../live`, `../lista/simbolos-de-lista` (los trazos de los iconos).
- Sale: `index.ts` → `XCell`, `EstiloDeTonos`, `SimbolosDeXCell` y los tipos. Nadie la importa todavía. `xcell.soporte.tsx` (`celda()`, `abrir()`, `BASE`) es **sólo de las pruebas**
  (importa vitest y testing-library; el sufijo `.soporte.` es el del repo, como `funcion-apibara.soporte.ts`, y `scripts/mapa.sh` no lo lista).
- La hoja monta **una vez** `<SimbolosDeXCell/>` (los iconos y la descripción que anuncia las flechas) y `<EstiloDeTonos tonos={…}/>` (las filas de `tonos`, que lee ella; `shared` no las busca).

## El contrato con la hoja (props primitivas)

`id, label, format ('monto'|'porcentaje'|'numero'), currency?, decimals?` (sólo la vista), `value, defaultValue?, suggested, overridden,
disabledReason?, tone?, error?, secondaryId?, secondaryValue?, secondaryFormat?, secondaryDecimals?, hasHelp?, hasSettings?, onHelp?(id), onSettings?(id), onCommit(id, valor|null), onReset(id)`.

- `suggested = fuentes[id] === 'sugerido'` y `overridden = fuentes[id] === 'override'`. **`overridden` no estaba en el binding**: con `value`, `defaultValue` y
  `suggested` no se distingue «modificado» de «input» en un sobrescribible (con un override el motor no calcula el sugerido, 4-1).
- `defaultValue` sólo decide la palabra de ↺: con él, «Volver al valor por defecto»; sin él, «Volver al sugerido». **Nunca la cifra** (4-1).
- Los callbacks son uno por hoja y estables: la celda está en `memo` y una hoja de cientos de celdas recalcula cada 150 ms. Un objeto o una función nuevos por
  render dibujan **todas** las celdas (`xcell-hoja.test.tsx` lo mide: cambiar una dibuja una).
- **El par porcentaje–monto es una celda con dos lados**, editables los dos: el principal es el nodo de la celda y el secundario es `secondaryId`. Cada uno emite
  `onCommit(suId, valor)`; ↺ emite `onReset(id)` con el id de la celda. **Es la hoja la que traduce:** editar el % quita el override del monto (si no, el monto lo
  pisa: `COTIZADOR.md` › «El par porcentaje-monto») y ↺ quita los dos.

## La ayuda y el ⚙ (4.12-2)

- `hasHelp` = la celda del diseño trae `ayuda` (una tabla **o** un texto: lo que abre lo decide la hoja); `hasSettings` = constante con `cotizaciones.configurar` del origen, o tipo de cambio con
  `empresa.tipos_cambio.gestionar`. **La celda no decide permisos ni abre nada: emite `onHelp(id)` / `onSettings(id)`** con el id de la celda (no el del secundario) y **no mueve el foco**; devolverlo al cerrar es de la hoja.
- Cada botón se dibuja con la bandera **y** el callback (`accionesDe()` en `estado.ts`): una bandera sin callback sería un botón muerto. Banderas y callbacks aparte, y **los mismos callbacks para todas las celdas**:
  un ternario por celda que cree una función nueva por render dibuja todas (`xcell-hoja.test.tsx`, el memo).
- **Deshabilitada:** la ayuda y el ⚙ **siguen** (no escriben en esta cotización: la ayuda informa y el ⚙ cambia el default global); ↺ se va. Si no corresponde (un tipo de cambio sin permiso), la hoja no manda `hasSettings`.
- **Modo Live:** siguen. Los botones no dicen cifras; lo que abran pasa sus cifras por `<Monto>` (4.13). La cabecera no lee `useLive()`: encender Live no la dibuja de nuevo.
- Nombres con el glosario y la etiqueta de la celda: «Ayuda de {label}» y «Cambiar el valor por defecto de {label}» (con ↺: «Volver al valor por defecto de {label}»). Iconos del sprite: `xcell-ayuda`, `xcell-ajustes`.
- **El atajo se anuncia.** El valor, con acciones, lleva `aria-keyshortcuts="ArrowRight"` (lo leen VoiceOver y algunos) **y** `aria-describedby` a «Más acciones con la flecha derecha.» (lo lee todo lector; NVDA y JAWS
  no leen `aria-keyshortcuts`). El texto vive **una vez por hoja** en `<SimbolosDeXCell/>` (`hidden`, que sigue contando para `aria-describedby`): 0 nodos por celda. Va después de la nota (el motivo del candado o el error).
  En los dos lados de un par; sin acciones, ni lo uno ni lo otro. Lo prueba `e2e/xcell-teclado.spec.ts` con la descripción que entrega CDP.
- Si la etiqueta no tiene 6 rem junto a las acciones (tres de 44 px al 200 % en 412 px), las acciones bajan a su fila, a la derecha: las palabras no se quiebran por la mitad. Entre acciones, 8 px (el contorno del foco ocupa 4).

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

- **Una parada de `Tab` por valor** (dos en un par). Las acciones (ayuda, ⚙ y ↺) llevan `tabIndex -1` y se alcanzan con `→` / `←` desde el valor,
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
- **Gestores de contraseñas (sólo con Live):** un campo de contraseña que se vacía solo invita a «Guardar contraseña». La entrada lleva `autoComplete="off"`, `data-1p-ignore` (1Password), `data-lpignore` (LastPass),
  `data-bwignore` (Bitwarden) y `data-form-type="other"` (Dashlane). **Chrome ignora `autocomplete="off"` en un `password` y no tiene marca propia: el riesgo queda. No se puede probar aquí** (el Chromium de Playwright no
  trae gestor): los tests afirman que las marcas están, no que Chrome no ofrezca guardar. Se descartó `autocomplete="one-time-code"` (el teclado del celular ofrecería los códigos de los SMS). Se mira a mano con un Chrome con sesión
  y Live encendido cuando la hoja (4.13) exista; si ofrece guardar, se decide de nuevo (con `type="text"` y sólo el CSS el valor queda en el árbol de accesibilidad: DECISIONES, «Paso 4.12 (1 de 2)», hb).
- **Tamaños:** la etiqueta se parte (`[overflow-wrap:anywhere]`), nunca se corta. La entrada ocupa la caja exacta del valor (sin salto) y mide 44 px en px con el dedo.
  El anillo del modificado es **interior** (`ring-inset`) y el foco, un contorno **exterior**: se ven a la vez.
- **Nodos por celda** (medidos, `xcell-hoja.test.tsx`): normal 8, par 9, sugerido 10, modificado 11, deshabilitado 11, con error 11; **la ayuda o el ⚙ suman 3 cada uno** (11; los dos, 14; modificado con los dos, 17;
  deshabilitado con los dos, 17); **par modificado con error, ayuda y ⚙: 21 (el peor)**. Iconos por sprite (`<SimbolosDeXCell/>`, 2 nodos cada uno). 300 celdas de la mezcla del banco, con acciones: **3.000** (tope 3.100;
  eran 2.688 sin ellas); la mezcla de `xcell-hoja.test.tsx`: 3.368 (tope 3.500). Un nodo más por celda son 300: lo ven los dos topes.

## Cómo se prueba

- Vitest (`xcell-*.test.tsx`, `estado.test.ts`, `tonos.test.tsx`): estados, teclado, lo tipeado, sin emisión falsa, el par, las flechas, la ayuda y el ⚙ (`xcell-acciones.test.tsx`), el atajo, las marcas de Live, el tono, el sprite (cada id existe), los nodos y el memo.
  **jsdom no reproduce dónde cae el primer carácter ni qué hace el navegador con un `keypress` ni a dónde va Tab:** eso lo prueba el e2e.
- e2e (`e2e/xcell-teclado.spec.ts`, `e2e/xcell-geometria.spec.ts`, en los dos proyectos): la celda sola, hidratada, en un **banco** que no es una ruta de `src/app`
  (`e2e/soporte/banco.ts` compila `banco-de-xcell.tsx` con el esbuild que trae `tsx` y lo sirve con `page.route`, con los estilos de `/ingreso`). Teclado de verdad, el atajo en la descripción del árbol de accesibilidad (CDP) y geometría
  (claro/oscuro, 100/200 %, 412/1.280 px; la celda más cargada con el foco en cada acción). Firefox no se prueba (los proyectos son Chromium).
