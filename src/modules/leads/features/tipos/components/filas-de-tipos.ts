import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import {
  NOMBRE_DE_CLASE,
  destinoDeTipo,
  type TipoDeLeadConUso,
} from '../../../entities/tipo-de-lead'
import { accionesDeTipo } from './acciones-de-tipo'

type Quehaceres = Parameters<typeof accionesDeTipo>[2]

// Los tipos de lead como filas de la lista de catálogo, en su orden: con su clase dicha con texto, lo que se dice de uso, qué lugares puede dar y
// las líneas de su «⋯» (cada una sabe si es el último activo de su clase).
export function filasDeTipos(
  tipos: readonly TipoDeLeadConUso[],
  quehaceres: Quehaceres,
): FilaDeCatalogo[] {
  return tipos.map((tipo) => ({
    id: tipo.id,
    nombre: tipo.nombre,
    icono: tipo.icono,
    activo: tipo.activo,
    insignias: [NOMBRE_DE_CLASE[tipo.clase]],
    uso: tipo.conLeads ? 'Tiene leads' : 'Sin leads',
    acciones: accionesDeTipo(tipos, tipo, quehaceres),
    puedeSubir: destinoDeTipo(tipos, tipo.id, 'subir') !== null,
    puedeBajar: destinoDeTipo(tipos, tipo.id, 'bajar') !== null,
  }))
}
