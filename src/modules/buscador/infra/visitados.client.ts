// «Últimos abiertos» (7.12), en el navegador y con la sesión de quien mira: las visitas propias (`visitados`, la RLS deja sólo las de
// `(select auth.uid())`) por `visitados_usuario_visto_idx (usuario_id, visto_en desc)`, y cada entidad hidratada bajo su propia RLS, sin
// `security definer`: leads por `leads_vista_por_ids` (recorta teléfono y privados), vehículos y cotizaciones por su PK con sólo columnas con grant.
// Lo que no llega (no se ve, papelera, purgado) desaparece sin marcador. Si falla una lectura, falla todo: un error es un error (D17).
import {
  errorDePostgrest,
  fallo,
  ok,
  type ErrorPostgrest,
  type Resultado,
} from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  ULTIMOS_LEIDOS,
  ultimosAbiertos,
  type Abierto,
  type LeidasPorTipo,
} from '../entities/ranking'
import {
  COLUMNAS_DE_COTIZACION,
  COLUMNAS_DE_LEAD,
  COLUMNAS_DE_VEHICULO,
  ESQUEMAS_DEL_BUSCADOR,
  filasDesde,
  TIPOS_DEL_BUSCADOR,
  type TipoDelBuscador,
} from '../entities/resultados'

const NO_SE_PUDO_LEER = 'No se pudieron leer los últimos abiertos.'

type Leida<T> = {
  data: unknown
  error: ErrorPostgrest | null
  esquema: Parameters<typeof filasDesde<T>>[0]
}

function filas<T>({ data, error, esquema }: Leida<T>): Resultado<T[]> {
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = filasDesde(esquema, data)
  return leidas === null ? fallo('inesperado', NO_SE_PUDO_LEER) : ok(leidas)
}

function idsDe(
  visitas: readonly { tipo: TipoDelBuscador; referencia_id: string }[],
  tipo: TipoDelBuscador,
): string[] {
  return visitas.filter((v) => v.tipo === tipo).map((v) => v.referencia_id)
}

type Cliente = ReturnType<typeof createClient>

// Cada entidad bajo su RLS, acotada por la cantidad de ids (≤ ULTIMOS_LEIDOS). Sin ids, no pide nada.
async function hidratarLeads(supabase: Cliente, ids: string[], signal: AbortSignal) {
  if (ids.length === 0) {
    return ok([])
  }
  const leida = await supabase
    .rpc('leads_vista_por_ids', { p_leads: ids })
    .select(COLUMNAS_DE_LEAD)
    .limit(ids.length)
    .abortSignal(signal)
  return filas({ ...leida, esquema: ESQUEMAS_DEL_BUSCADOR.lead })
}

async function hidratarVehiculos(supabase: Cliente, ids: string[], signal: AbortSignal) {
  if (ids.length === 0) {
    return ok([])
  }
  const leida = await supabase
    .from('vehiculos')
    .select(COLUMNAS_DE_VEHICULO)
    .in('id', ids)
    .is('eliminado_en', null)
    .limit(ids.length)
    .abortSignal(signal)
  return filas({ ...leida, esquema: ESQUEMAS_DEL_BUSCADOR.vehiculo })
}

async function hidratarCotizaciones(supabase: Cliente, ids: string[], signal: AbortSignal) {
  if (ids.length === 0) {
    return ok([])
  }
  const leida = await supabase
    .from('cotizaciones')
    .select(COLUMNAS_DE_COTIZACION)
    .in('id', ids)
    .is('eliminado_en', null)
    .limit(ids.length)
    .abortSignal(signal)
  return filas({ ...leida, esquema: ESQUEMAS_DEL_BUSCADOR.cotizacion })
}

export async function leerUltimosAbiertos({
  signal,
}: {
  signal: AbortSignal
}): Promise<Resultado<Abierto[]>> {
  const supabase = createClient()
  const leidas = await supabase
    .from('visitados')
    .select('tipo, referencia_id, visto_en')
    .in('tipo', [...TIPOS_DEL_BUSCADOR])
    .order('visto_en', { ascending: false })
    .limit(ULTIMOS_LEIDOS)
    .abortSignal(signal)
  const visitas = filas({ ...leidas, esquema: ESQUEMAS_DEL_BUSCADOR.visitas })
  if (!visitas.ok || visitas.data.length === 0) {
    return visitas.ok ? ok([]) : visitas
  }
  const [lead, vehiculo, cotizacion] = await Promise.all([
    hidratarLeads(supabase, idsDe(visitas.data, 'lead'), signal),
    hidratarVehiculos(supabase, idsDe(visitas.data, 'vehiculo'), signal),
    hidratarCotizaciones(supabase, idsDe(visitas.data, 'cotizacion'), signal),
  ])
  if (!lead.ok) {
    return lead
  }
  if (!vehiculo.ok) {
    return vehiculo
  }
  if (!cotizacion.ok) {
    return cotizacion
  }
  const hidratadas: LeidasPorTipo = {
    lead: lead.data,
    vehiculo: vehiculo.data,
    cotizacion: cotizacion.data,
  }
  return ok(ultimosAbiertos(visitas.data, hidratadas))
}
