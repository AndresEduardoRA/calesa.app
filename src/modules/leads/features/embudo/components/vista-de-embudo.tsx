'use client'

import { PlusIcon, Settings2Icon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import type { Embudo } from '../../../entities/embudo'
import { totalDelTablero, type Tablero } from '../../../entities/tablero'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { useTablero } from '../hooks/use-tablero'
import { useVistaDeEmbudo } from '../hooks/use-vista-de-embudo'
import { BusquedaDelEmbudo, ID_DE_LA_BUSQUEDA_DEL_EMBUDO } from './busqueda-del-embudo'
import { ConmutadorDeVista } from './conmutador-de-vista'
import { NuevoEmbudo } from './nuevo-embudo'
import { PanelDeEtapas } from './panel-de-etapas'
import { PrimerEmbudo } from './primer-embudo'
import { SelectorDeEmbudo } from './selector-de-embudo'
import { TableroDeEmbudo } from './tablero-de-embudo'

type Props = { embudos: Embudo[]; tablero: Tablero | null }

// `/leads?vista=embudo`: el kanban de las oportunidades propias en el embudo elegido. La primera vez
// prepara el embudo por defecto. Los filtros de la lista no se aplican aquí, y la pantalla lo dice.
export function VistaDeEmbudo({ embudos, tablero }: Props) {
  if (!tablero || embudos.length === 0) {
    return (
      <div className="grid gap-4">
        <h1 className="sr-only">Embudo</h1>
        <ConmutadorDeVista actual="embudo" />
        <PrimerEmbudo />
      </div>
    )
  }
  return <ConTablero embudos={embudos} inicial={tablero} />
}

function ConTablero({ embudos, inicial }: { embudos: Embudo[]; inicial: Tablero }) {
  const vista = useVistaDeEmbudo()
  const estado = useTablero(inicial)
  const embudo = embudos.find((e) => e.id === inicial.embudo.id)
  const vacio = totalDelTablero(estado.tablero) === 0
  return (
    <div className="grid gap-4">
      <h1 className="sr-only">Embudo</h1>
      <div className="flex flex-wrap items-center gap-2">
        <ConmutadorDeVista actual="embudo" />
        <SelectorDeEmbudo
          embudos={embudos}
          actual={inicial.embudo.id}
          alElegir={vista.elegirEmbudo}
        />
        <BusquedaDelEmbudo />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" className="min-h-11 md:min-h-8" onClick={vista.abrirEtapas}>
            <Settings2Icon aria-hidden className="size-4" />
            Etapas
          </Button>
          <Button variant="outline" className="min-h-11 md:min-h-8" onClick={vista.abrirNuevo}>
            <PlusIcon aria-hidden className="size-4" />
            Nuevo embudo
          </Button>
        </div>
      </div>
      <Aviso tono="info">
        <p>
          {estado.tablero.busqueda
            ? `Buscando «${estado.tablero.busqueda}» en tus oportunidades: el título o el nombre del lead, en todas las etapas.`
            : 'Aquí ves tus oportunidades. Los filtros de la lista no se aplican en esta vista; para llegar a una, búscala.'}
        </p>
      </Aviso>
      {/* Sin oportunidades se dice, y las columnas se ven igual: muestran las etapas del embudo. */}
      {vacio ? (
        <EstadoVacio
          compacto
          titulo="Todavía no tienes oportunidades en este embudo"
          descripcion="Crea una desde la ficha de un lead, en «Oportunidades»."
        />
      ) : null}
      <TableroDeEmbudo
        estado={estado}
        etapaDeLaUrl={vista.etapa}
        alElegirEtapa={vista.elegirEtapa}
        alIrABuscar={() => {
          document.getElementById(ID_DE_LA_BUSQUEDA_DEL_EMBUDO)?.focus()
        }}
      />
      {vista.etapasAbierto && embudo ? (
        <PanelDeEtapas
          key={embudo.actualizadoEn}
          embudo={embudo}
          embudos={embudos}
          alCerrar={vista.cerrarPanel}
        />
      ) : null}
      {vista.nuevoAbierto ? (
        <NuevoEmbudo
          embudos={embudos}
          alCerrar={vista.cerrarPanel}
          alCrear={(id) => {
            vista.cerrarPanel()
            vista.elegirEmbudo(id)
          }}
        />
      ) : null}
      {/* Lo que se movió en otra pestaña (o en la ficha) aparece al volver. */}
      <RefrescarAlVolver activo={!vista.etapasAbierto && !vista.nuevoAbierto} />
    </div>
  )
}
