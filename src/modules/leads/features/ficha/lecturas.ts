import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import { leerFicha, leerLayoutDeLeads, leerOrigenesDeLead } from '../../composicion'
import type { CampoDeLead } from '../../entities/campo'
import type { LeadDeFicha, OrigenConEstado } from '../../entities/ficha'

export type DatosDeLaFicha = {
  ficha: LeadDeFicha
  // Todo el layout: la ficha y el panel filtran los activos.
  campos: CampoDeLead[]
  // También los apagados: el lead que entró por uno se sigue nombrando.
  origenes: OrigenConEstado[]
}

// Todo lo que la ficha necesita, en tres lecturas paralelas: el lead con sus teléfonos y quién lo
// tiene (`lead_ficha()`), el layout y los orígenes. `null` = no existe o no lo ve, sea por
// inexistente, papelera, limbo o sin acceso: la pantalla no distingue.
export async function leerFichaDeLead(id: string): Promise<Resultado<DatosDeLaFicha | null>> {
  const [ficha, layout, origenes] = await Promise.all([
    leerFicha(id),
    leerLayoutDeLeads(),
    leerOrigenesDeLead(),
  ])
  if (!ficha.ok) {
    return ficha
  }
  if (!layout.ok) {
    return layout
  }
  if (!origenes.ok) {
    return origenes
  }
  if (ficha.data === null) {
    return ok(null)
  }
  return ok({ ficha: ficha.data, campos: layout.data, origenes: origenes.data })
}
