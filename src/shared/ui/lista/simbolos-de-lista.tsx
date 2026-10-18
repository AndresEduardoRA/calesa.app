// Los iconos que una lista repite en cada fila, dibujados UNA vez y usados con `<use href="#…">`. Un icono de lucide son un `<svg>`
// con cada trazo adentro (el «⋯» eran 6 nodos por fila: en una columna de 500 tarjetas, 3.000); con el sprite, el botón lleva un
// `<svg>` y un `<use>` (3 con el botón). Cada icono es un `<g>` dentro de `<defs>`: se dibuja como si estuviera escrito en el botón.
// Lo monta el layout `(app)` una sola vez; un `<use>` que apunta a un id que no está no dibuja nada, así que el test de `lista`
// comprueba que cada id que se usa existe acá y `e2e/mas-acciones-icono.spec.ts` que se ve igual que el icono de trazos.
export const ID_DEL_ICONO_MAS_ACCIONES = 'icono-mas-acciones'

// Los atributos de trazo van en el `<svg>` que usa el icono (se heredan): así el icono sigue el `currentColor` de su botón.
export const TRAZO_DE_LOS_ICONOS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function SimbolosDeLista() {
  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      className="pointer-events-none absolute"
    >
      <defs>
        <g id={ID_DEL_ICONO_MAS_ACCIONES}>
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </g>
      </defs>
    </svg>
  )
}

// El icono, de 1rem como el resto (crece con el texto al 200 %).
export function IconoDeLista({ id }: { id: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      className="size-4"
      {...TRAZO_DE_LOS_ICONOS}
    >
      <use href={`#${id}`} />
    </svg>
  )
}
