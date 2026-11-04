import type { DisenoDeHoja, HojaLista } from './hoja'
import type { RespuestaDeRecalculo } from './recalculo'

// La hoja de una cotización guardada (`cotizacion_hoja_guardada()`, 4.15-2) en la forma que usa la página `/cotizaciones/[id]`: el diseño de SU versión recortado a quien mira, la
// fila, lo guardado (el snapshot recortado) y si quien mira la puede guardar. Todo lo que se busca por el id de un nodo es un `Map`: un id como «constructor» es legal. Este archivo
// viaja al navegador y no lleva Zod: la lectura de la respuesta de la base es `hoja-de-una-guardada-lectura.ts`, que sólo importa el servidor.

export type CotizacionDeLaHoja = {
  id: string
  numero: number
  clase: 'preventa' | 'final'
  version: number
  origenId: string
  leadId: string | null
  vehiculoId: string | null
  // El modo de tipo de cambio con que se guardó; nulo, el que traía la fórmula.
  modoTc: string | null
  verTotalBs: boolean
  titulo: string | null
  notas: string | null
  creadoEn: string
  // **El texto de la base, tal cual** (con sus microsegundos): es la versión que `cotizacion_guardar` compara. Nunca pasa por `Date`; sólo se muestra formateado.
  actualizadoEn: string
}

// Lo que quedó guardado de la cotización, recortado al nivel de quien mira.
export type LoGuardado = {
  valores: ReadonlyMap<string, number | string | null>
  fuentes: ReadonlyMap<string, string>
  // `totales.usd`: el total de la cotización; nulo si no hay.
  totalUsd: number | null
}

// Una versión de la cadena de una cotización (`cotizacion_padre_id`): la anterior o la nueva. El número es el suyo («v2 de #123»).
export type VersionDeLaCadena = { id: string; numero: number; version: number }

// Lo que `_cotizacion_cadena()` dice a quien mira (4.15-2): la anterior si la ve; la versión nueva viva (la suya si la ve, y si no sólo que existe: P11); y si puede cotizar encima.
export type CadenaDeLaCotizacion = {
  anterior: VersionDeLaCadena | null
  encima: VersionDeLaCadena | { oculta: true } | null
  puedeCotizarEncima: boolean
}

export type HojaDeUnaGuardada = {
  diseno: DisenoDeHoja
  cotizacion: CotizacionDeLaHoja
  guardado: LoGuardado
  // Lo decide la base (`_cotizacion_puede_guardar`): quien sólo ve abre la hoja en sólo lectura.
  puedeGuardar: boolean
  // El último día en que vale (un día `YYYY-MM-DD` de la zona de la empresa) y si ya pasó.
  venceEl: string
  vencida: boolean
  // La versión publicada de la fórmula del origen hoy (la cotización usa SU versión: `diseno.formula`); nula si el origen no tiene una publicada.
  publicada: { id: string; version: number } | null
  cadena: CadenaDeLaCotizacion
}

// El diseño de una guardada como la hoja que dibuja `HojaDeCotizar`. No tiene hoja abierta ni su hora (calcula por su cotización, `DeDondeCalcula`: nunca se lee) y el vehículo
// no se pide para guardar: ya lo tiene o no lo necesita.
export function hojaSinAbierta(diseno: DisenoDeHoja): HojaLista {
  return { ...diseno, estado: 'lista', abiertaEn: '', abierta: '', vehiculoObligatorio: false }
}

const mismoTotal = (guardado: LoGuardado, recalculo: RespuestaDeRecalculo) =>
  guardado.totalUsd === recalculo.totales.usd

function mismosValores(guardado: LoGuardado, recalculo: RespuestaDeRecalculo): boolean {
  if (guardado.valores.size !== recalculo.valores.size) {
    return false
  }
  for (const [nodo, valor] of guardado.valores) {
    if (!recalculo.valores.has(nodo) || recalculo.valores.get(nodo) !== valor) {
      return false
    }
  }
  return true
}

// Lo de hoy no es lo guardado: el primer recálculo al abrir no da los mismos valores ni el mismo total (la fórmula y los tipos de cambio son SUYOS, pero las tablas de referencia
// y los datos del vehículo son los de hoy, V28). Se miran los valores y no sólo el total: una celda o un subtotal puede cambiar sin mover el total. Sin recálculo (falló) no hay con
// qué comparar. Se decide una vez, al abrir.
export function difiereAlAbrir(
  guardado: LoGuardado,
  recalculo: RespuestaDeRecalculo | null,
): boolean {
  return (
    recalculo !== null && !(mismoTotal(guardado, recalculo) && mismosValores(guardado, recalculo))
  )
}

// Cuándo se dice «Total guardado»: cuando el de hoy es otro, o cuando no hay uno de hoy (el recálculo falló: también quien no ve el vehículo, 4-72, ve lo cotizado).
export function muestraElTotalGuardado(
  guardado: LoGuardado,
  recalculo: RespuestaDeRecalculo | null,
): boolean {
  return recalculo === null || !mismoTotal(guardado, recalculo)
}
