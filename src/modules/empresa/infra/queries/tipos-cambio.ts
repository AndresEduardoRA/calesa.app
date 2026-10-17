import 'server-only'
import { connection } from 'next/server'
import { cache } from 'react'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeHistorial, LectorDeMonedasYTiposCambio } from '../../entities/repositorios'
import {
  historialDesde,
  monedasDesde,
  tiposCambioDesde,
  vigentes,
  type TipoCambio,
  CAMBIOS_A_LA_VISTA,
} from '../../entities/tipos-cambio'

// Todos los tipos de cambio, una vez por request: los pide la barra superior en toda pantalla y,
// en Configuración › Empresa, además la lista. Los lee cualquier cuenta con sesión.
const getTodos = cache(async (): Promise<Resultado<TipoCambio[]>> => {
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tipos_cambio')
    .select('*')
    .order('orden')
    .order('nombre')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(tiposCambioDesde(data))
})

// Los vigentes, con el por defecto adelante. Nunca tumba una pantalla: si la base no responde
// devuelve una lista vacía y deja el error en el log.
export async function getTiposCambio(): Promise<TipoCambio[]> {
  const todos = await getTodos()
  if (!todos.ok) {
    console.error('No se pudieron leer los tipos de cambio', todos.error)
    return []
  }
  return vigentes(todos.data)
}

export const getMonedasYTiposCambio: LectorDeMonedasYTiposCambio = cache(async () => {
  const supabase = await createClient()
  const [monedas, tipos] = await Promise.all([
    supabase.from('monedas').select('*').order('orden').order('codigo'),
    getTodos(),
  ])
  if (monedas.error) {
    return { ok: false, error: errorDePostgrest(monedas.error) }
  }
  if (!tipos.ok) {
    return tipos
  }
  return ok({ monedas: monedasDesde(monedas.data), tipos: tipos.data })
})

// Los últimos cambios de valor de un tipo de cambio. Sin `empresa.tipos_cambio.gestionar` la RLS
// no devuelve filas: la pantalla dice por qué en vez de mostrar una lista vacía.
export const getHistorial: LectorDeHistorial = async (tipoCambioId) => {
  const supabase = await createClient()
  const { data: filas, error } = await supabase
    .from('tipos_cambio_historial')
    .select('id, valor_anterior, valor_nuevo, cambiado_por, cambiado_en')
    .eq('tipo_cambio_id', tipoCambioId)
    .order('id', { ascending: false })
    // Uno de más: la pantalla dice «Mostrando los 30 cambios más recientes» si los hay.
    .limit(CAMBIOS_A_LA_VISTA + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  // Quién hizo cada cambio: sólo las personas de esta página.
  const ids = [...new Set(filas.flatMap((fila) => (fila.cambiado_por ? [fila.cambiado_por] : [])))]
  const nombres = new Map<string, string>()
  if (ids.length > 0) {
    const personas = await supabase.from('perfiles').select('id, nombre, email').in('id', ids)
    if (personas.error) {
      return { ok: false, error: errorDePostgrest(personas.error) }
    }
    for (const persona of personas.data) {
      const visible = persona.nombre.trim() || persona.email
      if (visible) {
        nombres.set(persona.id, visible)
      }
    }
  }
  return ok(historialDesde(filas, nombres))
}
