import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { autorVisible } from '../../entities/historial-del-vehiculo'

const esquemaDelAutor = z.array(
  z.object({ perfiles: z.object({ nombre: z.string(), email: z.string() }).nullable() }),
)

// A quien creó una cotización guardada, para «Asesor:» de su tarjeta (P2 a). Una lectura por clave primaria (`cotizaciones_pkey`, `limit(1)`) como quien mira (la RLS decide) con el
// autor embebido: las columnas que ya leen el historial y el listado (`perfiles!cotizaciones_creado_por_fkey`). Sin fila o sin autor, nulo.
export async function getAsesorDeLaCotizacion(id: string): Promise<Resultado<string | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('perfiles!cotizaciones_creado_por_fkey(nombre, email)')
    .eq('id', id)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDelAutor.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer a quien cotizó.')
  }
  const autor = filas.data[0]?.perfiles ?? null
  return ok(autor === null ? null : autorVisible(autor))
}
