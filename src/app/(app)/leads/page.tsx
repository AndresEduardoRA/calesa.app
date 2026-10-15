import type { Metadata } from 'next'
import { leerAjustes } from '@/modules/empresa'
import { leerVistas, puede, requerirSesion } from '@/modules/equipo'
import { ListadoDeLeads, leerListadoDeLeads } from '@/modules/leads'
import { datosO } from '@/shared/lib/errores'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Leads' }

// Los leads que la persona puede ver. Quién ve qué lo decide la base (`leads_vista` y la RLS de
// `leads`): «propios» sólo lo de su cartera; «todos», todo, con el teléfono enmascarado y sin los
// datos «solo la cartera» de los ajenos. El modo, los filtros, la página y el lead abierto vienen
// en la URL, y lo que no corresponde se ignora.
export default async function PaginaLeads({ searchParams }: PageProps<'/leads'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'leads.ver')) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para ver leads. Pídeselo a quien administra los roles." />
    )
  }
  const [ajustesLeidos, vistas] = await Promise.all([leerAjustes(), leerVistas('leads')])
  // Si no se pueden leer, el listado se dibuja igual: zona por defecto y el teléfono con «+».
  const ajustes = ajustesLeidos.ok ? ajustesLeidos.data.ajustes : null
  const listado = datosO(
    await leerListadoDeLeads({
      permisos: sesion.permisos,
      parametros,
      zona: ajustes?.zonaHoraria ?? ZONA_POR_DEFECTO,
      usuarioId: sesion.usuarioId,
    }),
  )
  return (
    <ListadoDeLeads
      {...listado}
      vistas={datosO(vistas)}
      puedeCrear={puede(sesion.permisos, 'leads.crear')}
      puedeConfigurarCampos={puede(sesion.permisos, 'leads.configurar')}
      codigoDePais={ajustes?.telefonoCc ?? null}
    />
  )
}
