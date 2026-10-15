import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import {
  leerCartera,
  leerEtiquetas,
  leerFicha,
  leerLayoutDeLeads,
  leerOrigenesDeLead,
} from '../../composicion'
import type { PersonaDeCartera } from '../../entities/cartera'
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
  // Quién lo tiene: nombres y tipo de acceso (sin correo ni teléfono).
  cartera: PersonaDeCartera[]
}

// Todo lo que la ficha necesita, en cinco lecturas paralelas: el lead con sus teléfonos, quién es
// el dueño y las marcas de quien mira (`lead_ficha()`), el layout, los orígenes, las etiquetas
// propias y quién lo tiene (`lead_cartera()`). `null` = no existe o no lo ve, sea por inexistente,
// papelera, limbo o sin acceso: la pantalla no distingue.
export async function leerFichaDeLead(id: string): Promise<Resultado<DatosDeLaFicha | null>> {
  const [ficha, layout, origenes, etiquetas, cartera] = await Promise.all([
    leerFicha(id),
    leerLayoutDeLeads(),
    leerOrigenesDeLead(),
    leerEtiquetas(),
    leerCartera(id),
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
  if (!cartera.ok) {
    return cartera
  }
  if (ficha.data === null) {
    return ok(null)
  }
  return ok({
    ficha: ficha.data,
    campos: layout.data,
    origenes: origenes.data,
    etiquetas: etiquetas.data,
    cartera: cartera.data,
  })
}
