// Los `<Drawer>` de la agenda (7.07-2) —el detalle de un evento y de una tarea (sin formulario) y los formularios de alta y edición (con su `<CambiosSinGuardar>`)— y el resumen de un grupo de transporte (6.08-3). Es un pedazo de
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
      'sólo es el detalle de una tarea, con «Marcar como hecha», «Editar» y «Eliminar» y el despliegue de reasignar (un selector que pide en el acto, sin guardar nada tipeado): no guarda nada tipeado; lo que se escribe está en el formulario de edición, que se registra aparte',
  },
  'src/modules/agenda/features/recordatorios/components/panel-de-recordatorio.tsx': {
    sinFormulario:
      'sólo es el detalle de un recordatorio, con «Completar» o «Reabrir»: no guarda nada tipeado; el recordatorio se edita desde el lead',
  },
  'src/modules/agenda/features/tareas/components/panel-de-formulario-de-tarea.tsx': {
    formulario: 'src/modules/agenda/features/tareas/components/panel-de-formulario-de-tarea.tsx',
    mecanismo: 'contexto',
  },
  // El resumen de un embarque o contenedor de `/logistica/embarques` (6.08-3).
  'src/modules/logistica/features/transporte/components/drawer-del-grupo.tsx': {
    sinFormulario:
      'sólo es el marco del resumen de un grupo (6.08-3): no guarda nada tipeado; lo que cada área escriba en sus huecos va en formularios que preguntan por sí solos',
  }, // El formulario de «Editar grupo» (6.08-4): tapa al resumen y pregunta antes de perder lo escrito.
  'src/modules/logistica/features/transporte/components/drawer-de-edicion-del-grupo.tsx': {
    formulario: 'src/modules/logistica/features/transporte/components/formulario-del-grupo.tsx',
    mecanismo: 'contexto',
  },
  // «Nueva guía» de Configuración › Sitio web › Guías (8.03-1): `?panel=guia-nueva`; el formulario dice que tiene algo escrito.
  'src/modules/web/features/contenido/guias/components/drawer-nueva-guia.tsx': {
    formulario: 'src/modules/web/features/contenido/guias/components/formulario-de-nueva-guia.tsx',
    mecanismo: 'contexto',
  },
}
