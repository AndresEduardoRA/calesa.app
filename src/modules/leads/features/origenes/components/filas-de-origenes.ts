import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import { destinoDeOrigen, type OrigenDeLeadConUso } from '../../../entities/origen-de-lead'
import { accionesDeOrigen } from './acciones-de-origen'

type Quehaceres = Parameters<typeof accionesDeOrigen>[1]

// Los orígenes del lead como filas de la lista de catálogo, en su orden: lo que se dice de cada uno, qué lugares puede dar y las líneas de su «⋯».
export function filasDeOrigenes(
  origenes: readonly OrigenDeLeadConUso[],
  quehaceres: Quehaceres,
): FilaDeCatalogo[] {
  return origenes.map((origen) => ({
    id: origen.id,
    nombre: origen.nombre,
    icono: origen.icono,
    activo: origen.activo,
    insignias: origen.porDefecto ? ['Por defecto'] : [],
    uso: origen.conLeads ? 'Tiene leads' : 'Sin leads',
    acciones: accionesDeOrigen(origen, quehaceres),
    puedeSubir: destinoDeOrigen(origenes, origen.id, 'subir') !== null,
    puedeBajar: destinoDeOrigen(origenes, origen.id, 'bajar') !== null,
  }))
}
