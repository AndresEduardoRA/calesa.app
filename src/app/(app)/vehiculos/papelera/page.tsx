import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import {
  PapeleraDeVehiculos,
  leerPapelera,
  limpiezaPendiente,
  puedeAbrirLaPapelera,
  puedePurgar,
  resumenDeUltimaLimpieza,
  ultimaLimpieza,
} from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { LOTES_POR_PAGINA, leerCursor } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Papelera de vehículos' }

// La papelera de vehículos, por lote. La abre quien envía a la papelera en algún origen (ve lo
// suyo) o quien puede vaciarla (ve todo): qué lotes le tocan lo decide la base.
export default async function PaginaPapeleraDeVehiculos({
  searchParams,
}: PageProps<'/vehiculos/papelera'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puedeAbrirLaPapelera(sesion.permisos)) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para enviar vehículos a la papelera ni para vaciarla. Pídeselo a quien administra los roles." />
    )
  }
  const [lotes, origenes, limpieza, ultima] = await Promise.all([
    leerPapelera({
      cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR] ?? undefined)),
      tamano: LOTES_POR_PAGINA,
    }),
    getOrigenes(true),
    limpiezaPendiente(),
    // Sólo quien puede vaciar la papelera la ve; para el resto la base responde nulo.
    ultimaLimpieza(),
  ])
  return (
    <PapeleraDeVehiculos
      pagina={datosO(lotes)}
      origenes={datosO(origenes)}
      puedePurgar={puedePurgar(sesion.permisos)}
      // Contra este instante se cuentan los días que faltan: el mismo en el servidor y al hidratar.
      ahora={new Date().toISOString()}
      limpieza={limpieza}
      ultimaLimpiezaAutomatica={ultima ? resumenDeUltimaLimpieza(ultima) : null}
    />
  )
}
