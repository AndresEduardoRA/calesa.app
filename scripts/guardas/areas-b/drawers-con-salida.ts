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
  // «Categorías» de Configuración › Sitio web › Guías (8.03-2): `?panel=categorias`; el nombre que se escribe dice que hay algo escrito. El pie es «Listo».
  'src/modules/web/features/contenido/categorias/components/drawer-de-categorias.tsx': {
    formulario:
      'src/modules/web/features/contenido/categorias/components/formulario-de-categoria.tsx',
    mecanismo: 'contexto',
  },
  // El alta y la edición de una pregunta frecuente de Configuración › Sitio web (8.02-1): lo escrito queda en su borrador y pregunta al salir.
  'src/modules/web/features/contenido/faqs/components/panel-de-faq.tsx': {
    formulario: 'src/modules/web/features/contenido/faqs/components/panel-de-faq.tsx',
    mecanismo: 'contexto',
  },
  // El alta y la edición de un testimonio de Configuración › Sitio web (8.02-2): lo escrito queda en su borrador y pregunta al salir.
  'src/modules/web/features/contenido/testimonios/components/panel-de-testimonio.tsx': {
    formulario: 'src/modules/web/features/contenido/testimonios/components/panel-de-testimonio.tsx',
    mecanismo: 'contexto',
  },
  // «Registrar consentimiento» de un testimonio (8.02-2): el canal y las casillas escritas quedan en su borrador y preguntan al salir.
  'src/modules/web/features/contenido/testimonios/components/panel-de-consentimiento.tsx': {
    formulario:
      'src/modules/web/features/contenido/testimonios/components/panel-de-consentimiento.tsx',
    mecanismo: 'contexto',
  },
}
