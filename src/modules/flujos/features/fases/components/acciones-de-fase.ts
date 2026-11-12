import type { AccionDeMenu } from '@/shared/ui/lista'

export type QuehaceresDeFase = {
  alEditar: () => void
  alPedirQuitar: () => void
  alReactivar: () => void
}

// Las líneas del «⋯» de una fase, en su orden. Activa: Editar · ─ · Jubilar o eliminar (destructiva). Jubilada: Editar · Reactivar. Lo que abre algo
// encima espera a que el menú se cierre (`despuesDeCerrar`). «Reactivar» se hace y se avisa: no ofrece «Deshacer», porque `fase_eliminar` sobre una
// fase sin uso la borraría (C5).
export function accionesDeFase(
  fase: { activa: boolean },
  { alEditar, alPedirQuitar, alReactivar }: QuehaceresDeFase,
): AccionDeMenu[] {
  const editar: AccionDeMenu = {
    tipo: 'accion',
    clave: 'editar',
    etiqueta: 'Editar',
    despuesDeCerrar: true,
    alElegir: alEditar,
  }
  if (!fase.activa) {
    return [
      editar,
      { tipo: 'accion', clave: 'reactivar', etiqueta: 'Reactivar', alElegir: alReactivar },
    ]
  }
  return [
    editar,
    { tipo: 'separador', clave: 'antes-de-quitar' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Jubilar o eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      alElegir: alPedirQuitar,
    },
  ]
}
