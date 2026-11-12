'use client'

import { Button } from '@/shared/ui/button'
import { usePanelDelGrupo } from '../hooks/use-panel-del-grupo'

type Props = {
  // El `?booking=` o `?contenedor=` de la página.
  claveDeUrl: string
  // Por qué no se puede editar desde aquí (`puedeEditarElGrupo`); nulo = se puede.
  motivo: string | null
}

// «Editar grupo» en el encabezado del resumen (6.08-4). Con un grupo que no se puede editar desde aquí sale apagado y dice por qué (D37); abrirlo suma `?panel=editar-grupo` a la URL.
export function BotonEditarElGrupo({ claveDeUrl, motivo }: Props) {
  const panel = usePanelDelGrupo(claveDeUrl)
  return (
    <div className="grid gap-1">
      <div>
        <Button
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={motivo !== null}
          onClick={panel.abrirEdicion}
        >
          Editar grupo
        </Button>
      </div>
      {motivo ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{motivo}</p> : null}
    </div>
  )
}
