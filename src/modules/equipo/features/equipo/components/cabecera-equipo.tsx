'use client'

import { UserPlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'

type Props = {
  puedeGestionar: boolean
  // Todavía no hay nadie más: la lista existe pero la única persona es quien mira.
  soloYo: boolean
  alInvitar: () => void
}

export function CabeceraEquipo({ puedeGestionar, soloYo, alInvitar }: Props) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Equipo</h1>
        {puedeGestionar ? (
          <Button className="h-11 md:h-9" onClick={alInvitar}>
            <UserPlusIcon aria-hidden />
            Invitar
          </Button>
        ) : null}
      </div>
      {soloYo ? (
        <Aviso>
          {puedeGestionar
            ? 'Por ahora el equipo eres tú. Invita a la primera persona y aparece acá.'
            : 'Por ahora el equipo eres tú.'}
        </Aviso>
      ) : null}
    </>
  )
}
