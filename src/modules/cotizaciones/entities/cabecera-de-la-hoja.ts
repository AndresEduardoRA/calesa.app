import type { RespuestaDeRecalculo } from './recalculo'

// La cabecera de la hoja (`cotizacion_hoja()` › `cabecera`): lo que es del diseño entero y no de una sección. Reglas puras, cero I/O.

// El modo de tipo de cambio con que abre la hoja (P1): el primero de los que declara el diseño, marcado; nulo si no declara ninguno.
export function modoInicial(cabecera: { modos: readonly { clave: string }[] }): string | null {
  return cabecera.modos[0]?.clave ?? null
}

// «Ver total Bs» se ofrece si el diseño lo permite **y** hay con qué moneda escribirlo (P6): sin `monedaBs` (la versión no tiene `total_en`, o su tipo de cambio no existe o
// está inactivo) la hoja no dibuja el interruptor y guarda `ver_total_bs` en falso.
export function ofreceVerTotalBs(cabecera: { verTotalBs: boolean; monedaBs: string | null }) {
  return cabecera.verTotalBs && cabecera.monedaBs !== null
}

export type TotalEnMonedaLocal =
  { tipo: 'sin_calcular' } | { tipo: 'faltante' } | { tipo: 'valor'; bs: number }

// El total en la moneda local (`totales.bs` de la respuesta): sin respuesta no hay; con la respuesta y sin valor, falta («—»).
export function totalBsDelResumen(respuesta: RespuestaDeRecalculo | null): TotalEnMonedaLocal {
  if (respuesta === null) {
    return { tipo: 'sin_calcular' }
  }
  const bs = respuesta.totales.bs
  return bs === null ? { tipo: 'faltante' } : { tipo: 'valor', bs }
}

// El nombre (el de la base) del modo elegido, para decirlo en el resumen; nulo si la hoja no declara modos o no hay uno elegido.
export function nombreDelModo(
  cabecera: { modos: readonly { clave: string; nombre: string }[] },
  clave: string | null,
): string | null {
  return cabecera.modos.find((m) => m.clave === clave)?.nombre ?? null
}
