'use client'

import { CircleXIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { AvisoDeRevision, NivelDeAviso } from '../../../entities/revisar/avisos'

const POR_NIVEL: Record<NivelDeAviso, { palabra: string; Icono: typeof InfoIcon; color: string }> =
  {
    error: { palabra: 'Error', Icono: CircleXIcon, color: 'text-(--color-peligro-ink)' },
    aviso: { palabra: 'Aviso', Icono: TriangleAlertIcon, color: 'text-(--color-aviso-ink)' },
    info: { palabra: 'Información', Icono: InfoIcon, color: 'text-(--color-info-ink)' },
  }

type Props = {
  aviso: AvisoDeRevision
  // El nombre de su fase, si es de una fase del flujo leído; sin él no hay nada que abrir.
  nombreDeLaFase: string | null
  alAbrirLaFase: (faseId: string) => void
}

// Un aviso de «Revisar»: icono y palabra del nivel (nunca sólo color) y el texto tal cual viene de la base. Si es de una fase, «Abrir la fase» abre su
// inspector; un botón y no un enlace (los specs vecinos buscan enlaces por nombre sin acotar a una región, y abrir ya suma al historial).
export function AvisoDeRevisionEnLaLista({ aviso, nombreDeLaFase, alAbrirLaFase }: Props) {
  const { palabra, Icono, color } = POR_NIVEL[aviso.nivel]
  const faseId = aviso.faseId
  return (
    <li className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1 py-1.5">
      <span className="flex min-w-0 flex-1 items-start gap-2">
        <Icono aria-hidden className={`mt-0.5 size-4 shrink-0 ${color}`} />
        <span className="min-w-0">
          <span className={`font-medium ${color}`}>{palabra}:</span> {aviso.mensaje}
        </span>
      </span>
      {faseId !== null && nombreDeLaFase !== null ? (
        <Button
          variant="link"
          className="h-auto p-0"
          aria-label={`Abrir la fase «${nombreDeLaFase}»`}
          onClick={() => {
            alAbrirLaFase(faseId)
          }}
        >
          Abrir la fase
        </Button>
      ) : null}
    </li>
  )
}
