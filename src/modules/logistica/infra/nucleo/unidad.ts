import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { COLUMNAS_DE_UNIDAD, unidadDeVehiculo } from '../../entities/nucleo/leer-unidad'
import type { LectorDeUnidad } from '../../entities/nucleo/repositorios'

// La unidad se lee con la sesión de quien mira, sin RPC ni `security definer`: la RLS de `vehiculos` («vehiculos: leer», `vehiculos.ver`) decide si llega. Una fila no vista, una
// en la papelera y un id inexistente dan lo mismo (`null`), para no confirmar que existe. Por clave primaria (`vehiculos_pkey`): una fila, una lectura por request.
export const getUnidad: LectorDeUnidad = cache(async (id) => {
  if (!z.guid().safeParse(id).success) return ok(null)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehiculos')
    .select(COLUMNAS_DE_UNIDAD)
    .eq('id', id)
    .is('eliminado_en', null)
    .limit(1)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return unidadDeVehiculo(data)
})
