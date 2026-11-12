import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import type { ValorDeCatalogo } from '../../../entities/catalogos/catalogo'

type Quehaceres = {
  alEditar: (id: string) => void
  alActivar: (valor: ValorDeCatalogo, activo: boolean) => void
  alPedirEliminar: (id: string) => void
}

// El «⋯» de un valor: Editar · Activar o Desactivar · ─ · Eliminar. Eliminar se ofrece siempre: el uso no se lee (D25); uno en uso no se borra y el
// diálogo lo dice.
function accionesDeValor(
  valor: ValorDeCatalogo,
  { alEditar, alActivar, alPedirEliminar }: Quehaceres,
): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      despuesDeCerrar: true,
      alElegir: () => {
        alEditar(valor.id)
      },
    },
    {
      tipo: 'accion',
      clave: valor.activo ? 'desactivar' : 'activar',
      etiqueta: valor.activo ? 'Desactivar' : 'Activar',
      alElegir: () => {
        alActivar(valor, !valor.activo)
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
        alPedirEliminar(valor.id)
      },
    },
  ]
}

// Los valores de un catálogo como filas de la lista de catálogo, ya en su orden (`orden`, luego `nombre`, de la lectura). La columna de uso dice el orden
// (D29): el uso real no se lee. El orden se cambia en «Editar» (D21), no con botones.
export function filasDeValores(
  valores: readonly ValorDeCatalogo[],
  quehaceres: Quehaceres,
): FilaDeCatalogo[] {
  return valores.map((valor) => ({
    id: valor.id,
    nombre: valor.nombre,
    icono: null,
    activo: valor.activo,
    insignias: [],
    uso: String(valor.orden),
    acciones: accionesDeValor(valor, quehaceres),
    puedeSubir: false,
    puedeBajar: false,
    motivoSinOrden: 'El orden se cambia en «Editar».',
  }))
}
