import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest, fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { NotaGuardada, RepositorioDeNotas } from '../../entities/mover/repositorio-de-notas'

// Crear y corregir una nota de una unidad, con el cliente de quien pide y sin RPC: `notas: crear` pide ser el autor y ver la unidad; `notas: editar`, ser el autor (6.04-2). Lo que la policy
// de lectura no deja (el borrado suave) no se ofrece. Editar filtra por autor, sin cambio de fase y sin borrar, y pide la fila de vuelta para saber si tocó alguna: la fila nueva sigue viva y pasa
// `notas: leer`, a diferencia de un borrado.

function fallaConLaBase(error: {
  code?: string | null
  message: string
}): ResultadoDeAccion<never> {
  return { ok: false, error: errorDePostgrest(error) }
}

function guardada(fila: { id: string; actualizado_en: string }): ResultadoDeAccion<NotaGuardada> {
  return { ok: true, data: { id: fila.id, actualizadoEn: fila.actualizado_en } }
}

export const notasSupabase: RepositorioDeNotas = {
  async crear({ cuerpo, autorId, ...unidad }) {
    // Una de las dos columnas y nunca las dos (`num_nonnulls(vehiculo_id, repuesto_id) = 1`).
    const ref =
      'vehiculoId' in unidad
        ? { vehiculo_id: unidad.vehiculoId }
        : { repuesto_id: unidad.repuestoId }
    const { data, error } = await (
      await createClient()
    )
      .from('notas')
      .insert({ ...ref, cuerpo, autor_id: autorId })
      .select('id, actualizado_en')
      .single()
    return error ? fallaConLaBase(error) : guardada(data)
  },

  async editar({ id, cuerpo, autorId }) {
    const { data, error } = await (
      await createClient()
    )
      .from('notas')
      .update({ cuerpo })
      .eq('id', id)
      .eq('autor_id', autorId)
      .is('historial_fase_id', null)
      .is('eliminado_en', null)
      .select('id, actualizado_en')
      .limit(1)
    if (error) return fallaConLaBase(error)
    const fila = data[0]
    return fila ? guardada(fila) : fallo('no_encontrado', 'Esa nota ya no se puede editar.')
  },
}
