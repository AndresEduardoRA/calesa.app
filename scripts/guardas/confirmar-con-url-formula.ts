// Los `<Confirmar>` del área de la fórmula, del carril B (4.20-2c). Es un pedazo de `CONFIRMAR_CON_URL` (`confirmar-con-url.ts`, del A) en su
// propio archivo para que el B registre su diálogo sin tocar un archivo del A (4.20-2c). Hoy, el de descartar el borrador.
import type { ConfirmarConUrl } from './confirmar-con-url'

export const CONFIRMAR_CON_URL_DE_LA_FORMULA: Record<string, ConfirmarConUrl> = {
  'src/modules/cotizaciones/features/formula/components/descartar-borrador.tsx': {
    abre: 'src/modules/cotizaciones/features/formula/hooks/use-panel-de-la-formula.ts',
    senal: 'PANEL_DESCARTAR_BORRADOR',
  },
}
