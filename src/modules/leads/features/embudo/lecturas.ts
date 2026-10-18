import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { ParametrosDeUrl } from '@/shared/lib/filtros'
import { TAMANO_DE_COLUMNA } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { alcanceDe, type Permisos } from '@/shared/lib/permisos'
import { leerEmbudos, leerEtiquetas, leerTablero } from '../../composicion'
import type { Embudo } from '../../entities/embudo'
import type { Etiqueta } from '../../entities/etiqueta'
import { puedeEditarLead } from '../../entities/edicion'
import {
  CLAVE_DE_BUSQUEDA_DEL_EMBUDO,
  CLAVE_DE_EMBUDO,
  busquedaDelEmbudo,
  type Tablero,
} from '../../entities/tablero'

// Lo que el «⋯» de cada tarjeta necesita saber de quien mira (el kanban no lleva los permisos al navegador): sus etiquetas, si puede editar
// (agendar y anotar, con el lead en su cartera), hasta dónde puede enviar a la papelera y quién es (con «propios», sólo lo suyo).
export type ParaElMenuDelEmbudo = {
  etiquetas: Etiqueta[]
  editar: boolean
  eliminar: 'todos' | 'propios' | null
  usuarioId: string
}

export type DatosDelEmbudo = {
  // Los de quien mira (vacío la primera vez: la vista crea el de por defecto).
  embudos: Embudo[]
  // El kanban del embudo elegido (el de la URL si es suyo; si no, el de por defecto).
  tablero: Tablero | null
  paraElMenu: ParaElMenuDelEmbudo
}

// `/leads?vista=embudo`: los embudos de quien mira y el kanban del elegido, con la búsqueda de `?q=` (cierre 1). Los
// filtros del listado no aplican acá. Sólo las oportunidades propias sobre leads vivos de la cartera (lo decide la RLS).
export async function leerVistaDeEmbudo(
  parametros: ParametrosDeUrl,
  quien: { permisos: Permisos; usuarioId: string },
): Promise<Resultado<DatosDelEmbudo>> {
  const [embudos, etiquetas] = await Promise.all([leerEmbudos(), leerEtiquetas()])
  if (!embudos.ok) {
    return embudos
  }
  if (!etiquetas.ok) {
    return etiquetas
  }
  const paraElMenu: ParaElMenuDelEmbudo = {
    etiquetas: etiquetas.data,
    editar: puedeEditarLead(quien.permisos, true),
    eliminar: alcanceDe(quien.permisos, 'leads.eliminar'),
    usuarioId: quien.usuarioId,
  }
  const pedido = unParametro(parametros[CLAVE_DE_EMBUDO] ?? undefined)
  const elegido = embudos.data.find((e) => e.id === pedido) ?? embudos.data[0]
  if (!elegido) {
    return ok({ embudos: [], tablero: null, paraElMenu })
  }
  const buscar = busquedaDelEmbudo(
    unParametro(parametros[CLAVE_DE_BUSQUEDA_DEL_EMBUDO] ?? undefined),
  )
  const tablero = await leerTablero({ embudoId: elegido.id, tope: TAMANO_DE_COLUMNA, buscar })
  if (!tablero.ok) {
    return tablero
  }
  return ok({ embudos: embudos.data, tablero: tablero.data, paraElMenu })
}
