'use client'

import { PlusIcon, TargetIcon } from 'lucide-react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import type { Embudo } from '../../../entities/embudo'
import {
  TOPE_DE_OPORTUNIDADES_DEL_LEAD,
  type OportunidadDelLead,
} from '../../../entities/oportunidad'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { useOportunidades } from '../hooks/use-oportunidades'
import { usePanelDeMovida } from '../hooks/use-panel-de-movida'
import { usePanelDeOportunidad } from '../hooks/use-panel-de-oportunidad'
import { ItemDeOportunidad } from './item-de-oportunidad'
import { MovidaDeLaFicha } from './movida-de-la-ficha'
import { PanelDeOportunidad } from './panel-de-oportunidad'

// Con más de 100 oportunidades en un lead, se dice que lo que se ve es lo más reciente (el aviso de siempre).
function TopeDeOportunidades({ hayMas }: { hayMas: boolean }) {
  return hayMas ? (
    <AvisoDeTope
      texto={`Mostrando las ${String(TOPE_DE_OPORTUNIDADES_DEL_LEAD)} más recientes, las abiertas primero.`}
    />
  ) : null
}

// Con un panel o un modal abierto la sección no se vuelve a leer sola (reiniciaría lo escrito).
const hayPanelAbierto = (nueva: boolean, editando: unknown, movida: boolean) =>
  nueva || editando !== null || movida

type Props = {
  leadId: string
  inicial: readonly OportunidadDelLead[]
  embudos: readonly Embudo[]
  // Cartera y `leads.editar` (lo dice la base).
  puedoCrear: boolean
  // Tiene más de las 100 que se muestran.
  hayMas: boolean
}

// La sección «Oportunidades»: las de quien mira sobre el lead (abiertas primero) y «Nueva oportunidad».
export function OportunidadesDelLead({ leadId, inicial, embudos, puedoCrear, hayMas }: Props) {
  const panel = usePanelDeOportunidad()
  const movida = usePanelDeMovida()
  const { lista, moverA, quitar, ocupada } = useOportunidades(inicial)
  const editando = panel.editando ? (lista.find((o) => o.id === panel.editando) ?? null) : null
  const nueva = puedoCrear ? (
    <Button className="min-h-11 md:min-h-8" onClick={panel.abrirNueva}>
      <PlusIcon aria-hidden className="size-4" />
      Nueva oportunidad
    </Button>
  ) : null
  return (
    <section aria-labelledby="titulo-oportunidades" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-oportunidades" className="text-(length:--text-lg) font-medium">
          Tus oportunidades
        </h2>
        {lista.length > 0 ? nueva : null}
      </div>
      {lista.length === 0 ? (
        <EstadoVacio
          Icono={TargetIcon}
          titulo="Todavía no tienes oportunidades con este lead"
          descripcion="Una oportunidad es un negocio que sigues en tu embudo. Sólo tú la ves."
          accion={nueva}
        />
      ) : (
        <ul className="grid gap-3">
          {lista.map((o) => (
            <li key={o.id}>
              <ItemDeOportunidad
                oportunidad={o}
                etapas={embudos.find((e) => e.id === o.embudoId)?.etapas ?? []}
                nombrarEmbudo={embudos.length > 1}
                puedeEditar={puedoCrear}
                ocupada={ocupada === o.id}
                alMover={(etapa, motivo) => moverA(o, etapa, motivo)}
                alPedirMotivo={(etapa) => {
                  movida.pedir(o, etapa)
                }}
                alEditar={() => {
                  panel.abrirEdicion(o.id)
                }}
                alEliminar={() => void quitar(o)}
              />
            </li>
          ))}
        </ul>
      )}
      <TopeDeOportunidades hayMas={hayMas} />
      {puedoCrear && (panel.nueva || editando) ? (
        <PanelDeOportunidad
          key={editando?.actualizadoEn ?? 'nueva'}
          leadId={leadId}
          oportunidad={editando}
          embudos={embudos}
          alCerrar={panel.cerrar}
        />
      ) : null}
      <MovidaDeLaFicha
        activa={puedoCrear}
        panel={movida}
        lista={lista}
        embudos={embudos}
        moverA={moverA}
      />
      <RefrescarAlVolver activo={!hayPanelAbierto(panel.nueva, editando, movida.abierto)} />
    </section>
  )
}
