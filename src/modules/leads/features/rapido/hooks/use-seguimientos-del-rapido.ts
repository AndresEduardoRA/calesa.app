'use client'

import { useEffect, useState } from 'react'
import { leerMasSeguimientos, leerTiposDeSeguimiento } from '../../../composicion.client'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { PaginaDeSeguimientos } from '../../../entities/seguimiento'

export type DatosDelRapido = {
  pagina: PaginaDeSeguimientos
  tipos: TipoDeSeguimiento[]
}

type Lectura =
  { leadId: string; estado: 'listo'; datos: DatosDelRapido } | { leadId: string; estado: 'error' }

// Lo mismo que lee la ficha para «Seguimientos» (la primera página, que dice si se puede anotar, y los
// tipos activos: una lista fija de configuración, que no crece con el lead), pero desde el navegador y
// sólo al elegir la pestaña: el listado no lo paga. Los recordatorios son de su pestaña.
async function leer(leadId: string): Promise<Lectura> {
  try {
    const [pagina, tipos] = await Promise.all([
      leerMasSeguimientos({ leadId, antes: null }),
      leerTiposDeSeguimiento(),
    ])
    if (!pagina.ok || !tipos.ok) {
      return { leadId, estado: 'error' }
    }
    return { leadId, estado: 'listo', datos: { pagina: pagina.data, tipos: tipos.data } }
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
  }
}
