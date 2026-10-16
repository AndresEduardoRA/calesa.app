'use client'

import { useEffect, useState } from 'react'
import { avisarError } from '@/shared/ui/toasts'
import {
  leerMasSeguimientos,
  leerRecordatoriosDelLead,
  leerTiposDeSeguimiento,
} from '../../../composicion.client'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { PaginaDeSeguimientos } from '../../../entities/seguimiento'

export type DatosDelRapido = {
  pagina: PaginaDeSeguimientos
  tipos: TipoDeSeguimiento[]
  recordatorios: Recordatorio[]
}

type Lectura =
  { leadId: string; estado: 'listo'; datos: DatosDelRapido } | { leadId: string; estado: 'error' }

// Lo mismo que lee la ficha para «Seguimientos» (la primera página, que dice si se puede anotar, los
// tipos activos y los recordatorios de quien mira), pero desde el navegador y sólo al elegir la
// pestaña: el listado no lo paga. Sin RPC nueva: las mismas consultas, con la sesión de quien mira.
async function leer(leadId: string): Promise<Lectura> {
  try {
    const [pagina, tipos, recordatorios] = await Promise.all([
      leerMasSeguimientos({ leadId, antes: null }),
      leerTiposDeSeguimiento(),
      leerRecordatoriosDelLead(leadId),
    ])
    if (!pagina.ok || !tipos.ok || !recordatorios.ok) {
      return { leadId, estado: 'error' }
    }
    return {
      leadId,
      estado: 'listo',
      datos: { pagina: pagina.data, tipos: tipos.data, recordatorios: recordatorios.data },
    }
  } catch {
    return { leadId, estado: 'error' }
  }
}

export function useSeguimientosDelRapido(leadId: string) {
  const [lectura, setLectura] = useState<Lectura | null>(null)
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let vigente = true
    void leer(leadId).then((nueva) => {
      if (vigente) {
        setLectura(nueva)
      }
    })
    return () => {
      vigente = false
    }
  }, [leadId, intento])

  return {
    // Una lectura de otro lead no vale: se espera la nueva.
    lectura: lectura?.leadId === leadId ? lectura : null,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
    // «Recargar» del modal de un recordatorio: sólo la lista de recordatorios, en su lugar.
    releerRecordatorios: async () => {
      const leidos = await leerRecordatoriosDelLead(leadId).catch(() => null)
      if (!leidos?.ok) {
        avisarError(
          leidos?.error ?? { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
        )
        return
      }
      setLectura((antes) =>
        antes?.estado === 'listo' && antes.leadId === leadId
          ? { ...antes, datos: { ...antes.datos, recordatorios: leidos.data } }
          : antes,
      )
    },
  }
}
