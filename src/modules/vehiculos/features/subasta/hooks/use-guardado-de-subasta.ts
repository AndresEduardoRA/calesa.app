'use client'

import { useState } from 'react'
import type { Guardado } from '../../alta/hooks/use-formulario-de-vehiculo'
import { useFotosDeSubasta } from './use-fotos-de-subasta'

export type GuardadoDeLinea = { clave: string | null; vehiculoId: string; numero: number | null }

// Lo que pasa después de guardar un vehículo que vino de apibara: se le traen las fotos (siguen
// aunque se cierre el panel: el aviso es de la pantalla) y, si salió de una línea de lo pegado, esa
// línea queda marcada como guardada.
export function useGuardadoDeSubasta(origenId: string) {
  const fotos = useFotosDeSubasta(origenId)
  const [guardado, setGuardado] = useState<GuardadoDeLinea | null>(null)
  return {
    guardado,
    traerFotos: fotos.traer,
    despuesDeGuardar: ({ id, numero, subasta }: Guardado) => {
      if (!subasta) {
        return
      }
      setGuardado({ clave: subasta.clave, vehiculoId: id, numero })
      void fotos.traer({ vehiculoId: id, raw: subasta.raw, nombre: `#${String(numero ?? '')}` })
    },
  }
}
