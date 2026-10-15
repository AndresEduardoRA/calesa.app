'use client'

import { Input } from '@/shared/ui/input'
import { LARGO_MAXIMO_DE_ETAPA, type Etapa } from '../../../entities/embudo'
import { SelectorDeColor } from '../../etiquetas/components/selector-de-color'
import type { PanelDeEtapas } from '../hooks/use-panel-de-etapas'
import { MarcasDeEtapa } from './marcas-de-etapa'
import { OrdenDeEtapa } from './orden-de-etapa'

type Props = {
  etapa: Etapa
  indice: number
  total: number
  panel: PanelDeEtapas
  // El nombre del grupo de radios de «inicial» (uno por panel).
  grupo: string
}

// Una etapa en el panel: nombre, color de la paleta, sus marcas y el orden.
export function FilaDeEtapa({ etapa, indice, total, panel, grupo }: Props) {
  const de = etapa.nombre.trim() === '' ? `la etapa ${String(indice + 1)}` : etapa.nombre
  return (
    <li className="grid gap-2 rounded-(--radius-card) border border-(--color-line) p-3">
      <div className="flex items-center gap-2">
        <Input
          value={etapa.nombre}
          aria-label={`Nombre de la etapa ${String(indice + 1)}`}
          maxLength={LARGO_MAXIMO_DE_ETAPA + 10}
          className="h-11 min-w-0 flex-1 md:h-9"
          onChange={(evento) => {
            panel.renombrarEtapa(indice, evento.target.value)
          }}
        />
        <SelectorDeColor
          color={etapa.color}
          de={de}
          deshabilitado={panel.enCurso}
          alElegir={(color) => {
            panel.colorear(indice, color)
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <MarcasDeEtapa etapa={etapa} indice={indice} grupo={grupo} panel={panel} />
        <OrdenDeEtapa de={de} indice={indice} total={total} panel={panel} />
      </div>
    </li>
  )
}
