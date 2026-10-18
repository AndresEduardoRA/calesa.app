'use client'

import { PANEL_ANOTAR_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import type { FilaDeLead } from '../../../entities/listado'
import { PANEL_AGENDAR_RECORDATORIO } from '../../../entities/recordatorios'
import { MenuDeLead } from '../../marcas/components/menu-de-lead'
import type { ParaMarcar } from '../../listado/components/tipos'
import { useDrawerDeLead } from '../hooks/use-drawer-de-lead'

type Props = {
  lead: FilaDeLead
  // Lo que la lista le da a todo «⋯»: las etiquetas de quien mira, «Gestionar» y a qué leads de la página puede enviar a la papelera.
  marcar: ParaMarcar
  // Quien mira tiene `leads.editar`: con el lead en su cartera, agendar y anotar.
  puedeEditar: boolean
  // Después de cambiar una marca: el resumen vuelve a leer el lead.
  alMarcar: () => void
  // Se envió a la papelera: el lead ya no está, el resumen se cierra.
  alEnviado: () => void
}

// El «⋯» del resumen de un lead: la lista de siempre (`accionesDeLead()`). Agendar y anotar eligen su pestaña y abren su modal dentro
// del resumen (`?pestana=recordatorios&panel=agendar-recordatorio`, `?pestana=seguimientos&panel=anotar-seguimiento`).
export function MenuDelResumen({ lead, marcar, puedeEditar, alMarcar, alEnviado }: Props) {
  const drawer = useDrawerDeLead()
  const acciones =
    puedeEditar && lead.enCartera
      ? {
          alAnotar: () => {
            drawer.abrirModal('seguimientos', PANEL_ANOTAR_SEGUIMIENTO)
          },
          alAgendar: () => {
            drawer.abrirModal('recordatorios', PANEL_AGENDAR_RECORDATORIO)
          },
        }
      : undefined
  return (
    <MenuDeLead
      leadId={lead.id}
      nombre={lead.nombre}
      marcas={lead.marcas}
      etiquetas={marcar.etiquetas}
      alGestionar={marcar.alGestionar}
      puedeEnviar={marcar.eliminables.includes(lead.id)}
      acciones={acciones}
      papelera={{ alEnviado }}
      alMarcar={alMarcar}
      conBorde
    />
  )
}
