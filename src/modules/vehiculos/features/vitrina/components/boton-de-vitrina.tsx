'use client'

import { GlobeIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import { usePanelDeVitrina } from '../hooks/use-panel-de-vitrina'

type Props = { permiso: PermisoDeVitrina }

// «Publicar en la web», en la cabecera de la ficha. Quien no tiene el permiso en ese origen lo ve
// apagado, con el motivo escrito debajo.
export function BotonDeVitrina({ permiso }: Props) {
  const panel = usePanelDeVitrina()
  const idMotivo = useId()
  const apagado = permiso.estado === 'deshabilitado'
  return (
    <div className="grid justify-items-start gap-1 sm:justify-items-end">
      <Button
        variant="outline"
        className="h-11 md:h-9"
        onClick={panel.abrir}
        disabled={apagado}
        aria-describedby={apagado ? idMotivo : undefined}
      >
        <GlobeIcon aria-hidden />
        Publicar en la web
      </Button>
      {apagado ? (
        <p
          id={idMotivo}
          className="max-w-64 text-(length:--text-xs) text-(--color-ink-faint) sm:text-right"
        >
          {permiso.motivo}
        </p>
      ) : null}
    </div>
  )
}
