'use client'

import { PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { MAXIMO_DE_ETAPAS } from '../../../entities/embudo'
import type { PanelDeEtapas } from '../hooks/use-panel-de-etapas'
import { FilaDeEtapa } from './fila-de-etapa'

// Las etapas del panel, en su orden, y «Agregar etapa» (hasta 12).
export function ListaDeEtapas({ panel }: { panel: PanelDeEtapas }) {
  const grupo = useId()
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-(length:--text-sm) font-medium">Etapas</legend>
      <p className="text-(length:--text-xs) text-(--color-ink-soft)">
        Una etapa inicial, y al menos una ganada y una perdida. Las ganadas y perdidas cierran la
        oportunidad.
      </p>
      <ol className="grid gap-2">
        {panel.etapas.map((etapa, i) => (
          <FilaDeEtapa
            key={etapa.id ?? `nueva-${String(i)}`}
            etapa={etapa}
            indice={i}
            total={panel.etapas.length}
            panel={panel}
            grupo={grupo}
          />
        ))}
      </ol>
      <Button
        variant="outline"
        className="min-h-11 w-fit md:min-h-8"
        disabled={panel.etapas.length >= MAXIMO_DE_ETAPAS}
        onClick={panel.agregar}
      >
        <PlusIcon aria-hidden className="size-4" />
        Agregar etapa
      </Button>
    </fieldset>
  )
}
