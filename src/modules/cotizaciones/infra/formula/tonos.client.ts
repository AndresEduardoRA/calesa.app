// El catálogo de tonos para la sección «Grupos» del editor de la fórmula (4.21-3c), desde el navegador y con la sesión de quien edita: una lectura al montarse la
// sección. La policy `tonos: leer` la abre a todo `authenticated`; el catálogo no pasa de 24 (`_tonos_tope()`).
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { esquemaId } from '../../entities/nodos'
import { TOPE_DE_TONOS_DEL_EDITOR } from '../../entities/formula/grupos'

export type TonoDelCatalogo = { clave: string; nombre: string }

const esquemaDeLosTonos = z.array(z.object({ clave: esquemaId, nombre: z.string() }))

// El catálogo entero en orden de nombre: `tonos_nombre_unico (nombre)`.
export async function leerTonosDelCatalogo(): Promise<Resultado<TonoDelCatalogo[]>> {
  const { data, error } = await createClient()
    .from('tonos')
    .select('clave, nombre')
    .order('nombre')
    .limit(TOPE_DE_TONOS_DEL_EDITOR)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const tonos = esquemaDeLosTonos.safeParse(data)
  return tonos.success ? ok(tonos.data) : fallo('inesperado', 'No pudimos leer los tonos.')
}
