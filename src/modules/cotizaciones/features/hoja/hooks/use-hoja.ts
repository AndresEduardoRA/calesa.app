'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RecalculoInicial } from '../../../entities/apertura'
import {
  alternarBandera,
  confirmar,
  elegirAtajo,
  elegirModo,
  elegirVariante,
  entradasIniciales,
  indiceDeHoja,
  restablecer,
  type Entradas,
  type IndiceDeHoja,
} from '../../../entities/entradas'
import { ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import type { HojaLista } from '../../../entities/hoja'
import type { DeDondeCalcula } from '../../../entities/pedido-de-recalculo'
import { useBorradorDeHoja } from './use-borrador-de-hoja'
import { usePedirRecalculo } from './use-pedir-recalculo'
import { useRecalculo } from './use-recalculo'

// Los callbacks de la hoja: **los mismos para todas las celdas** (la `XCell` está en `memo` y una hoja de cientos de celdas recalcula en cada pausa; una función
// nueva por render las dibujaría todas).
export type AccionesDeHoja = {
  alConfirmar: (id: string, valor: number | null) => void
  alRestablecer: (id: string) => void
  alAlternarBandera: (nodo: string, encendida: boolean) => void
  alElegirVariante: (clave: string) => void
  alElegirModo: (clave: string) => void
  alElegirAtajo: (nodo: string, posicion: number, valor: number) => void
  // La ayuda de texto de una celda (4.13-4a): la pone la hoja, que es quien guarda en la URL cuál se abre.
  alAyudar?: (nodo: string) => void
}

// Los callbacks de las celdas, todos sobre la misma puerta (`cambiar`).
function useAcciones(
  cambiar: (cambio: (antes: Entradas) => Entradas) => void,
  indice: IndiceDeHoja,
): AccionesDeHoja {
  return useMemo<AccionesDeHoja>(
    () => ({
      alConfirmar: (id, valor) => {
        cambiar((e) => confirmar(e, { indice }, id, valor))
      },
      alRestablecer: (id) => {
        cambiar((e) => restablecer(e, indice, id))
      },
      alAlternarBandera: (nodo, encendida) => {
        cambiar((e) => alternarBandera(e, nodo, encendida))
      },
      alElegirVariante: (clave) => {
        cambiar((e) => elegirVariante(e, clave))
      },
      alElegirModo: (clave) => {
        cambiar((e) => elegirModo(e, clave))
      },
      alElegirAtajo: (nodo, posicion, valor) => {
        cambiar((e) => elegirAtajo(e, { indice }, nodo, { posicion, valor }))
      },
    }),
    [cambiar, indice],
  )
}

// Cómo abre la hoja: de dónde calcula (C1) y con qué entradas y «Ver total Bs» (C2). Sin nada, la hoja nueva: por su hoja abierta, el origen y el vehículo; con las entradas vacías
// y el primer modo marcado (P1), el mismo con que el servidor hizo el primer cálculo; y «Ver total Bs» apagado (P5). Todo estable: la hoja lo lee al montarse.
export type AperturaDeHoja = {
  de?: DeDondeCalcula
  // A partir del índice de la hoja.
  iniciales?: (indice: IndiceDeHoja) => Entradas
  verTotalBsInicial?: boolean
}

// La hoja abierta se fija al montarse: la misma para el recálculo y para el guardado (D2). Una prop nueva no los separa; una abierta nueva vuelve a montar la hoja.
function useDeDondeCalcula(hoja: HojaLista, vehiculoId: string | null, deQuien?: DeDondeCalcula) {
  const [abierta] = useState(() => hoja.abierta)
  const origenId = hoja.origen.id
  const de = useMemo<DeDondeCalcula>(
    () => deQuien ?? { tipo: 'abierta', origenId, abierta, vehiculoId },
    [deQuien, origenId, abierta, vehiculoId],
  )
  return { abierta, de }
}

export function useHoja({
  hoja,
  inicial,
  vehiculoId,
  de: deQuien,
  iniciales: inicialesDe = entradasIniciales,
  verTotalBsInicial = false,
  alCambiar,
  borrador,
}: AperturaDeHoja & {
  hoja: HojaLista
  inicial: RecalculoInicial
  vehiculoId: string | null
  // Cada confirmación (el aviso del último guardado ya no habla de lo que se ve).
  alCambiar?: (() => void) | undefined
  // El borrador de lo tipeado (4-29): su clave en la pestaña y qué hace «Descartar».
  borrador?: { clave: string; alDescartar: () => void } | undefined
}) {
  const alCambiarRef = useRef(alCambiar)
  useEffect(() => {
    alCambiarRef.current = alCambiar
  })
  const indice = useMemo(
    () => indiceDeHoja(hoja.secciones, hoja.cabecera.modos),
    [hoja.secciones, hoja.cabecera.modos],
  )
  const iniciales = useMemo(() => inicialesDe(indice), [inicialesDe, indice])
  const [entradas, setEntradas] = useState<Entradas>(iniciales)
  // Lo último tipeado, para que dos confirmaciones seguidas partan de la anterior sin esperar a que React dibuje. Se escribe en el manejador del evento, nunca en un
  // `setState`: StrictMode los llama dos veces.
  const ultimas = useRef<Entradas>(iniciales)
  // No es una entrada: «Ver total Bs» no cambia el cálculo ni pide un recálculo.
  const [verTotalBs, setVerTotalBs] = useState(verTotalBsInicial)
  const ofrece = ofreceVerTotalBs(hoja.cabecera)
  const { abierta, de } = useDeDondeCalcula(hoja, vehiculoId, deQuien)
  const pedir = usePedirRecalculo(de)
  const recalculo = useRecalculo({ inicial, iniciales, pedir })
  const { programar } = recalculo

  const cambiar = useCallback(
    (cambio: (antes: Entradas) => Entradas) => {
      const nuevas = cambio(ultimas.current)
      ultimas.current = nuevas
      setEntradas(nuevas)
      programar(nuevas)
      alCambiarRef.current?.()
    },
    [programar],
  )

  // El borrador que vuelve (4-29): como una confirmación, con su recálculo.
  const reponer = useCallback(
    (e: Entradas, ver: boolean) => {
      cambiar(() => e)
      setVerTotalBs(ver)
    },
    [cambiar],
  )

  const alCambiarVerTotalBs = useCallback((valor: boolean) => {
    setVerTotalBs(valor)
    alCambiarRef.current?.()
  }, [])

  useBorradorDeHoja({
    clave: borrador?.clave ?? null,
    entradas,
    verTotalBs,
    iniciales,
    verTotalBsInicial,
    ofrece,
    indice,
    reponer,
    alDescartar: borrador?.alDescartar ?? (() => {}),
  })

  const acciones = useAcciones(cambiar, indice)

  return {
    indice,
    entradas,
    verTotalBs: ofrece && verTotalBs,
    alCambiarVerTotalBs,
    abierta,
    de,
    // Con lo que abrió la hoja: contra eso se mide si hay algo que guardar.
    iniciales,
    verTotalBsInicial,
    acciones,
    reponer,
    ...recalculo,
  }
}
