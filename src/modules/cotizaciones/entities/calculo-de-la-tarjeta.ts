import { ofreceVerTotalBs } from './cabecera-de-la-hoja'
import type { HojaDeUnaGuardada } from './hoja-de-una-guardada'
import type { Estado } from './motor-contexto'
import type { RespuestaDeRecalculo } from './recalculo'

// Los números que dibuja la tarjeta (4.18-2): sólo valores, estados y totales por el id de un nodo, nunca etiquetas ni nodos de la hoja de quien mira (C9). Sin `estados` la
// tarjeta va sólo con el total. Todo lo que se busca por id es un `Map`.
export type CalculoDeLaTarjeta = {
  valores: ReadonlyMap<string, number | string | null>
  estados: ReadonlyMap<string, Estado> | null
  totales: { usd: number | null; bs: number | null }
  // El modo de tipo de cambio con que se calculó (nombra los tipos de cambio de cada grupo) y si se pidió el total en la moneda local.
  modoTc: string | null
  verTotalBs: boolean
}

// Lo que la hoja nueva calcula ahora: la última respuesta del recálculo, el modo elegido y «Ver total Bs». Sin respuesta (todavía no hay, o falló) el total es «—».
export function calculoDeLaRespuesta(
  respuesta: RespuestaDeRecalculo | null,
  modoTc: string | null,
  verTotalBs: boolean,
): CalculoDeLaTarjeta {
  return {
    valores: respuesta?.valores ?? new Map(),
    estados: respuesta?.estados ?? null,
    totales: { usd: respuesta?.totales.usd ?? null, bs: respuesta?.totales.bs ?? null },
    modoTc,
    verTotalBs,
  }
}

// Lo que dibuja la tarjeta de una guardada: **lo guardado** (P5 a): los valores y los totales del snapshot, con el modo y «Ver total Bs» con que se guardó. El snapshot no
// trae `estados`; qué filas van sale del primer recálculo (el de abrir con lo guardado como entradas), que tiene los mismos estados porque dependen sólo de la variante y las
// banderas (`motor-estados.ts`). Si ese recálculo falló, `estados` va nulo y la tarjeta lleva sólo el total guardado.
export function calculoDeLoGuardado(
  hoja: HojaDeUnaGuardada,
  primerRecalculo: RespuestaDeRecalculo | null,
): CalculoDeLaTarjeta {
  return {
    valores: hoja.guardado.valores,
    estados: primerRecalculo?.estados ?? null,
    totales: { usd: hoja.guardado.totalUsd, bs: hoja.guardado.totalBs },
    modoTc: hoja.cotizacion.modoTc,
    verTotalBs: ofreceVerTotalBs(hoja.diseno.cabecera) && hoja.cotizacion.verTotalBs,
  }
}
