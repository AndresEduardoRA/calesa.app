import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import {
  usoDelPuerto,
  type NavieraDeCatalogo,
  type PuertoDeCatalogo,
} from '../../../entities/transporte/catalogo'

type Quehaceres<T> = {
  alEditar: (id: string) => void
  alActivar: (fila: T, activo: boolean) => void
}

// El «⋯» de un puerto o de una naviera: Editar · Activar o Desactivar. No hay «Eliminar»: borrar deja sin puerto o naviera a los transportes ya cargados y vacía la oferta de los flujos (D3).
function accionesDe<T extends { id: string; activo: boolean }>(
  fila: T,
  { alEditar, alActivar }: Quehaceres<T>,
): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      despuesDeCerrar: true,
      alElegir: () => {
        alEditar(fila.id)
      },
    },
    {
      tipo: 'accion',
      clave: fila.activo ? 'desactivar' : 'activar',
      etiqueta: fila.activo ? 'Desactivar' : 'Activar',
      alElegir: () => {
        alActivar(fila, !fila.activo)
      },
    },
  ]
}

const MOTIVO_SIN_ORDEN = 'El orden se cambia en «Editar».'

// Los puertos como filas de la lista de catálogo, ya en su orden (`orden`, luego `nombre`). El orden se cambia en «Editar» (un número), no con botones: intercambiar dos serían dos escrituras sin transacción.
export function filasDePuertos(
  puertos: readonly PuertoDeCatalogo[],
  quehaceres: Quehaceres<PuertoDeCatalogo>,
): FilaDeCatalogo[] {
  return puertos.map((puerto) => ({
    id: puerto.id,
    nombre: puerto.nombre,
    icono: null,
    activo: puerto.activo,
    insignias: [],
    uso: usoDelPuerto(puerto),
    acciones: accionesDe(puerto, quehaceres),
    puedeSubir: false,
    puedeBajar: false,
    motivoSinOrden: MOTIVO_SIN_ORDEN,
  }))
}

// Las navieras como filas, por nombre: no tienen orden propio. La columna de uso dice su estado con texto.
export function filasDeNavieras(
  navieras: readonly NavieraDeCatalogo[],
  quehaceres: Quehaceres<NavieraDeCatalogo>,
): FilaDeCatalogo[] {
  return navieras.map((naviera) => ({
    id: naviera.id,
    nombre: naviera.nombre,
    icono: null,
    activo: naviera.activo,
    insignias: [],
    uso: naviera.activo ? 'Activa' : 'Inactiva',
    acciones: accionesDe(naviera, quehaceres),
    puedeSubir: false,
    puedeBajar: false,
    motivoSinOrden: 'Las navieras se listan por nombre.',
  }))
}
