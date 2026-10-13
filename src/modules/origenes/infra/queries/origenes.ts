import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  origenesConUsoDesde,
  origenesDesde,
  type OrigenConUso,
  type OrigenResumen,
} from '../../entities/origen'

// Los orígenes en el orden que eligió la empresa, para nombrarlos y elegirlos. Una lectura por
// request. Por defecto sólo los activos (lo que se ofrece en una alta); la matriz de roles pide
// también los inactivos, para no esconder lo que se le otorgó a uno desactivado.
export const getOrigenes = cache(
  async (incluirInactivos = false): Promise<Resultado<OrigenResumen[]>> => {
    const supabase = await createClient()
    const consulta = supabase.from('origenes').select('id, nombre, color, activo')
    const { data, error } = await (incluirInactivos ? consulta : consulta.eq('activo', true))
      .order('orden')
      .order('nombre')
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    return ok(origenesDesde(data))
  },
)

// Todos, activos o no, con lo que los ata. Es lo que edita la pantalla. Lo cuenta la base
// (`origenes_resumen()`): una ida para toda la lista, incluida la papelera.
export const getOrigenesConUso = cache(async (): Promise<Resultado<OrigenConUso[]>> => {
  const supabase = await createClient()
  const [filas, usos] = await Promise.all([
    supabase
      .from('origenes')
      .select(
        'id, clave, nombre, sustantivo, genero, tipo, color, activo, apibara_plataformas, actualizado_en',
      )
      .order('orden')
      .order('nombre'),
    supabase.rpc('origenes_resumen'),
  ])
  if (filas.error) {
    return { ok: false, error: errorDePostgrest(filas.error) }
  }
  if (usos.error) {
    return { ok: false, error: errorDePostgrest(usos.error) }
  }
  return ok(origenesConUsoDesde(filas.data, usos.data))
})
