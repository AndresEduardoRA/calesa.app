import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import {
  PapeleraDeLeads,
  leerPapeleraDeLeads,
  puedeAbrirLaPapelera,
  puedePurgarLeads,
} from '@/modules/leads'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { LOTES_POR_PAGINA, leerCursor } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Papelera de leads' }

// La papelera de leads, por lote. La abre quien envía leads a la papelera (ve lo suyo) o quien
// puede vaciarla (ve todo): qué lotes le tocan lo decide la base. Muestra el nombre y el número de
// cada lead, nunca su teléfono ni sus datos privados.
export default async function PaginaPapeleraDeLeads({
  searchParams,
}: PageProps<'/leads/papelera'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puedeAbrirLaPapelera(sesion.permisos)) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para enviar leads a la papelera ni para vaciarla. Pídeselo a quien administra los roles." />
    )
  }
  const pagina = datosO(
    await leerPapeleraDeLeads({
      cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR] ?? undefined)),
      tamano: LOTES_POR_PAGINA,
    }),
  )
  return (
    <PapeleraDeLeads
      pagina={pagina}
      puedePurgar={puedePurgarLeads(sesion.permisos)}
      // Contra este instante se cuentan los días que faltan: el mismo en el servidor y al hidratar.
      ahora={new Date().toISOString()}
    />
  )
}
