// Los `<Confirmar>` de la papelera (4.24-2b) y de la final (4.25-2) en `cotizaciones`: parte del registro de `CONFIRMAR_CON_URL`
// (`confirmar-con-url.ts`), que los suma tras los del núcleo y los de la fórmula.
import type { ConfirmarConUrl } from './confirmar-con-url'

export const CONFIRMAR_CON_URL_DE_LA_PAPELERA: Record<string, ConfirmarConUrl> = {
  // Purgar un lote o una de sus cotizaciones (4.24-2b): `?panel=purgar&lote=<id>[&cotizacion=<id>]`.
  'src/modules/cotizaciones/features/papelera/components/confirmar-purga.tsx': {
    abre: 'src/modules/cotizaciones/features/papelera/hooks/use-purga-por-url.ts',
    senal: 'PANEL_PURGAR',
  },
  // Marcar final la guardada (4.25-2): `?panel=marcar-final`.
  'src/modules/cotizaciones/features/final/components/confirmar-marcar-final.tsx': {
    abre: 'src/modules/cotizaciones/features/final/components/boton-marcar-final.tsx',
    senal: 'PANEL_MARCAR_FINAL',
  },
}
