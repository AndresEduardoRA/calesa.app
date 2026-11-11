'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useTransition, type ReactNode } from 'react'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { ContextoDelFlujoAbierto } from '../hooks/use-version-del-flujo'

const MENSAJE_DE_CONFLICTO = 'Otra persona cambió este flujo'

type Props = { flujoId: string; version: string; children: ReactNode }

// Guarda la versión leída del flujo y el aviso de conflicto que va arriba de todo lo suyo. El aviso se va cuando llega la versión nueva (la trae «Recargar»),
// no al pulsarlo: mandar la vieja de nuevo volvería a chocar.
export function ProveedorDelFlujo({ flujoId, version, children }: Props) {
  const router = useRouter()
  const [recargando, iniciar] = useTransition()
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(version)
  const valor = useMemo(
    () => ({
      flujoId,
      version,
      conflicto,
      avisarConflicto: (mensaje?: string) => {
        setConflicto(mensaje ?? MENSAJE_DE_CONFLICTO)
      },
      recargar: () => {
        iniciar(() => {
          router.refresh()
        })
      },
      recargando,
    }),
    [flujoId, version, conflicto, setConflicto, recargando, router],
  )
  return (
    <ContextoDelFlujoAbierto value={valor}>
      {conflicto ? (
        <AvisoDeConflicto mensaje={conflicto} alRecargar={valor.recargar} enCurso={recargando} />
      ) : null}
      {children}
    </ContextoDelFlujoAbierto>
  )
}
