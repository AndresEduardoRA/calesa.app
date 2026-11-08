// Los `<Confirmar>` de las áreas del carril C en `cotizaciones` (la papelera, 4.24-2b; la final, 4.25-2). Es un pedazo de `CONFIRMAR_CON_URL`
// (`confirmar-con-url.ts`, del A) en su propio archivo para que el C registre sus diálogos sin tocar un archivo del A. La final va acá y no en
// `areas-c/confirmar-con-url.ts` porque `confirmar-con-url-areas.test.ts` (del A) todavía da por vacíos los registros `areas-*` (pedido al A, 4.25-2).
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
