// Los `<Confirmar>` del carril B: las fases (5.04) y la agenda (7.07-2). Es un pedazo de `CONFIRMAR_CON_URL` (`confirmar-con-url.ts`, del A) que la guarda suma con
// `import.meta.glob('./areas-*/confirmar-con-url.ts')` (`registros-de-carriles.ts`).
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
}
