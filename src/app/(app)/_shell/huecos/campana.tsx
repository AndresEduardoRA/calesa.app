'use client'

import { Campana } from '@/modules/notificaciones/shell.client'
import { ACCIONES_DE_NOTIFICACIONES } from './acciones-de-notificaciones'

// El hueco de la campana en la barra superior: une la campana del módulo con el registro de acciones por tipo.
export function HuecoCampana({
  usuarioId,
  disponibles,
}: {
  usuarioId: string
  disponibles: string[]
}) {
  return (
    <Campana
      usuarioId={usuarioId}
      disponibles={disponibles}
      acciones={ACCIONES_DE_NOTIFICACIONES}
    />
  )
}
