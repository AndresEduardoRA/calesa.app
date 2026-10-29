'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RecalculoInicial } from '../../../entities/apertura'
import {
  alternarBandera,
  confirmar,
  elegirAtajo,
  elegirVariante,
  ENTRADAS_VACIAS,
  entradasDelPedido,
  indiceDeHoja,
  restablecer,
  type Entradas,
  type IndiceDeHoja,
} from '../../../entities/entradas'
import type { HojaLista } from '../../../entities/hoja'
import type { PedidoDeRecalculo } from '../../../entities/pedido-de-recalculo'
import { recalcular } from '../../../composicion.client'
import { useBorradorDeHoja } from './use-borrador-de-hoja'
import { useRecalculo } from './use-recalculo'

// Los callbacks de la hoja: **los mismos para todas las celdas** (la `XCell` está en `memo` y una hoja de cientos de celdas recalcula en cada pausa; una función
// nueva por render las dibujaría todas).
export type AccionesDeHoja = {
  alConfirmar: (id: string, valor: number | null) => void
  alRestablecer: (id: string) => void
  alAlternarBandera: (nodo: string, encendida: boolean) => void
  alElegirVariante: (clave: string) => void
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
      alElegirAtajo: (nodo, posicion, valor) => {
        cambiar((e) => elegirAtajo(e, { indice }, nodo, { posicion, valor }))
      },
    }),
    [cambiar, indice],
  )
}

export function useHoja({
  hoja,
  inicial,
  vehiculoId,
  alCambiar,
  borrador,
}: {
  hoja: HojaLista
  inicial: RecalculoInicial
  vehiculoId: string | null
  // Cada confirmación (el aviso del último guardado ya no habla de lo que se ve).
  alCambiar?: () => void
  // El borrador de lo tipeado (4-29): su clave en la pestaña y qué hace «Descartar».
  borrador?: { clave: string; alDescartar: () => void }
}) {
  const alCambiarRef = useRef(alCambiar)
  useEffect(() => {
    alCambiarRef.current = alCambiar
  })
  const indice = useMemo(() => indiceDeHoja(hoja.secciones), [hoja.secciones])
  const [entradas, setEntradas] = useState<Entradas>(ENTRADAS_VACIAS)
  // Lo último tipeado, para que dos confirmaciones seguidas partan de la anterior sin esperar a que React dibuje. Se escribe en el manejador del evento, nunca en un
  // `setState`: StrictMode los llama dos veces.
  const ultimas = useRef<Entradas>(ENTRADAS_VACIAS)
  const origenId = hoja.origen.id
  // La hoja abierta, fijada al montarse: la misma para el recálculo y para el guardado (D2). Una prop nueva no los separa; una abierta nueva vuelve a montar la hoja.
  const [abierta] = useState(() => hoja.abierta)
  // El pedido, estable: el hook del recálculo lo lee una vez. La hoja se vuelve a montar si cambia la fórmula o el vehículo (la `key` de la pantalla).
  const pedir = useCallback(
    (e: Entradas) => {
      const pedido: PedidoDeRecalculo = {
        origenId,
        vehiculoId,
        abierta,
        entradas: entradasDelPedido(e),
        modoTc: null,
      }
      return recalcular(pedido)
    },
    [origenId, vehiculoId, abierta],
  )
  const recalculo = useRecalculo({ inicial, pedir })
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
    (e: Entradas) => {
      cambiar(() => e)
    },
    [cambiar],
  )

  useBorradorDeHoja({
    clave: borrador?.clave ?? null,
    entradas,
    indice,
    reponer,
    alDescartar: borrador?.alDescartar ?? (() => {}),
  })

  const acciones = useAcciones(cambiar, indice)

  return { indice, entradas, abierta, acciones, reponer, ...recalculo }
}
