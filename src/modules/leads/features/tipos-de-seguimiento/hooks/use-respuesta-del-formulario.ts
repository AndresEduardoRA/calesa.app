'use client'

import { useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import type {
  RespuestaDeTiposDeSeguimiento,
  TipoDeSeguimientoConUso,
} from '../../../entities/tipo-de-seguimiento'

type Pendiente = { desde: number }

// Lo que deja la respuesta de un envío del modal de un tipo de seguimiento: el motivo junto a su campo (o arriba, si no es de un campo), el
// conflicto que espera la versión nueva, lo que esperó la red, y si se cerró. `aplicar` devuelve si el modal terminó.
export function useRespuestaDelFormulario(
  original: TipoDeSeguimientoConUso | null,
  alCerrar: () => void,
) {
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(original?.actualizadoEn ?? null)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)

  function aplicar(envio: Envio<RespuestaDeTiposDeSeguimiento> | null): boolean {
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      avisarExito(original ? 'Tipo de seguimiento guardado.' : 'Tipo de seguimiento creado.')
      alCerrar()
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
      return false
    }
    setErrores(envio.porCampo ?? {})
    setAviso(envio.porCampo ? null : envio.error.mensaje)
    return false
  }

  return { errores, setErrores, aviso, setAviso, conflicto, pendiente, aplicar }
}
