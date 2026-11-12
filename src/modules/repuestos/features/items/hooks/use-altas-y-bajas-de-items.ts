'use client'

import { useCallback, type RefObject } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { crearItem } from '../actions/crear-item'
import { eliminarItem } from '../actions/eliminar-item'
import { NO_SE_GUARDO } from './use-escritura-de-items'

type Args = {
  proyectoId: string
  filasRef: RefObject<readonly FilaDeItem[]>
  poner: (filas: readonly FilaDeItem[]) => void
}

// Agregar y eliminar un ítem de la hoja (8.09-2, C10 y C11). Estables, como el resto de lo que baja a las filas.
export function useAltasYBajasDeItems({ proyectoId, filasRef, poner }: Args) {
  // La fila nueva: devuelve el motivo si no se pudo (junto al campo) o nulo.
  const agregar = useCallback(
    async (id: string, descripcion: string): Promise<string | null> => {
      const envio = await enviarAccion(
        crearItem({ id, proyectoId, descripcion }),
        'No se pudo agregar el ítem.',
      )
      if (envio.ok) {
        poner([...filasRef.current.filter((f) => f.id !== id), envio.data])
        avisarExito('Ítem agregado.')
        return null
      }
      if ('sinRed' in envio) return NO_SE_GUARDO
      return envio.porCampo?.['descripcion'] ?? envio.error.mensaje
    },
    [filasRef, poner, proyectoId],
  )

  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice) o nulo.
  const eliminar = useCallback(
    async (fila: FilaDeItem): Promise<ErrorApp | null> => {
      const envio = await enviarAccion(
        eliminarItem({ id: fila.id, actualizadoEn: fila.actualizadoEn }),
        'No se pudo eliminar el ítem.',
      )
      if (envio.ok) {
        poner(filasRef.current.filter((f) => f.id !== fila.id))
        avisarExito('Ítem eliminado.')
        return null
      }
      return envio.error
    },
    [filasRef, poner],
  )

  return { agregar, eliminar }
}
