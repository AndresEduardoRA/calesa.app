// Los `<Confirmar>` del carril B: de las fases (5.04), de la agenda (7.07-2) eliminar un evento y eliminar una tarea, y de flujos (5.06) quitar una salida, cada uno con su `?eliminar=` (`usePanelPorUrl` con `{ clave: 'eliminar' }`). Es un pedazo de
// `CONFIRMAR_CON_URL` (`confirmar-con-url.ts`, del A) que la guarda suma con `import.meta.glob('./areas-*/confirmar-con-url.ts')` (`registros-de-carriles.ts`).
import type { ConfirmarConUrl } from '../confirmar-con-url'

export const REGISTRO: Record<string, ConfirmarConUrl> = {
  // `?panel=eliminar-fase&quitar=<id>` (5.04).
  'src/modules/flujos/features/fases/components/confirmar-eliminar-fase.tsx': {
    abre: 'src/modules/flujos/features/fases/hooks/use-eliminar-fase-por-url.ts',
    senal: 'PANEL_ELIMINAR_FASE',
  },
  // Agenda (7.07-2): eliminar un evento y eliminar una tarea, cada uno con su `?eliminar=` (`usePanelPorUrl` con `{ clave: 'eliminar' }`).
  // `?eliminar=evento` (con `?evento=<id>` debajo).
  'src/modules/agenda/features/eventos/components/confirmar-eliminar-evento.tsx': {
    abre: 'src/modules/agenda/features/eventos/hooks/use-eliminar-evento-por-url.ts',
    senal: 'PANEL_ELIMINAR_EVENTO',
  },
  // `?eliminar=tarea` (con `?tarea=<id>` debajo).
  'src/modules/agenda/features/tareas/components/confirmar-eliminar-tarea.tsx': {
    abre: 'src/modules/agenda/features/tareas/hooks/use-eliminar-tarea-por-url.ts',
    senal: 'PANEL_ELIMINAR_TAREA',
  },
  // `?eliminar=salida&salida=<id>` (5.06): el diálogo de un inspector que ya ocupa `?fase=`.
  'src/modules/flujos/features/transiciones/components/eliminar-salida.tsx': {
    abre: 'src/modules/flujos/features/transiciones/hooks/use-eliminar-salida-por-url.ts',
    senal: 'PANEL_ELIMINAR_SALIDA',
  },
  // `?panel=eliminar-documento&documento=<id>` (6.06-3): eliminar un documento de una unidad.
  'src/modules/logistica/features/documentos/components/confirmar-eliminar-documento.tsx': {
    abre: 'src/modules/logistica/features/documentos/hooks/use-eliminar-documento-por-url.ts',
    senal: 'PANEL_ELIMINAR_DOCUMENTO',
  },
  // `?panel=eliminar-faq&faq=<id>` (8.02-1): eliminar una pregunta frecuente, desde el «⋯» de la lista.
  'src/modules/web/features/contenido/faqs/components/confirmar-eliminar-faq.tsx': {
    abre: 'src/modules/web/features/contenido/faqs/hooks/use-eliminar-faq-por-url.ts',
    senal: 'PANEL_ELIMINAR_FAQ',
  },
}
