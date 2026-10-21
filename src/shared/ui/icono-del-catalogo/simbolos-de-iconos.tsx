import { esClaveDeIcono } from '@/shared/lib/iconos'
import { TRAZOS } from './trazos'

// Los iconos que una lista repite en cada fila, dibujados UNA vez y usados con `<use href="#…">` (`<IconoDelCatalogo deLista>`): un icono en
// línea son un `<svg>` con cada trazo adentro (3 o 4 nodos); con el símbolo, `<svg>` y `<use>` (2). En 100 filas con dos iconos cada una, el
// celular pasaba el presupuesto de nodos con los trazos en línea. Sólo se montan los de las claves que la lista usa (24 trazos son ~6 KB sin
// comprimir: la página no los paga todos). Una clave que no se conoce comparte el símbolo neutro.
export const idDelSimbolo = (clave: string): string =>
  `icono-${esClaveDeIcono(clave) ? clave : 'desconocido'}`

export function SimbolosDeIconos({ claves }: { claves: readonly (string | null | undefined)[] }) {
  const usados = [
    ...new Set(claves.filter((c): c is string => c !== null && c !== undefined && c.trim() !== '')),
  ]
  if (usados.length === 0) {
    return null
  }
  const conocidos = usados.filter(esClaveDeIcono)
  const hayDesconocidos = usados.length > conocidos.length
  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      className="pointer-events-none absolute"
    >
      <defs>
        {conocidos.map((clave) => (
          <g key={clave} id={idDelSimbolo(clave)}>
            {TRAZOS[clave]}
          </g>
        ))}
        {hayDesconocidos ? (
          <g id={idDelSimbolo('desconocido')}>
            <circle cx="12" cy="12" r="9" strokeDasharray="3 4" />
          </g>
        ) : null}
      </defs>
    </svg>
  )
}
