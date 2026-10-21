import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import {
  destinoDeTipoDeSeguimiento,
  type ListaDeTiposDeSeguimiento,
  type TipoDeSeguimientoConUso,
} from '../../../entities/tipo-de-seguimiento'
import { accionesDeTipoDeSeguimiento } from './acciones-de-tipo-de-seguimiento'

type Quehaceres = {
  alEditar: (id: string) => void
  alActivar: (tipo: TipoDeSeguimientoConUso, activo: boolean) => void
  alPedirEliminar: (id: string) => void
}

// Los tipos de seguimiento como filas de la lista de catálogo, en su orden: lo que se dice de cada uno, qué lugares puede dar y las
// líneas de su «⋯».
export function filasDeTiposDeSeguimiento(
  lista: ListaDeTiposDeSeguimiento,
  quehaceres: Quehaceres,
): FilaDeCatalogo[] {
  return lista.tipos.map((tipo) => ({
    id: tipo.id,
    nombre: tipo.nombre,
    icono: tipo.icono,
    activo: tipo.activo,
    insignias: [],
    uso: tipo.conSeguimientos ? 'Tiene seguimientos' : 'Sin seguimientos',
    acciones: accionesDeTipoDeSeguimiento(tipo, quehaceres),
    puedeSubir: destinoDeTipoDeSeguimiento(lista.tipos, tipo.id, 'subir') !== null,
    puedeBajar: destinoDeTipoDeSeguimiento(lista.tipos, tipo.id, 'bajar') !== null,
  }))
}
