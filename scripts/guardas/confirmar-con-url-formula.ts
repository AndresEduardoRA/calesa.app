// Los `<Confirmar>` del área de la fórmula (4.20-2c): parte del registro de `CONFIRMAR_CON_URL` (`confirmar-con-url.ts`), que los suma
// tras los del núcleo. Hoy, el de descartar el borrador y el de eliminar un tono (4.22-4).
import type { ConfirmarConUrl } from './confirmar-con-url'

export const CONFIRMAR_CON_URL_DE_LA_FORMULA: Record<string, ConfirmarConUrl> = {
  'src/modules/cotizaciones/features/formula/components/descartar-borrador.tsx': {
    abre: 'src/modules/cotizaciones/features/formula/hooks/use-panel-de-la-formula.ts',
    senal: 'PANEL_DESCARTAR_BORRADOR',
  },
  'src/modules/cotizaciones/features/diseno/components/eliminar-tono.tsx': {
    abre: 'src/modules/cotizaciones/features/diseno/hooks/use-eliminar-tono-por-url.ts',
    senal: 'PANEL_ELIMINAR_TONO',
  },
}
