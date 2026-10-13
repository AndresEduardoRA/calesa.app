import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import {
  PapeleraDeVehiculos,
  leerPapelera,
  limpiezaPendiente,
  puedeAbrirLaPapelera,
  puedePurgar,
} from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Papelera de vehículos' }

// La papelera de vehículos, por lote. La abre quien envía a la papelera en algún origen (ve lo
// suyo) o quien puede vaciarla (ve todo): qué lotes le tocan lo decide la base.
export default async function PaginaPapeleraDeVehiculos() {
  const sesion = await requerirSesion()
  if (!puedeAbrirLaPapelera(sesion.permisos)) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para enviar vehículos a la papelera ni para vaciarla. Pídeselo a quien administra los roles." />
    )
  }
  const [lotes, origenes, limpieza] = await Promise.all([
    leerPapelera(),
    getOrigenes(true),
    limpiezaPendiente(),
  ])
  return (
    <PapeleraDeVehiculos
      lotes={datosO(lotes)}
      origenes={datosO(origenes)}
      puedePurgar={puedePurgar(sesion.permisos)}
      // Contra este instante se cuentan los días que faltan: el mismo en el servidor y al hidratar.
      ahora={new Date().toISOString()}
      limpieza={limpieza}
    />
  )
}
