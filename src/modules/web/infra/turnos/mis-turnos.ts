import 'server-only'
import { cache } from 'react'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { ordenarTurnos, type LectorDeMisTurnos, type Turno } from '../../entities/turnos/turnos'

const COLUMNAS = 'id, codigo, fuente, vehiculo_id, vence_en, estado'

// Mis turnos de la web sin confirmar (8.05-1): las `asignada` (vigentes) y las `vencida`, sólo de quien lee. La RLS de `solicitudes_contacto_web` deja ver todas las
// filas a quien tiene `web.cola.gestionar`: por eso cada lectura filtra `usuario_id` a mano, con el id verificado de `getClaims()`. Dos lecturas `limit 6` por
// `solicitudes_contacto_web_usuario_id_idx` (las vigentes por `vence_en`, las vencidas de la más reciente) y, si hay vehículos, una de `web.vehiculos` por ids
// (`limit 12`) para el título: la vista sólo trae los visibles y un turno de un vehículo que dejó de serlo se dibuja sin título. Sin `count` ni `offset`.
export const getMisTurnos: LectorDeMisTurnos = cache(async ({ tope }) => {
  const supabase = await createClient()
  const { data: sesion } = await supabase.auth.getClaims()
  const yo = sesion?.claims.sub
  if (!yo) {
    return ok({ filas: [], hayMas: false })
  }
  const [vigentes, vencidas] = await Promise.all([
    supabase
      .from('solicitudes_contacto_web')
      .select(COLUMNAS)
      .eq('usuario_id', yo)
      .eq('estado', 'asignada')
      .order('vence_en', { ascending: true, nullsFirst: false })
      .order('id')
      .limit(tope + 1),
    supabase
      .from('solicitudes_contacto_web')
      .select(COLUMNAS)
      .eq('usuario_id', yo)
      .eq('estado', 'vencida')
      .order('vence_en', { ascending: false })
      .order('id')
      .limit(tope + 1),
  ])
  if (vigentes.error) {
    return { ok: false, error: errorDePostgrest(vigentes.error) }
  }
  if (vencidas.error) {
    return { ok: false, error: errorDePostgrest(vencidas.error) }
  }
  const filas = [...vigentes.data, ...vencidas.data]
  const ids = [...new Set(filas.flatMap((fila) => (fila.vehiculo_id ? [fila.vehiculo_id] : [])))]
  const titulos = new Map<string, string>()
  if (ids.length > 0) {
    const { data, error } = await supabase
      .schema('web')
      .from('vehiculos')
      .select('id, titulo')
      .in('id', ids)
      .limit(ids.length)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    for (const vehiculo of data) {
      if (vehiculo.id && vehiculo.titulo) titulos.set(vehiculo.id, vehiculo.titulo)
    }
  }
  const aTurno = (fila: (typeof filas)[number]): Turno => ({
    id: fila.id,
    codigo: fila.codigo,
    fuente: fila.fuente,
    vehiculoId: fila.vehiculo_id,
    titulo: fila.vehiculo_id ? (titulos.get(fila.vehiculo_id) ?? null) : null,
    venceEn: fila.vence_en,
    estado: fila.estado === 'vencida' ? 'vencida' : 'asignada',
  })
  return ok(cortarAlTope(ordenarTurnos(vigentes.data.map(aTurno), vencidas.data.map(aTurno)), tope))
})
