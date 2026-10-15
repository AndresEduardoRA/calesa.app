import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import { leerEtiquetas, leerFicha, leerLayoutDeLeads, leerOrigenesDeLead } from '../../composicion'
import type { CampoDeLead } from '../../entities/campo'
import type { Etiqueta } from '../../entities/etiqueta'
import type { LeadDeFicha, OrigenConEstado } from '../../entities/ficha'

export type DatosDeLaFicha = {
  ficha: LeadDeFicha
  // Todo el layout: la ficha y el panel filtran los activos.
  campos: CampoDeLead[]
  // También los apagados: el lead que entró por uno se sigue nombrando.
  origenes: OrigenConEstado[]
  // Las de quien mira: nombran las del lead y se ofrecen en el selector.
  etiquetas: Etiqueta[]
}

// Todo lo que la ficha necesita, en cuatro lecturas paralelas: el lead con sus teléfonos, quién lo
// tiene y las marcas de quien mira (`lead_ficha()`), el layout, los orígenes y las etiquetas propias. `null` = no existe o no lo ve, sea por
// inexistente, papelera, limbo o sin acceso: la pantalla no distingue.
export async function leerFichaDeLead(id: string): Promise<Resultado<DatosDeLaFicha | null>> {
  const [ficha, layout, origenes, etiquetas] = await Promise.all([
    leerFicha(id),
    leerLayoutDeLeads(),
    leerOrigenesDeLead(),
    leerEtiquetas(),
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
  if (!etiquetas.ok) {
    return etiquetas
  }
  if (ficha.data === null) {
    return ok(null)
  }
  return ok({
    ficha: ficha.data,
    campos: layout.data,
    origenes: origenes.data,
    etiquetas: etiquetas.data,
  })
}
