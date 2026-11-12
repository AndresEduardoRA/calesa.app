'use client'

import { buscarLeads } from '@/modules/buscador/client'
import { interpretarBusqueda } from '@/modules/leads/client'
import { fallo, ok } from '@/shared/lib/errores'
import { BuscadorConLista } from './buscador-con-lista'
import type { OpcionDelBuscador, PropsDelBuscador } from './tipos-del-buscador'

function interpretar(texto: string): string | null {
  return interpretarBusqueda(texto)?.texto ?? null
}

async function buscar(texto: string, signal: AbortSignal) {
  const respuesta = await buscarLeads({ texto, signal })
  if (!respuesta.ok) {
    return fallo('inesperado', 'No se pudo buscar.')
  }
  return ok(
    respuesta.data.map((fila): OpcionDelBuscador => ({
      id: fila.id,
      titulo: fila.nombre ?? 'Sin nombre',
      apoyo: fila.numero_visible === null ? undefined : `#${String(fila.numero_visible)}`,
    })),
  )
}

// El campo «Lead» de un proyecto externo (sólo con `leads.ver`): por nombre o número, con los leads que quien mira ve.
export function BuscadorDeLead(props: PropsDelBuscador) {
  return (
    <BuscadorConLista
      {...props}
      nombre="leadId"
      marcador="Nombre o número"
      buscar={buscar}
      interpretar={interpretar}
      avisoDelMinimo="Escribe al menos 3 letras o un número."
    />
  )
}
