'use client'

import { useState } from 'react'
import { avisarExito } from '@/shared/ui/toasts'
import { alternarRol, mismosRoles } from '../../../entities/transiciones/roles-de-lista'
import type { SalidasDeLaFase } from './use-salidas-de-la-fase'

type Args = { salidas: SalidasDeLaFase; guardados: readonly string[] }

// El borrador de «Quién puede mover a esta fase» y su guardado. El componente lo reinicia con `key` por la firma de lo guardado. Guardar manda la lista completa;
// un conflicto lo dice el aviso de arriba del flujo y el borrador se conserva; cualquier otro rechazo se dice bajo el botón.
export function useRolesDeLaFase({ salidas, guardados }: Args) {
  const [roles, setRoles] = useState<string[]>(() => [...guardados])
  const [aviso, setAviso] = useState<string | null>(null)
  const hayCambios = !mismosRoles(roles, guardados)

  function marcar(rolId: string, marcado: boolean) {
    setRoles((antes) => alternarRol(antes, rolId, marcado))
    setAviso(null)
  }

  async function guardar(): Promise<boolean> {
    setAviso(null)
    if (!hayCambios) {
      return false
    }
    const envio = await salidas.ponerRolesDeFase(roles)
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      avisarExito('Quién puede mover guardado.')
      return true
    }
    if (envio.error.codigo === 'conflicto') {
      salidas.rechazar(envio)
    } else {
      setAviso(envio.error.mensaje)
    }
    return false
  }

  return { roles, aviso, hayCambios, enCurso: salidas.enCurso, marcar, guardar }
}
