'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { errorDeAccion } from '@/shared/lib/formularios'
import type { Alcance, ClavePermiso } from '@/shared/lib/permisos'
import { avisarError } from '@/shared/ui/toasts'
import { versionMasNueva, type RolConConcesiones } from '../../../entities/rol'
import { otorgar } from '../actions/otorgar'
import { revocar } from '../actions/revocar'

// Un cambio en una celda: dar el permiso en un lugar (o cambiarle el alcance) o quitarlo de ahí.
export type CambioDeConcesion =
  | { tipo: 'otorgar'; clave: ClavePermiso; origenId: string | null; alcance: Alcance }
  | { tipo: 'revocar'; clave: ClavePermiso; origenId: string | null }

// Cada cambio es una RPC que manda la versión del rol. Van de a una por rol: mientras una
// viaja, las celdas de ese rol esperan, así la siguiente sale con la versión que devolvió esta
// y nadie choca consigo mismo.
export function useMatriz() {
  const otorgando = useAction(otorgar)
  const revocando = useAction(revocar)
  const [rolEnCurso, setRolEnCurso] = useState<string | null>(null)
  // La versión que devolvió la última edición de cada rol, por si llega antes que la pantalla nueva.
  const [versiones, setVersiones] = useState<Record<string, string>>({})

  async function aplicar(rol: RolConConcesiones, cambio: CambioDeConcesion): Promise<void> {
    setRolEnCurso(rol.id)
    const edicion = {
      rolId: rol.id,
      actualizadoEnEsperado: versionMasNueva(rol.actualizadoEn, versiones[rol.id]),
      clave: cambio.clave,
      origenId: cambio.origenId,
    }
    const resultado =
      cambio.tipo === 'otorgar'
        ? await otorgando.executeAsync({ ...edicion, alcance: cambio.alcance })
        : await revocando.executeAsync(edicion)
    setRolEnCurso(null)
    if (resultado.data?.ok) {
      const { actualizadoEn } = resultado.data.data
      setVersiones((previas) => ({ ...previas, [rol.id]: actualizadoEn }))
      return
    }
    const error = errorDeAccion(resultado)
    if (error) {
      avisarError(error)
    }
  }

  return { aplicar, rolEnCurso }
}
