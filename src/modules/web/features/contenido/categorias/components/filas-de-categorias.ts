import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import {
  motivoDeNoEliminar,
  usoDeCategoria,
  type CategoriaDeGuia,
} from '../../../../entities/contenido/categorias'

type Quehaceres = {
  alRenombrar: (categoria: CategoriaDeGuia) => void
  alActivar: (categoria: CategoriaDeGuia, activa: boolean) => void
  alPedirEliminar: (id: string) => void
}

// Las líneas del «⋯» de una categoría: Renombrar · Activar o Desactivar · ─ · Eliminar (apagado y con su motivo si tiene guías).
function accionesDeCategoria(
  categoria: CategoriaDeGuia,
  { alRenombrar, alActivar, alPedirEliminar }: Quehaceres,
): AccionDeMenu[] {
  const motivo = motivoDeNoEliminar(categoria)
  return [
    {
      tipo: 'accion',
      clave: 'renombrar',
      etiqueta: 'Renombrar',
      alElegir: () => {
        alRenombrar(categoria)
      },
    },
    {
      tipo: 'accion',
      clave: categoria.activa ? 'desactivar' : 'activar',
      etiqueta: categoria.activa ? 'Desactivar' : 'Activar',
      alElegir: () => {
        alActivar(categoria, !categoria.activa)
      },
    },
    { tipo: 'separador', clave: 'antes-de-eliminar' },
    {
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      deshabilitada: motivo !== null,
      alElegir: () => {
        alPedirEliminar(categoria.id)
      },
    },
    ...(motivo === null
      ? []
      : [{ tipo: 'nota' as const, clave: 'motivo-de-eliminar', texto: motivo }]),
  ]
}

// Las categorías como filas de la lista de catálogo, en su orden (el que dan `orden` y el nombre).
export function filasDeCategorias(
  categorias: readonly CategoriaDeGuia[],
  quehaceres: Quehaceres,
): FilaDeCatalogo[] {
  return categorias.map((categoria, posicion) => ({
    id: categoria.id,
    nombre: categoria.nombre,
    icono: null,
    activo: categoria.activa,
    insignias: [],
    uso: usoDeCategoria(categoria),
    acciones: accionesDeCategoria(categoria, quehaceres),
    puedeSubir: posicion > 0,
    puedeBajar: posicion < categorias.length - 1,
  }))
}
