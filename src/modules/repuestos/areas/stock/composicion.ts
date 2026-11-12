// Composición de el área `stock` de `repuestos` en el servidor (8.10-2): une mover el stock con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeStock } from '../../entities/stock/repositorio'
import { moverStock } from '../../infra/stock/mover'

// Mover el stock de un ítem. Las actions de `features/stock/` lo usan.
export const repositorioDeStock: RepositorioDeStock = { mover: moverStock }
