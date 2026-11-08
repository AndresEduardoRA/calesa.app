// Publicar una tabla de referencia (4.23-2) con el cliente de la sesión de quien publica: `tabla_referencia_publicar()` vuelve a pedir el permiso de la tabla y el de cada
// origen que la usa, compara la versión y valida las filas.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/shared/types/database.types'
import { resultadoDePublicar } from '../../entities/tablas/publicacion'
import type { RepositorioDeTablas } from '../../entities/tablas/repositorio'

export function publicacionDeTablasSobre(cliente: SupabaseClient<Database>): RepositorioDeTablas {
  return {
    publicar: async ({ tablaId, filas, nota, versionEsperada }) =>
      resultadoDePublicar(
        await cliente.rpc('tabla_referencia_publicar', {
          p_tabla: tablaId,
          p_filas: filas as Json,
          p_nota: nota,
          p_version_esperada: versionEsperada,
        }),
      ),
  }
}
