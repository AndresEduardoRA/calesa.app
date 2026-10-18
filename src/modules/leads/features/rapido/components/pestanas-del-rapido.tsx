'use client'

import type { ReactNode } from 'react'
import { PestanasDelResumen } from '@/shared/ui/lista'
import { PESTANAS_DEL_RAPIDO, type PestanaDelRapido } from '../../../entities/rapido'
import { RecordatoriosDelRapidoDiferido, SeguimientosDelRapidoDiferido } from './diferidos'

type Props = {
  leadId: string
  pestana: PestanaDelRapido
  alElegir: (pestana: PestanaDelRapido) => void
  resumen: ReactNode
}

// «Resumen», «Seguimientos» y «Recordatorios» (`?pestana=`), sin números: el de «Seguimientos»
// insinuaría los privados de otros, y contar crece con el total. Sólo se dibuja la pestaña elegida, y
// cada una (salvo «Resumen») se pide y se lee al abrirla.
export function PestanasDelRapido({ leadId, pestana, alElegir, resumen }: Props) {
  return (
    <PestanasDelResumen
      etiqueta="Secciones del lead"
      pestanas={PESTANAS_DEL_RAPIDO}
      activa={pestana}
      alElegir={alElegir}
    >
      {pestana === 'seguimientos' ? (
        <SeguimientosDelRapidoDiferido key={leadId} leadId={leadId} />
      ) : pestana === 'recordatorios' ? (
        <RecordatoriosDelRapidoDiferido key={leadId} leadId={leadId} />
      ) : (
        resumen
      )}
    </PestanasDelResumen>
  )
}
