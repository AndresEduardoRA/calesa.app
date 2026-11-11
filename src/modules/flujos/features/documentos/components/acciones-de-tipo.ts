import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  motivoDeSoloLectura,
  motivoParaNoEliminar,
} from '../../../entities/documentos/vista-de-grupo'
import type {
  ClaveDeGrupo,
  TipoDeDocumento,
  UsoDeTipo,
} from '../../../entities/documentos/tipo-de-documento'

export type QuehaceresDeTipo = {
  alEditar: (id: string) => void
  alActivar: (tipo: TipoDeDocumento, activo: boolean) => void
  alPedirEliminar: (id: string) => void
}

type Contexto = { clave: ClaveDeGrupo; puedeCambiar: boolean; uso: UsoDeTipo | null }

// Las líneas del «⋯» de un tipo de documento, en su orden: Editar · Activar o Desactivar · ─ · Eliminar. Sin permiso sobre el grupo, «Editar» queda apagada
// con el motivo y no se ofrece nada más. Eliminar está apagado y dice por qué si algo lo usa: ahí sólo se desactiva (el tipo sigue nombrando lo que ya lo usa).
// Lo que abre algo encima espera a que el menú se cierre.
export function accionesDeTipo(
  tipo: TipoDeDocumento,
  { clave, puedeCambiar, uso }: Contexto,
  { alEditar, alActivar, alPedirEliminar }: QuehaceresDeTipo,
): AccionDeMenu[] {
  if (!puedeCambiar) {
    return [
      {
        tipo: 'accion',
        clave: 'editar',
        etiqueta: 'Editar',
        deshabilitada: true,
        alElegir: () => undefined,
      },
      { tipo: 'nota', clave: 'motivo-de-editar', texto: motivoDeSoloLectura(clave) },
    ]
  }
  const motivoNoEliminar = motivoParaNoEliminar(uso)
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
