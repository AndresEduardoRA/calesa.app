// Composición del área `catalogos` de `repuestos` en el servidor (8.08-2): une la escritura de valores con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeValores } from '../../entities/catalogos/repositorio'
import { valoresSupabase } from '../../infra/catalogos/escribir'

// Crear, guardar y borrar un valor de catálogo. Las actions de `features/catalogos/` lo usan.
export const repositorioDeValores: RepositorioDeValores = valoresSupabase
