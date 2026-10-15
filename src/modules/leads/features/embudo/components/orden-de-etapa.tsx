'use client'

import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { PanelDeEtapas } from '../hooks/use-panel-de-etapas'

type Props = { de: string; indice: number; total: number; panel: PanelDeEtapas }

const BOTON = 'size-11 md:size-8'

// Subir, bajar y quitar una etapa (sin arrastrar). Cada botón dice de qué etapa es.
export function OrdenDeEtapa({ de, indice, total, panel }: Props) {
  return (
    <div className="ml-auto flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={BOTON}
        aria-label={`Subir ${de}`}
        disabled={indice === 0}
        onClick={() => {
          panel.subir(indice)
        }}
      >
        <ArrowUpIcon aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={BOTON}
        aria-label={`Bajar ${de}`}
        disabled={indice === total - 1}
        onClick={() => {
          panel.bajar(indice)
        }}
      >
        <ArrowDownIcon aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={BOTON}
        aria-label={`Quitar ${de}`}
        onClick={() => {
          panel.quitar(indice)
        }}
      >
        <Trash2Icon aria-hidden />
      </Button>
    </div>
  )
}
