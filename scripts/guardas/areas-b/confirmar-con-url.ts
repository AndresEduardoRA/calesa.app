// Los `<Confirmar>` del carril B (5.04). Es un pedazo de `CONFIRMAR_CON_URL` (`confirmar-con-url.ts`, del A) que la guarda suma con
// `import.meta.glob('./areas-*/confirmar-con-url.ts')` (`registros-de-carriles.ts`).
import type { ConfirmarConUrl } from '../confirmar-con-url'

export const REGISTRO: Record<string, ConfirmarConUrl> = {
  // `?panel=eliminar-fase&quitar=<id>` (5.04).
  'src/modules/flujos/features/fases/components/confirmar-eliminar-fase.tsx': {
    abre: 'src/modules/flujos/features/fases/hooks/use-eliminar-fase-por-url.ts',
    senal: 'PANEL_ELIMINAR_FASE',
  },
}
