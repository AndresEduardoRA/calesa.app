import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  motivoParaNoDesactivar,
  motivoParaNoEliminar,
  motivoParaNoMarcarPorDefecto,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'

type Quehaceres = {
  alEditar: (id: string) => void
  alActivar: (origen: OrigenDeLeadConUso, activo: boolean) => void
  alMarcarPorDefecto: (origen: OrigenDeLeadConUso, valor: boolean) => void
  alPedirEliminar: (id: string) => void
}

// Las líneas del «⋯» de un origen del lead, en su orden: Editar · Activar o Desactivar · «Por defecto» · ─ · Eliminar. Lo que no se
// puede sale apagado con su motivo debajo: el origen por defecto no se apaga ni se elimina (quítale la marca o elige otro antes), uno
// apagado no puede ser el por defecto, y uno con leads no se elimina. Lo que abre algo encima espera a que el menú se cierre.
export function accionesDeOrigen(
  origen: OrigenDeLeadConUso,
  { alEditar, alActivar, alMarcarPorDefecto, alPedirEliminar }: Quehaceres,
): AccionDeMenu[] {
  const noDesactivar = origen.activo ? motivoParaNoDesactivar(origen) : null
  const noMarcar = origen.porDefecto ? null : motivoParaNoMarcarPorDefecto(origen)
  const noEliminar = motivoParaNoEliminar(origen)
  const nota = (clave: string, texto: string | null): AccionDeMenu[] =>
    texto === null ? [] : [{ tipo: 'nota', clave, texto }]
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      despuesDeCerrar: true,
      alElegir: () => {
        alEditar(origen.id)
      },
    },
    {
      tipo: 'accion',
      clave: origen.activo ? 'desactivar' : 'activar',
      etiqueta: origen.activo ? 'Desactivar' : 'Activar',
      deshabilitada: noDesactivar !== null,
      alElegir: () => {
        alActivar(origen, !origen.activo)
      },
    },
    ...nota('motivo-de-desactivar', noDesactivar),
    {
      tipo: 'accion',
      clave: origen.porDefecto ? 'quitar-por-defecto' : 'marcar-por-defecto',
      etiqueta: origen.porDefecto ? 'Quitar «por defecto»' : 'Marcar por defecto',
      deshabilitada: noMarcar !== null,
      alElegir: () => {
        alMarcarPorDefecto(origen, !origen.porDefecto)
      },
    },
    ...nota('motivo-de-marcar', noMarcar),
    { tipo: 'separador', clave: 'antes-de-eliminar' },
    {
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      deshabilitada: noEliminar !== null,
      alElegir: () => {
        alPedirEliminar(origen.id)
      },
    },
    ...nota('motivo-de-eliminar', noEliminar),
  ]
}
