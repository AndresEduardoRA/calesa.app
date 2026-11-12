// Composición de el área `stock` de `repuestos` en el servidor (8.10-2): une mover el stock, reasignarlo (8.10-3) y leer sus movimientos con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeStock } from '../../entities/stock/repositorio'
import { leerMovimientos } from '../../infra/stock/movimientos'
import { moverStock } from '../../infra/stock/mover'
import { reasignarStock } from '../../infra/stock/reasignar'

// Mover el stock de un ítem, reasignarlo y leer su historial. Las actions de `features/stock/` lo usan.
export const repositorioDeStock: RepositorioDeStock = {
  mover: moverStock,
  reasignar: reasignarStock,
  movimientos: leerMovimientos,
}
