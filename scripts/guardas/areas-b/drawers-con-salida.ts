// Los `<Drawer>` de la agenda (7.07-2): el detalle de un evento y de una tarea (sin formulario) y los formularios de alta y edición (con su `<CambiosSinGuardar>`). Es un pedazo de
// `DRAWERS` (`drawers-con-salida.ts`, del A) que la guarda suma con `import.meta.glob('./areas-*/drawers-con-salida.ts')` (`registros-de-carriles.ts`).
import type { RegistroDeDrawer } from '../drawers-con-salida'

export const REGISTRO: Record<string, RegistroDeDrawer> = {
  'src/modules/agenda/features/eventos/components/panel-de-evento.tsx': {
    sinFormulario:
      'sólo es el detalle de un evento, con «Editar» y «Eliminar»: no guarda nada tipeado; lo que se escribe está en el formulario de edición, que se registra aparte',
  },
  'src/modules/agenda/features/eventos/components/panel-de-formulario-de-evento.tsx': {
    formulario: 'src/modules/agenda/features/eventos/components/panel-de-formulario-de-evento.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/agenda/features/tareas/components/panel-de-tarea.tsx': {
    sinFormulario:
      'sólo es el detalle de una tarea, con «Editar» y «Eliminar»: no guarda nada tipeado; lo que se escribe está en el formulario de edición, que se registra aparte',
  },
  'src/modules/agenda/features/tareas/components/panel-de-formulario-de-tarea.tsx': {
    formulario: 'src/modules/agenda/features/tareas/components/panel-de-formulario-de-tarea.tsx',
    mecanismo: 'contexto',
  },
}
