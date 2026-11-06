// Los `<Drawer>` del área de la fórmula, del carril B (4.20-3b). Es un pedazo de `DRAWERS` (`drawers-con-salida.ts`, del A) en su propio
// archivo para que el B registre su panel sin tocar un archivo del A. Hoy, ninguno.
import type { RegistroDeDrawer } from './drawers-con-salida'

export const DRAWERS_DE_LA_FORMULA: Record<string, RegistroDeDrawer> = {}
