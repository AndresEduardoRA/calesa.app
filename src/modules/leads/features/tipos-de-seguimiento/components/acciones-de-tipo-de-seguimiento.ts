import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  motivoParaNoEliminar,
  type TipoDeSeguimientoConUso,
} from '../../../entities/tipo-de-seguimiento'

type Quehaceres = {
  alEditar: (id: string) => void
  alActivar: (tipo: TipoDeSeguimientoConUso, activo: boolean) => void
  alPedirEliminar: (id: string) => void
}

// Las líneas del «⋯» de un tipo de seguimiento, en su orden: Editar · Activar o Desactivar · ─ · Eliminar. Cualquiera se puede apagar. Eliminar
// está apagado y dice por qué si algún seguimiento lo usa (ahí sólo se desactiva). Lo que abre algo encima espera a que el menú se cierre.
export function accionesDeTipoDeSeguimiento(
  tipo: TipoDeSeguimientoConUso,
  { alEditar, alActivar, alPedirEliminar }: Quehaceres,
): AccionDeMenu[] {
  const motivoNoEliminar = motivoParaNoEliminar(tipo)
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      despuesDeCerrar: true,
      alElegir: () => {
        alEditar(tipo.id)
      },
    },
    {
      tipo: 'accion',
      clave: tipo.activo ? 'desactivar' : 'activar',
      etiqueta: tipo.activo ? 'Desactivar' : 'Activar',
      alElegir: () => {
        alActivar(tipo, !tipo.activo)
      },
    },
    { tipo: 'separador', clave: 'antes-de-eliminar' },
    {
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      deshabilitada: motivoNoEliminar !== null,
      alElegir: () => {
        alPedirEliminar(tipo.id)
      },
    },
    ...(motivoNoEliminar === null
      ? []
      : [{ tipo: 'nota' as const, clave: 'motivo-de-eliminar', texto: motivoNoEliminar }]),
  ]
}
