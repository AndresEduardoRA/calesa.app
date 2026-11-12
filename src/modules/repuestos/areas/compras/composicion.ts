// Composición del área `compras` de `repuestos` en el servidor (8.11-3): une guardar, eliminar y restaurar una compra con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeCompras } from '../../entities/compras/repositorio'
import { comprasSupabase } from '../../infra/compras/escribir'

// Las actions de `features/compras/` lo usan.
export const repositorioDeCompras: RepositorioDeCompras = comprasSupabase
