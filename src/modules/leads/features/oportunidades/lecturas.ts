import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import { leerEmbudos, leerOportunidadesDelLead } from '../../composicion'
import type { Embudo } from '../../entities/embudo'
import type { OportunidadDelLead } from '../../entities/oportunidad'

export type DatosDeOportunidades = {
  puedoCrear: boolean
  oportunidades: OportunidadDelLead[]
  // Los de quien mira, con sus etapas: «Mover a…» ofrece las del embudo de cada una.
  embudos: Embudo[]
}

// La sección «Oportunidades» de la ficha: las de quien mira sobre ese lead y sus embudos, en paralelo.
export async function leerOportunidadesDeLead(
  leadId: string,
): Promise<Resultado<DatosDeOportunidades>> {
  const [oportunidades, embudos] = await Promise.all([
    leerOportunidadesDelLead(leadId),
    leerEmbudos(),
  ])
  if (!oportunidades.ok) {
    return oportunidades
  }
  if (!embudos.ok) {
    return embudos
  }
  return ok({ ...oportunidades.data, embudos: embudos.data })
}
