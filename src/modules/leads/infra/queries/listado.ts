import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { conteoAcotado } from '@/shared/lib/conteo'
import { armarPagina, type Cursor } from '@/shared/lib/paginacion'
import { aplicarCursor } from '@/shared/lib/supabase/consultas'
import { createClient } from '@/shared/lib/supabase/server'
import { columnasDeLaConsulta, filasDeLeadDesde } from '../../entities/listado'
import type { BuscadorDeLeads, ContadorDeLeads } from '../../entities/repositorios'
import { aplicarCondicionesDeLeads } from './condiciones'

// Una página de leads, de lo más nuevo a lo más viejo, con una fila de más para saber si hay otra.
// Se lee de `leads_vista` (teléfono enmascarado y atributos recortados según la cartera) y lo que
// hay lo decide la RLS de `leads`. Bajo RLS un filtro sobre `atributos` o `nombre` no usa un índice
// propio: la base camina `leads_listado_idx` en orden, filtra y corta en `tamano + 1`.
export const buscarLeads: BuscadorDeLeads = async (pedido) => {
  const { condiciones, cursor, tamano, clavesDeTabla } = pedido
  const supabase = await createClient()
  const base = supabase.from('leads_vista').select(columnasDeLaConsulta(clavesDeTabla))
  // Hacia atrás se camina al revés (lo más viejo primero) y `armarPagina` lo da vuelta.
  const haciaAtras = cursor?.sentido === 'anterior'
  const { data, error } = await aplicarCursor(aplicarCondicionesDeLeads(base, condiciones), cursor)
    .order('creado_en', { ascending: haciaAtras })
    .order('id', { ascending: haciaAtras })
    .limit(tamano + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(armarPagina(filasDeLeadDesde(data, clavesDeTabla), tamano, cursor))
}

// PostgREST corta un pedido en 1.000 filas (`max_rows` de `supabase/config.toml`).
const FILAS_POR_PEDIDO = 1000

// Cuántos leads cumplen las condiciones, **hasta `tope`**: lee ids por el índice del listado, de a 1.000 por
// cursor, hasta juntar `tope + 1`, y dice si había más (`.claude/rules/escala.md`: un número que se muestra no es
// un total). Lo decide la misma RLS que la página: cuenta sólo lo que quien mira ve. Con 50 es un solo pedido.
export const contarLeadsHasta: ContadorDeLeads = async (condiciones, tope) => {
  const supabase = await createClient()
  let cursor: Cursor | null = null
  let leidos = 0
  while (leidos <= tope) {
    const pedir = Math.min(FILAS_POR_PEDIDO, tope + 1 - leidos)
    const { data, error } = await aplicarCursor(
      aplicarCondicionesDeLeads(supabase.from('leads_vista').select('id, creado_en'), condiciones),
      cursor,
    )
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .limit(pedir)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    leidos += data.length
    const ultimo = data.at(-1)
    if (data.length < pedir || !ultimo?.creado_en || !ultimo.id) {
      break
    }
    cursor = { creadoEn: ultimo.creado_en, id: ultimo.id, sentido: 'siguiente' }
  }
  return ok(conteoAcotado(leidos, tope))
}
