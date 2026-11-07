// Los `<Confirmar>` del área de la papelera de cotizaciones, del carril C (4.24-2b). Es un pedazo de `CONFIRMAR_CON_URL`
// (`confirmar-con-url.ts`, del A) en su propio archivo para que el C registre su diálogo sin tocar un archivo del A.
import type { ConfirmarConUrl } from './confirmar-con-url'

export const CONFIRMAR_CON_URL_DE_LA_PAPELERA: Record<string, ConfirmarConUrl> = {
  // Purgar un lote o una de sus cotizaciones (4.24-2b): `?panel=purgar&lote=<id>[&cotizacion=<id>]`.
  'src/modules/cotizaciones/features/papelera/components/confirmar-purga.tsx': {
    abre: 'src/modules/cotizaciones/features/papelera/hooks/use-purga-por-url.ts',
    senal: 'PANEL_PURGAR',
  },
}
