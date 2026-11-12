// Composición de el área `aduana` de `logistica` en el servidor (6.01, llenada en 6.09): une la interfaz del repositorio con Supabase. 6.09-2 le suma las escrituras. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeAduana } from '../../entities/aduana/repositorio'
import { aduanaSupabase } from '../../infra/aduana/listas'

// Leer las declaraciones y su detalle (6.09-1).
export const repositorioDeAduana: RepositorioDeAduana = aduanaSupabase
