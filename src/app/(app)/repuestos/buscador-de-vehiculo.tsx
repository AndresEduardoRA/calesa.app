'use client'

import { buscarVehiculos } from '@/modules/buscador/client'
import { interpretarBusqueda } from '@/modules/leads/client'
import { fallo, ok } from '@/shared/lib/errores'
import { BuscadorConLista } from './buscador-con-lista'
import type { OpcionDelBuscador, PropsDelBuscador } from './tipos-del-buscador'

// Un número solo («#12», «123») busca leads y cotizaciones, nunca vehículos (D10 del buscador): para un vehículo hace falta texto.
function interpretar(texto: string): string | null {
  const interpretado = interpretarBusqueda(texto)
  return interpretado === null || interpretado.soloNumero ? null : interpretado.texto
}

async function buscar(texto: string, signal: AbortSignal) {
  const respuesta = await buscarVehiculos({ texto, signal })
  if (!respuesta.ok) {
    return fallo('inesperado', 'No se pudo buscar.')
  }
  return ok(
    respuesta.data.map((fila): OpcionDelBuscador => ({
      id: fila.id,
      titulo: fila.titulo,
      apoyo: [fila.vin, fila.lote].filter(Boolean).join(' · ') || undefined,
    })),
  )
}

// El campo «Vehículo» del proyecto: el inventario que quien mira ve (la RLS decide), por título, VIN o lote.
export function BuscadorDeVehiculo(props: PropsDelBuscador) {
  return (
    <BuscadorConLista
      {...props}
      nombre="vehiculoId"
      marcador="Título, VIN o lote"
      buscar={buscar}
      interpretar={interpretar}
      avisoDelMinimo="Escribe al menos 3 letras o dígitos del título, el VIN o el lote."
    />
  )
}
