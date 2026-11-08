// Los `<Confirmar>` del carril C fuera de la papelera (4.27-2): borrar un comentario de una cotización. Es un pedazo de `CONFIRMAR_CON_URL` (`confirmar-con-url.ts`,
// del A) que la guarda suma con `import.meta.glob('./areas-*/confirmar-con-url.ts')` (`registros-de-carriles.ts`).
import type { ConfirmarConUrl } from '../confirmar-con-url'

export const REGISTRO: Record<string, ConfirmarConUrl> = {
  // `?panel=borrar-comentario&comentario=<id>`.
  'src/modules/cotizaciones/features/comentarios/components/confirmar-borrado.tsx': {
    abre: 'src/modules/cotizaciones/features/comentarios/hooks/use-borrado-por-url.ts',
    senal: 'PANEL_BORRAR_COMENTARIO',
  },
}
