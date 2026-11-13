# shared/ui/xcell

La celda de la hoja de cotizar (`docs/COTIZADOR.md` › «Binding con la XCell»; `docs/UX.md` › «Cotizar», 3). Dibuja y maneja **una** celda a partir de props:
no lee la base y **no calcula nada**. Dice «esta celda pasó a N» (`onCommit`) o «volver» (`onReset`) y la base recalcula.

## Entra y sale

- Entra: `@/shared/lib` (`formato`, `color`, `numero-tipeado`), `../monto`, `../regional`, `../live`, `../lista/simbolos-de-lista` (los trazos de los iconos).
- Sale: `index.ts` → `XCell`, `EstiloDeTonos`, `SimbolosDeXCell` y los tipos; la usa la hoja de `cotizaciones`. `xcell.soporte.tsx` (`celda()`, `abrir()`,
  `BASE`) es **sólo de las pruebas** (importa vitest y testing-library; `scripts/mapa.sh` no lista los `.soporte.`).
- La hoja monta **una vez** `<SimbolosDeXCell/>` (los iconos y la descripción que anuncia las flechas) y `<EstiloDeTonos tonos={…}/>` (las filas de
  `tonos`, que lee ella; `shared` no las busca).

## El contrato con la hoja (props primitivas)

`id, label, format ('monto'|'porcentaje'|'numero'), currency?, decimals?` (sólo la vista), `value, defaultValue?, suggested, overridden,
disabledReason?, secondaryDisabledReason?, tone?, error?, secondaryId?, secondaryValue?, secondaryFormat?, secondaryDecimals?, hasHelp?, hasSettings?, onHelp?(id), onSettings?(id), onCommit(id, valor|null), onReset(id)`.

- `suggested = fuentes[id] === 'sugerido'` y `overridden = fuentes[id] === 'override'`: con `value`, `defaultValue` y `suggested` no se distingue
  «modificado» de «input» en un sobrescribible (con un override el motor no calcula el sugerido).
- **Un candado por lado.** `disabledReason` es el del principal (sin par, el de la celda) y `secondaryDisabledReason` el del secundario. Un lado bloqueado
  lleva `aria-disabled` (se alcanza con Tab y se lee) y no abre la edición (ni clic, ni un carácter, ni F2, ni Retroceso); si se bloquea **el lado que se
  edita**, la edición se va en el render; si se bloquea el otro, sigue. Con **todos** los lados bloqueados la celda es `deshabilitado` (borde discontinuo,
  sin ↺); con uno solo, el borde discontinuo es de la caja de ese botón y ↺ sigue con `overridden`. Las guardas son tres (abrir, las teclas y el render).
- `defaultValue` sólo decide la palabra de ↺: con él, «Volver al valor por defecto»; sin él, «Volver al sugerido». **Nunca la cifra.**
- Los callbacks son uno por hoja y estables: la celda está en `memo` y la hoja recalcula cada 150 ms. Un objeto o una función nuevos por render dibujan
  **todas** las celdas (`xcell-hoja.test.tsx`: cambiar una dibuja una).
- **El par porcentaje–monto es una celda con dos lados**, editables los dos: el principal es el nodo de la celda y el secundario `secondaryId`. Cada uno
  emite `onCommit(suId, valor)`; ↺ emite `onReset(id)` con el id de la celda. **La hoja traduce:** editar el % quita el override del monto (`COTIZADOR.md` ›
  «El par porcentaje-monto») y ↺ quita los dos.

## La ayuda y el ⚙

- `hasHelp` = la celda del diseño trae `ayuda` (tabla **o** texto: lo decide la hoja); `hasSettings` = constante con `cotizaciones.configurar` del origen, o
  tipo de cambio con `empresa.tipos_cambio.gestionar`. **La celda no decide permisos ni abre nada: emite `onHelp(id)` / `onSettings(id)`** con el id de la
  celda (no el del secundario) y **no mueve el foco**; devolverlo al cerrar es de la hoja.
