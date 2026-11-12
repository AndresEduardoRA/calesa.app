// Los permisos de quien mira, leídos desde el navegador (6.08-2). El hueco «Transporte» sólo recibe `{ unidad }`, así que decide si se puede editar con `puede()` sobre lo que devuelve
// `mis_permisos()`; lo que protege es la base. Se recuerda un rato: los huecos del panel no piden cada uno el suyo. Copia de `infra/dinero/permisos.client.ts` (un área no importa otra).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { memoriaDeLectura } from '@/shared/lib/memoria-de-lectura'
import { concesionesDe, type Permisos } from '@/shared/lib/permisos'
import { createClient } from '@/shared/lib/supabase/browser'

const SEGUNDOS_QUE_SE_RECUERDA = 30

async function leer(): Promise<Resultado<Permisos>> {
  const { data, error } = await createClient().rpc('mis_permisos')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  try {
    return ok(concesionesDe(data))
  } catch {
    return fallo('inesperado', 'No se pudieron leer tus permisos.')
  }
}

const memoria = memoriaDeLectura(leer, SEGUNDOS_QUE_SE_RECUERDA * 1000)

export const leerMisPermisos = memoria.leer
