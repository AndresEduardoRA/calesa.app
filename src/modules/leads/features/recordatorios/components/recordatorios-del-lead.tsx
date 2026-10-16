'use client'

import { useEffect, useRef } from 'react'
import type { Recordatorio } from '../../../entities/recordatorios'
import { useRecordatorios } from '../hooks/use-recordatorios'
import { BloqueDeRecordatorios } from './bloque-de-recordatorios'

type Props = {
  leadId: string
  zona: string
  // Los que nacieron con un seguimiento (el «Próximo contacto» de la ficha): se ponen en su lugar.
  agendados?: readonly Recordatorio[]
}

// «Tus recordatorios» de un lead con su lectura por páginas: lo que montan la sección de la ficha
// (diferido: su código no viaja con el resto de la pantalla) y la pestaña del drawer.
export function RecordatoriosDelLead({ leadId, zona, agendados = [] }: Props) {
  const recordatorios = useRecordatorios(leadId)
  const puestos = useRef(new Set<string>())
  const { poner } = recordatorios
  useEffect(() => {
    for (const r of agendados) {
      if (!puestos.current.has(r.id)) {
        puestos.current.add(r.id)
        poner(r)
      }
    }
  }, [agendados, poner])
  return <BloqueDeRecordatorios leadId={leadId} zona={zona} recordatorios={recordatorios} />
}
