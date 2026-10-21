import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  motivoParaNoDesactivar,
  motivoParaNoEliminar,
  type TipoDeLeadConUso,
} from '../../../entities/tipo-de-lead'

type Quehaceres = {
  alEditar: (id: string) => void
  alActivar: (tipo: TipoDeLeadConUso, activo: boolean) => void
  alPedirEliminar: (id: string) => void
}

// Las líneas del «⋯» de un tipo de lead, en su orden: Editar · Activar o Desactivar · ─ · Eliminar. Lo que no se puede sale apagado con su motivo
// debajo: el último activo de su clase no se apaga ni se elimina (siempre queda uno de cada clase) y uno con leads no se elimina. Lo que abre
// algo encima espera a que el menú se cierre.
export function accionesDeTipo(
  tipos: readonly TipoDeLeadConUso[],
  tipo: TipoDeLeadConUso,
  { alEditar, alActivar, alPedirEliminar }: Quehaceres,
): AccionDeMenu[] {
  const noDesactivar = tipo.activo ? motivoParaNoDesactivar(tipos, tipo) : null
  const noEliminar = motivoParaNoEliminar(tipos, tipo)
  const nota = (clave: string, texto: string | null): AccionDeMenu[] =>
    texto === null ? [] : [{ tipo: 'nota', clave, texto }]
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
      deshabilitada: noDesactivar !== null,
      alElegir: () => {
        alActivar(tipo, !tipo.activo)
      },
    },
    ...nota('motivo-de-desactivar', noDesactivar),
    { tipo: 'separador', clave: 'antes-de-eliminar' },
    {
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      deshabilitada: noEliminar !== null,
      alElegir: () => {
        alPedirEliminar(tipo.id)
      },
    },
    ...nota('motivo-de-eliminar', noEliminar),
  ]
}
