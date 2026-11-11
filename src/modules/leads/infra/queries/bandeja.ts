import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { cortarAlTope } from '@/shared/lib/conteo'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  LectorDeLeadsSinSeguimiento,
  LectorDeRecordatoriosDeHoy,
} from '../../entities/bandeja'

// Mis recordatorios pendientes con hora antes de `hasta`, los más viejos primero (un vencido sin completar no desaparece a medianoche).
// `recordatorios_vista` es de invocador: la policy deja sólo los míos y no eliminados, y `recordatorios_usuario_idx`
// (usuario, hora) donde falta completar da el orden sin recorrer nada de más. Pide `tope + 1` para saber si hay más.
export const getRecordatoriosDeHoy: LectorDeRecordatoriosDeHoy = async ({ hasta, tope }) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recordatorios_vista')
    .select('id, titulo, recordar_en, lead_id, lead_nombre')
    .is('completado_en', null)
    .lt('recordar_en', hasta)
    .order('recordar_en')
    .order('id')
    .limit(tope + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = data.flatMap((fila) =>
    fila.id && fila.titulo && fila.recordar_en
      ? [
          {
            id: fila.id,
            titulo: fila.titulo,
            recordarEn: fila.recordar_en,
            leadId: fila.lead_id,
            leadNombre: fila.lead_nombre,
          },
        ]
      : [],
  )
  return ok(cortarAlTope(filas, tope))
}

// Mis leads (los de mi cartera) sin ningún seguimiento y creados antes de `creadosAntesDe`, los más nuevos primero.
// Se lee de `leads_cartera_vista`: las mismas columnas y la misma RLS que `leads_vista`, pero la base camina la cartera de quien
// mira por `leads_asesores_listado_idx` (cuesta lo que pesa esa cartera, no cuántos leads hay en la tabla; 5a-fix-1a).
// `ultimo_seguimiento_en` queda en nulo mientras ningún seguimiento vivo lo fije (trigger de la base).
export const getLeadsSinSeguimiento: LectorDeLeadsSinSeguimiento = async ({
  creadosAntesDe,
  tope,
}) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads_cartera_vista')
    .select('id, nombre, creado_en')
    .is('ultimo_seguimiento_en', null)
    .lt('creado_en', creadosAntesDe)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(tope + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = data.flatMap((fila) =>
    fila.id && fila.nombre && fila.creado_en
      ? [{ id: fila.id, nombre: fila.nombre, creadoEn: fila.creado_en }]
      : [],
  )
  return ok(cortarAlTope(filas, tope))
}