- Cada botón se dibuja con la bandera **y** el callback (`accionesDe()` en `estado.ts`): una bandera sin callback sería un botón muerto. **Los mismos
  callbacks para todas las celdas**: un ternario por celda que cree una función por render dibuja todas.
- **Deshabilitada:** la ayuda y el ⚙ **siguen** (no escriben en esta cotización); ↺ se va. Si no corresponde, la hoja no manda `hasSettings`.
- **Modo Live:** siguen. Los botones no dicen cifras; lo que abran pasa sus cifras por `<Monto>` cuando es una celda de dinero (un factor `raw` de la
  ayuda de una tabla queda a la vista). La cabecera no lee `useLive()`: encender Live no la dibuja de nuevo.
- Nombres: «Ayuda de {label}», «Cambiar el valor por defecto de {label}», «Volver al valor por defecto de {label}». Iconos del sprite: `xcell-ayuda`,
  `xcell-ajustes`.
- **El atajo se anuncia.** El valor, con acciones, lleva `aria-keyshortcuts="ArrowRight"` **y** `aria-describedby` a «Más acciones con la flecha derecha.»
  (NVDA y JAWS no leen `aria-keyshortcuts`). El texto vive **una vez por hoja** en `<SimbolosDeXCell/>` (`hidden`, que sigue contando para
  `aria-describedby`), después de la nota. En los dos lados de un par; sin acciones, nada. Lo prueba `e2e/xcell-teclado.spec.ts` con CDP.
- Si la etiqueta no tiene 6 rem junto a las acciones (tres de 44 px al 200 % en 412 px), las acciones bajan a su fila, a la derecha. Entre acciones, 8 px
  (el contorno del foco ocupa 4).

## Estados (`data-estado`, suman)

`normal` · `sugerido` (punto + «Sugerido» para el lector) · `modificado` (anillo interior en la tinta + ↺) · `deshabilitado` (candado + el motivo escrito,
borde discontinuo; `aria-disabled`, no `disabled`), **sólo con todos los lados bloqueados**. Ningún estado es sólo color.

**Las notas (`notasDe()` en `estado.ts`).** Primero el aviso de lo tipeado o, si no hay, el `error` (`role=alert`): describe a todos los lados. Después el
candado de cada lado bloqueado, **una nota por texto distinto**. El error y un candado **conviven**. Cada botón describe, en orden, el aviso o el error,
**su** candado y el atajo; la entrada abierta, sólo el aviso o el error.

## Qué emite y quién valida

- Emite sólo si **cambió**: el texto es otro que el que se abrió **y** el número, a 15 cifras, es otro que `value` a 15 cifras. Abrir y salir con Tab no
  convierte un sugerido en override. El texto de edición lleva la precisión completa (`formatearParaEditar`).
- Vacío emite `null` (la hoja decide qué significa). Lo que no es un número finito no se emite: la edición sigue, con su aviso.
- **El rango, lo obligatorio y lo entero no los valida la celda:** `cotizacion_evaluar` los dice en `faltantes` (`fuera_de_rango`, `requerido_sin_valor`)
  con el valor en null, y la hoja los traduce (`textoDelFaltante()` de `cotizaciones`) y los pasa por `error`.
- Un porcentaje se tipea en puntos («14,94») y se emite como la fracción que guarda `valores` (0,1494), a 15 cifras.
- **El número se lee con `leerNumeroTipeado`** (`@/shared/lib/numero-tipeado`) y el locale de la empresa (`useRegional()`): en es-BO «1.234» es 1234, «1,5»
  es 1,5 y «1.5» no se emite («Usa coma para los decimales: 1,5.»); «1e3», «0x10» e «Infinity» no son números («Escribe un número, por ejemplo 1234,5.»).

## Teclado

- **Una parada de `Tab` por valor** (dos en un par). Las acciones llevan `tabIndex -1` y se alcanzan con `→` / `←` desde el valor (valor → secundario →
  ayuda → ⚙ → ↺); `Esc` en una acción vuelve al valor. Las flechas son **de la celda**: la hoja no las usa entre celdas; en la entrada mueven el cursor.
