// A dónde lleva un aviso. La `ruta` la escribe la base, pero se trata como dato de afuera: nunca un enlace a otro
// sitio ni a un esquema (`javascript:`, `https:`), y una pantalla que todavía no existe no es un enlace roto.

export type Destino =
  | { tipo: 'enlace'; href: string }
  // La ruta es interna, pero su pantalla no está entre las disponibles.
  | { tipo: 'sin-pantalla' }
  | { tipo: 'ninguno' }

// Controles (U+0000 a U+001F y U+007F) y la barra invertida: los navegadores los normalizan a otra cosa.
function esPeligroso(ruta: string): boolean {
  for (const caracter of ruta) {
    const codigo = caracter.codePointAt(0) ?? 0
    if (codigo <= 0x1f || codigo === 0x7f || caracter === '\\') {
      return true
    }
  }
  return false
}

function esInterna(ruta: string): boolean {
  return ruta.startsWith('/') && !ruta.startsWith('//') && !esPeligroso(ruta)
}

// El camino sin `?query` ni `#ancla`.
function caminoDe(ruta: string): string {
  const corte = ruta.search(/[?#]/)
  return corte === -1 ? ruta : ruta.slice(0, corte)
}

// `disponibles`: los caminos con pantalla (`/leads`, `/notificaciones`); una ruta coincide si es ese camino o
// cuelga de él (`/leads/<id>`), no si sólo empieza igual (`/leadsx`).
export function destinoDe(
  ruta: string | null | undefined,
  disponibles: readonly string[],
): Destino {
  if (!ruta || !esInterna(ruta)) {
    return { tipo: 'ninguno' }
  }
  const camino = caminoDe(ruta)
  // `/` (Inicio) sólo es ella misma: como prefijo, todo cuelga de ella.
  const hay = disponibles.some((base) =>
    base === '/' ? camino === '/' : camino === base || camino.startsWith(`${base}/`),
  )
  return hay ? { tipo: 'enlace', href: ruta } : { tipo: 'sin-pantalla' }
}
