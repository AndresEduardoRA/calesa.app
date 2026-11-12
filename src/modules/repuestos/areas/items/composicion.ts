// Composición de el área `items` de `repuestos` en el servidor (8.09-2): une escribir ítems con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeItems } from '../../entities/items/repositorio'
import { itemsSupabase } from '../../infra/items/guardar'

// Escribir ítems. Las actions de `features/items/` lo usan.
export const repositorioDeItems: RepositorioDeItems = itemsSupabase
