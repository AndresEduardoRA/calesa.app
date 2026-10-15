import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import {
  PapeleraDeLeads,
  leerPapeleraDeLeads,
  puedeAbrirLaPapelera,
  puedePurgarLeads,
} from '@/modules/leads'
import { datosO } from '@/shared/lib/errores'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Papelera de leads' }

// La papelera de leads, por lote. La abre quien envía leads a la papelera (ve lo suyo) o quien
// puede vaciarla (ve todo): qué lotes le tocan lo decide la base. Muestra el nombre y el número de
// cada lead, nunca su teléfono ni sus datos privados.
export default async function PaginaPapeleraDeLeads() {
  const sesion = await requerirSesion()
  if (!puedeAbrirLaPapelera(sesion.permisos)) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para enviar leads a la papelera ni para vaciarla. Pídeselo a quien administra los roles." />
    )
  }
  const lotes = datosO(await leerPapeleraDeLeads())
  return (
    <PapeleraDeLeads
      lotes={lotes}
      puedePurgar={puedePurgarLeads(sesion.permisos)}
      // Contra este instante se cuentan los días que faltan: el mismo en el servidor y al hidratar.
      ahora={new Date().toISOString()}
    />
  )
}
