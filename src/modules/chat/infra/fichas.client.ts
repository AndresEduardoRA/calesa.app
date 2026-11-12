// Las tareas y eventos que apuntan las fichas del hilo, leídos desde el navegador con la sesión de quien mira (7.10-3): una lectura por clase y por tanda
// de 100 ids (por clave primaria, con `limit`) y una de `perfiles` (`id, nombre`) para los responsables. Sin descripción ni vínculos.
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { COLUMNAS_DE_FICHA, resolverFichas, type PedidoDeFicha } from '../entities/fichas'
import type { LectorDeFichas } from '../entities/repositorios'

const TANDA = 100

type Cliente = ReturnType<typeof createClient>
type Tabla = 'tareas' | 'eventos' | 'perfiles'
type Leidas = Resultado<unknown[]>

async function leerPorIds(supabase: Cliente, tabla: Tabla, ids: string[]): Promise<Leidas> {
  const filas: unknown[] = []
  for (let i = 0; i < ids.length; i += TANDA) {
    const tanda = ids.slice(i, i + TANDA)
    const { data, error } = await supabase
      .from(tabla)
      .select(
        COLUMNAS_DE_FICHA[tabla === 'tareas' ? 'tarea' : tabla === 'eventos' ? 'evento' : 'perfil'],
      )
      .in('id', tanda)
      .limit(tanda.length)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    filas.push(...(Array.isArray(data) ? data : []))
  }
  return ok(filas)
}

const idsDe = (pedidas: readonly PedidoDeFicha[], clase: PedidoDeFicha['clase']) => [
  ...new Set(pedidas.filter((p) => p.clase === clase).map((p) => p.id)),
]

export const leerFichas: LectorDeFichas = async (pedidas) => {
  const supabase = createClient()
  const tareas = await leerPorIds(supabase, 'tareas', idsDe(pedidas, 'tarea'))
  if (!tareas.ok) {
    return tareas
  }
  const eventos = await leerPorIds(supabase, 'eventos', idsDe(pedidas, 'evento'))
  if (!eventos.ok) {
    return eventos
  }
  const responsables = [
    ...new Set(
      tareas.data.flatMap((f) =>
        typeof f === 'object' &&
        f !== null &&
        'responsable_id' in f &&
        typeof f.responsable_id === 'string'
          ? [f.responsable_id]
          : [],
      ),
    ),
  ]
  const perfiles = await leerPorIds(supabase, 'perfiles', responsables)
  if (!perfiles.ok) {
    return perfiles
  }
  return resolverFichas(pedidas, tareas.data, eventos.data, perfiles.data)
}
