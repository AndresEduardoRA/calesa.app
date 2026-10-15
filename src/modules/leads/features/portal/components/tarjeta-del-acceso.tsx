'use client'

import { KeyRoundIcon, LockOpenIcon, ShieldOffIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { AccesoVigente } from '../../../entities/portal'
import { CabeceraDelAcceso, DatosDelAcceso, EstadoDelAcceso } from './datos-del-acceso'

type Props = {
  acceso: AccesoVigente
  enCurso: boolean
  alVolverAOtorgar: () => void
  alRevocar: () => void
  alDesbloquear: () => void
}

// El acceso que existe (activo, bloqueado o revocado): el código, quién lo otorgó, el último ingreso y lo
// que se puede hacer. Nunca la clave: se vio una sola vez, al otorgarlo.
export function TarjetaDelAcceso({
  acceso,
  enCurso,
  alVolverAOtorgar,
  alRevocar,
  alDesbloquear,
}: Props) {
  const revocado = acceso.estado === 'revocado'
  return (
    <div className="grid gap-4 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-4">
      <CabeceraDelAcceso acceso={acceso} />
      <EstadoDelAcceso acceso={acceso} />
      <DatosDelAcceso acceso={acceso} />
      <div className="flex flex-wrap gap-2">
        {acceso.estado === 'bloqueado' ? (
          <Button className="h-11 md:h-9" onClick={alDesbloquear} disabled={enCurso}>
            <LockOpenIcon aria-hidden />
            Desbloquear
          </Button>
        ) : null}
        <Button
          variant={revocado ? 'default' : 'outline'}
          className="h-11 md:h-9"
          onClick={alVolverAOtorgar}
          disabled={enCurso}
        >
          <KeyRoundIcon aria-hidden />
          Volver a otorgar
        </Button>
        {revocado ? null : (
          <Button variant="ghost" className="h-11 md:h-9" onClick={alRevocar} disabled={enCurso}>
            <ShieldOffIcon aria-hidden />
            Revocar
          </Button>
        )}
      </div>
    </div>
  )
}
