import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import { nombreDelProposito, type CategoriaDeGasto } from '../../../entities/dinero/categoria'

type Quehaceres = {
  alEditar: (id: string) => void
  alActivar: (categoria: CategoriaDeGasto, activo: boolean) => void
  alPedirEliminar: (id: string) => void
}

// El «⋯» de una categoría: Editar · Activar o Desactivar · ─ · Eliminar. Eliminar se ofrece siempre: no se cuenta el uso por fila; una con gastos no se borra y el diálogo lo dice.
function accionesDeCategoria(
  categoria: CategoriaDeGasto,
  { alEditar, alActivar, alPedirEliminar }: Quehaceres,
): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      despuesDeCerrar: true,
      alElegir: () => {
        alEditar(categoria.id)
      },
    },
    {
      tipo: 'accion',
      clave: categoria.activo ? 'desactivar' : 'activar',
      etiqueta: categoria.activo ? 'Desactivar' : 'Activar',
      alElegir: () => {
        alActivar(categoria, !categoria.activo)
      },
    },
    { tipo: 'separador', clave: 'antes-de-eliminar' },
    {
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      alElegir: () => {
        alPedirEliminar(categoria.id)
      },
    },
  ]
}

// Las categorías como filas de la lista de catálogo, ya en su orden (`orden`, luego `nombre`). El orden se cambia en «Editar» (un número), no con botones: intercambiar dos serían dos escrituras sin transacción.
export function filasDeCategorias(
  categorias: readonly CategoriaDeGasto[],
  quehaceres: Quehaceres,
): FilaDeCatalogo[] {
  return categorias.map((categoria) => ({
    id: categoria.id,
    nombre: categoria.nombre,
    icono: null,
    activo: categoria.activo,
    insignias: [],
    uso: nombreDelProposito(categoria.proposito),
    acciones: accionesDeCategoria(categoria, quehaceres),
    puedeSubir: false,
    puedeBajar: false,
    motivoSinOrden: 'El orden se cambia en «Editar».',
  }))
}
