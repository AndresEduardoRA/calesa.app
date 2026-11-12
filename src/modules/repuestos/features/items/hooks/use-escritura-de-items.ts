'use client'

import { useCallback, type RefObject } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ColumnaEditable, ValorDeCelda } from '../../../entities/items/celda'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { guardarCelda } from '../actions/guardar-celda'
import { useColaPorFila } from './use-cola-por-fila'

export const NO_SE_GUARDO = 'No se guardó. Reintenta.'

type Args = {
  // Lo vivo, leído al correr cada guardado (no al encolarse).
  filasRef: RefObject<readonly FilaDeItem[]>
  monedaRef: RefObject<string | null>
  poner: (filas: readonly FilaDeItem[]) => void
  decirError: (clave: string, mensaje: string | null) => void
  alConflicto: (mensaje: string) => void
}

// Guardar una celda de la hoja (8.09-2, C9), por la cola de su fila y con la versión que tenga la fila al correr. Las funciones son estables: la `XCell` está
// en `memo` y no puede recibir una nueva por render.
export function useEscrituraDeItems({ filasRef, monedaRef, poner, decirError, alConflicto }: Args) {
  const encolar = useColaPorFila()

  const guardar = useCallback(
    (itemId: string, columna: ColumnaEditable, valor: ValorDeCelda): Promise<void> =>
      encolar(itemId, async () => {
        const fila = filasRef.current.find((f) => f.id === itemId)
        if (!fila) return
        const clave = `${itemId}:${columna}`
        decirError(clave, null)
        // Un precio puesto a un ítem sin moneda lleva la por defecto en el mismo guardado (D52).
        const moneda =
          columna === 'precio_cliente' && valor !== null && fila.moneda === null
            ? monedaRef.current
            : null
        const envio = await enviarAccion(
          guardarCelda({
            id: itemId,
            columna,
            valor,
            actualizadoEn: fila.actualizadoEn,
            ...(moneda === null ? {} : { moneda }),
          }),
          'No se pudo guardar.',
        )
        if (envio.ok) {
          poner(filasRef.current.map((f) => (f.id === itemId ? envio.data : f)))
        } else if ('sinRed' in envio) {
          decirError(clave, NO_SE_GUARDO)
        } else if (envio.error.codigo === 'conflicto') {
          alConflicto(envio.error.mensaje)
        } else {
          decirError(clave, envio.porCampo?.[columna] ?? envio.error.mensaje)
        }
      }),
    [alConflicto, decirError, encolar, filasRef, monedaRef, poner],
  )

  // Una celda numérica (`XCell`) dice «esta celda pasó a N» con su id: `<ítem>:<columna>`.
  const alConfirmarNumero = useCallback(
    (id: string, valor: number | null) => {
      const [itemId, columna] = id.split(':')
      if (itemId !== undefined && (columna === 'cantidad' || columna === 'precio_cliente')) {
        void guardar(itemId, columna, valor)
      }
    },
    [guardar],
  )

  return { guardar, alConfirmarNumero }
}
