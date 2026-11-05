// El resumen `?cotizacion=` del listado `/cotizaciones` (4.16-4b): qué cotización está abierta, de dónde sale lo que se dibuja y cómo se pide al servidor la que no está
// en la página. Puro: sin I/O.
import { z } from 'zod'
import type { CotizacionDelListado } from './filas-del-listado'

// La clave de la URL del resumen: la leen la página (que lee la cotización fuera de la página) y el hook que la abre.
export const CLAVE_DE_RESUMEN_DE_COTIZACION = 'cotizacion'

// El tamaño de la búsqueda de UNA cotización por su id (`cotizaciones_listado()` con el cursor justo después de ella): no es un tamaño de página.
export const UNA = 1

export const MENSAJE_DE_COTIZACION_NO_DISPONIBLE =
  'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'

const ES_GUID = z.guid()

// El id que trae la URL, en minúsculas, o null si no es un guid (o no hay). Es la única lectura de `?cotizacion=`: el servidor y el navegador comparan siempre con ésta, y
// un enlace con mayúsculas abre la misma cotización que uno en minúsculas.
export function idDelResumen(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined || !ES_GUID.safeParse(texto).success) {
    return null
  }
  return texto.toLowerCase()
}

// El uuid que sigue a éste en el orden de la base (los 16 bytes como un número de 128 bits, más uno): entre los dos no cabe ningún uuid, así que la primera fila
// estrictamente anterior a `(creado_en, id + 1)` es la cotización misma. Null si no es un guid o si es el último posible (el máximo no sale de `gen_random_uuid()`).
export function idSiguiente(id: string): string | null {
  const valido = idDelResumen(id)
  if (valido === null) {
    return null
  }
  const siguiente = BigInt(`0x${valido.replaceAll('-', '')}`) + 1n
  if (siguiente >= 1n << 128n) {
    return null
  }
  const hex = siguiente.toString(16).padStart(32, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Lo que el servidor leyó de la cotización de la URL cuando no está en la página. Si esa lectura falla, el listado no cae: `error`.
export type LecturaDelServidor =
  | { id: string; estado: 'listo'; cotizacion: CotizacionDelListado }
  | { id: string; estado: 'no_disponible' }
  | { id: string; estado: 'error' }

export type VistaDelResumen =
  | { tipo: 'cerrado' }
  | { tipo: 'no_disponible' }
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'cotizacion'; cotizacion: CotizacionDelListado }

type Entradas = {
  // `?cotizacion=` tal cual: nulo si no hay.
  texto: string | null
  filas: readonly CotizacionDelListado[]
  // Lo que leyó el servidor (puede ser de otro id: no vale).
  delServidor: LecturaDelServidor | null
  // Ya se le pidió ese id al servidor (`router.refresh()`).
  yaPedido: boolean
}

// Qué dibuja el resumen: la fila de la página si está, si no lo que leyó el servidor y, si no llegó, `cargando` (se le pide una vez) y, pedido ya sin lectura, `error`.
export function vistaDelResumen({
  texto,
  filas,
  delServidor,
  yaPedido,
}: Entradas): VistaDelResumen {
  if (texto === null) {
    return { tipo: 'cerrado' }
  }
  const id = idDelResumen(texto)
  if (id === null) {
    return { tipo: 'no_disponible' }
  }
  const fila = filas.find((candidata) => candidata.id === id)
  if (fila !== undefined) {
    return { tipo: 'cotizacion', cotizacion: fila }
  }
  if (delServidor !== null && delServidor.id === id) {
    return delServidor.estado === 'listo'
      ? { tipo: 'cotizacion', cotizacion: delServidor.cotizacion }
      : { tipo: delServidor.estado }
  }
  return yaPedido ? { tipo: 'error' } : { tipo: 'cargando' }
}