- Tipear un carácter abre la edición con él (el `keydown` se frena: si no, se inserta dos veces, «55»); Enter, F2 y el clic abren con el valor
  seleccionado; Retroceso o Supr abren vacía.
- Enter confirma y devuelve el foco al valor (el `keydown` se frena: si no, su `keypress` vuelve a abrir). `Esc` cancela (y no sube al modal). `Tab`
  confirma **sin** frenar el keydown y la entrada se va al perder el foco: desmontarla antes deja al navegador sin lugar de partida. Con un texto que no es
  un número, Enter y Tab no avanzan. Un clic afuera confirma un número y descarta lo demás.
- El foco vuelve al botón por un ref que sólo se marca al cerrar una edición: montar 300 celdas no le roba el foco a la página.

## Tono, Modo Live y tamaños

- **El tono:** la celda sólo pone `data-tono="<clave>"` y lee `--tono-fondo|borde|tinta`; `<EstiloDeTonos>` los escribe por clave, en claro y en `.dark`,
  desde las filas de `tonos` (AA validado en la base, `_tono_colores()`). Una clave desconocida cae a los tokens neutros. `cssDeTonos()` valida con Zod (la
  clave de `_tono_clave()` y `#rrggbb`) y descarta el tono entero si algo falla: al `<style>` no llega nada sin validar. Todo lo que dice la celda va en la
  tinta.
- **Modo Live:** el valor sin editar pasa por `<Monto>`. La entrada abierta es `type="password"` con el modo encendido: `-webkit-text-security` tapa lo
  dibujado pero el valor sigue en el árbol de accesibilidad (`e2e/xcell-geometria.spec.ts`).
- **Gestores de contraseñas (sólo con Live):** la entrada lleva `autoComplete="off"`, `data-1p-ignore`, `data-lpignore`, `data-bwignore` y
  `data-form-type="other"`. **Chrome ignora `autocomplete="off"` en un `password` y no tiene marca propia: el riesgo queda** y no se puede probar (el
  Chromium de Playwright no trae gestor); los tests afirman que las marcas están. Descartados: `autocomplete="one-time-code"` (el celular ofrecería los
  códigos de los SMS) y `type="text"` con sólo el CSS (el valor queda en el árbol de accesibilidad; `docs/DECISIONES.md`).
- **Tamaños:** la etiqueta se parte (`[overflow-wrap:anywhere]`), nunca se corta. La entrada ocupa la caja exacta del valor y mide 44 px en px. El anillo del
  modificado es **interior** (`ring-inset`) y el foco, un contorno **exterior**: se ven a la vez.
- **Nodos por celda:** los fija `xcell-hoja.test.tsx` (normal 8, par 9; la ayuda o el ⚙ suman 3 cada uno; el peor, par modificado con un lado bloqueado,
  error, ayuda y ⚙: 24). Iconos por sprite (2 nodos cada uno). Topes de 300 celdas: 3.100 en el banco (`e2e/xcell-teclado.spec.ts`) y 3.500 en la mezcla de
  `xcell-hoja.test.tsx`. Un nodo más por celda son 300: lo ven los dos.

## Cómo se prueba

- Vitest (`xcell-*.test.tsx`, `estado.test.ts`, `tonos.test.tsx`): estados, teclado, sin emisión falsa, el par y sus candados, las flechas, la ayuda y el ⚙,
  el atajo, las marcas de Live, el tono, el sprite, los nodos y el memo. **jsdom no reproduce dónde cae el primer carácter, el `keypress` ni a dónde va
  Tab:** eso lo prueba el e2e.
- e2e (`e2e/xcell-teclado.spec.ts`, `e2e/xcell-geometria.spec.ts`, en los dos proyectos): la celda sola en un **banco** que no es una ruta de `src/app`
  (`e2e/soporte/banco.ts` compila `banco-de-xcell.tsx` con el esbuild de `tsx` y lo sirve con `page.route`). Teclado de verdad, el atajo en el árbol de
  accesibilidad (CDP) y geometría (claro/oscuro, 100/200 %, 412/1.280 px). Firefox no se prueba.
