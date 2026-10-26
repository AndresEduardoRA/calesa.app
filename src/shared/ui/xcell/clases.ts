// Las clases de la celda. El botón del valor y la entrada que lo reemplaza comparten CAJA: mismo tamaño, relleno, letra y alto de línea,
// así abrir la edición no mueve nada. Los colores salen de `--tono-*` (lo escribe `<EstiloDeTonos>`) y, sin tono, de los tokens neutros.
export const TINTA = 'text-[color:var(--tono-tinta,var(--color-ink))]'

// 44 px EN PX con el dedo (no `size-11`, que es rem y crece con el texto), y compacto sólo con puntero fino desde 768 px.
const BLANCO_TACTIL = 'min-h-[44px] md:pointer-fine:min-h-8'

export const RAIZ =
  'flex flex-wrap items-start gap-x-2 gap-y-1.5 rounded-md border p-2 text-sm border-[color:var(--tono-borde,var(--color-line-strong))] bg-[color:var(--tono-fondo,var(--color-surface))] data-[estado~=deshabilitado]:border-dashed ' +
  TINTA

// La cabecera se parte en dos filas cuando la etiqueta no tiene 6 rem junto a las acciones (tres de 44 px al 200 %): las palabras no se quiebran por la mitad.
export const CABECERA = 'flex min-w-0 basis-full flex-wrap items-start justify-between gap-1'
export const ETIQUETA = 'min-w-[6rem] flex-1 py-1 font-medium [overflow-wrap:anywhere]'
// Las acciones se separan 8 px, como los valores: el contorno del foco de una ocupa 4 y no toca a la vecina.
export const ACCIONES = 'ml-auto flex shrink-0 items-center gap-2'

export const CAJA = `${BLANCO_TACTIL} block w-full min-w-0 flex-1 basis-28 rounded-sm border-0 px-2 py-1 text-right text-sm leading-5 tabular-nums [overflow-wrap:anywhere]`

// El foco es un contorno EXTERIOR, en el `-ink` del color primario (≥ 3:1 sobre la superficie en claro y en oscuro; el primario a secas da 2,8:1 en oscuro);
// el «modificado» es un anillo INTERIOR en la tinta: no se confunden y se ven a la vez. Los controles de una celda se separan 8 px: el contorno ocupa 4.
export const FOCO =
  'outline-offset-2 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-(--color-primario-ink)'

export const BOTON_DEL_VALOR = `${CAJA} ${FOCO} ${TINTA} cursor-text bg-transparent hover:bg-black/5 dark:hover:bg-white/10 group-data-[estado~=modificado]/xc:ring-2 group-data-[estado~=modificado]/xc:ring-inset group-data-[estado~=modificado]/xc:ring-[color:var(--tono-tinta,var(--color-ink))] aria-disabled:cursor-not-allowed`

// Transparente, sin borde propio ni el fondo de `<Input>` (que trae `dark:bg-input/30` y `aria-invalid:border-destructive`).
export const ENTRADA = `${CAJA} ${FOCO} ${TINTA} bg-transparent`

export const BOTON_DE_ACCION = `${BLANCO_TACTIL} inline-flex min-w-[44px] md:pointer-fine:min-w-8 items-center justify-center rounded-sm ${FOCO} ${TINTA} hover:bg-black/5 dark:hover:bg-white/10`

export const PUNTO =
  'mt-2.5 size-2 shrink-0 rounded-full bg-[color:var(--tono-tinta,var(--color-ink))]'

export const NOTA = `flex min-w-0 basis-full items-start gap-1 text-xs [overflow-wrap:anywhere] ${TINTA}`
