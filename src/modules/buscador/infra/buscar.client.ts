// Las lecturas del buscador por sección (7.12), en el navegador y con la sesión de quien mira: una RPC `buscador_*` por sección, cada una con tope
// `POR_SECCION` (la base devuelve una de más) y cancelable con su `AbortSignal`. La paleta (7.13) y el selector `#` (7.10) las piden con el texto ya
// pasado por `interpretarBusqueda()`; la base repite el mínimo y, con menos, no devuelve nada.
//
// Cancelar: la lectura nunca lanza. Con la señal ya cancelada no pide nada y da `ok([])`; si se cancela a mitad, da lo que dé supabase (un error).
// **Quien cancela no mira la respuesta** (`if (signal.aborted) return`): una búsqueda vieja nunca pisa a la nueva (D14).
import {
  errorDePostgrest,
  fallo,
  ok,
  type ErrorPostgrest,
  type Resultado,
} from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { ordenarComoLosIds, POR_SECCION } from '../entities/ranking'
import {
  COLUMNAS_DE_LEAD,
  ESQUEMAS_DEL_BUSCADOR,
  filasDesde,
  type FilaDeCotizacion,
  type FilaDeLead,
  type FilaDeVehiculo,
  type FilaPorTipo,
  type TipoDelBuscador,
} from '../entities/resultados'

export type PedidoDeBusqueda = { texto: string; signal: AbortSignal }

const NO_SE_PUDO_BUSCAR = 'No se pudo buscar.'

// Una función y no `signal.aborted` suelto: tras un `await` la señal pudo cambiar, y el compilador no lo sabe.
function cancelada(signal: AbortSignal): boolean {
  return signal.aborted
}

function respuesta<T>(
  esquema: Parameters<typeof filasDesde<T>>[0],
  data: unknown,
  error: ErrorPostgrest | null,
): Resultado<T[]> {
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDesde(esquema, data)
  return filas === null ? fallo('inesperado', NO_SE_PUDO_BUSCAR) : ok(filas)
}

// Leads por nombre o `#n`: los ids de `buscador_leads` (nunca por teléfono ni por un campo) y después sus filas por `leads_vista_por_ids`, invocadora,
// que recorta teléfono y privados. Dos pedidos; el segundo, sólo con algún id.
export async function buscarLeads({
  texto,
  signal,
}: PedidoDeBusqueda): Promise<Resultado<FilaDeLead[]>> {
  if (cancelada(signal)) {
    return ok([])
  }
  const supabase = createClient()
  const leidos = await supabase
    .rpc('buscador_leads', { p_texto: texto, p_tamano: POR_SECCION })
    .abortSignal(signal)
  const ids = respuesta(ESQUEMAS_DEL_BUSCADOR.ids, leidos.data, leidos.error)
  if (!ids.ok || ids.data.length === 0 || cancelada(signal)) {
    return ids.ok ? ok([]) : ids
  }
  const { data, error } = await supabase
    .rpc('leads_vista_por_ids', { p_leads: ids.data })
    .select(COLUMNAS_DE_LEAD)
    .limit(POR_SECCION + 1)
    .abortSignal(signal)
  const filas = respuesta(ESQUEMAS_DEL_BUSCADOR.lead, data, error)
  return filas.ok ? ok(ordenarComoLosIds(ids.data, filas.data)) : filas
}

// Vehículos por título, VIN o lote, una ruta por origen visible (invocadora: la RLS decide).
export async function buscarVehiculos({
  texto,
  signal,
}: PedidoDeBusqueda): Promise<Resultado<FilaDeVehiculo[]>> {
  if (cancelada(signal)) {
    return ok([])
  }
  const { data, error } = await createClient()
    .rpc('buscador_vehiculos', { p_texto: texto, p_tamano: POR_SECCION })
    .abortSignal(signal)
  return respuesta(ESQUEMAS_DEL_BUSCADOR.vehiculo, data, error)
}

// Cotizaciones por número exacto o título (`security definer` que repite la policy «cotizaciones: leer»; sin montos ni papelera).
export async function buscarCotizaciones({
  texto,
  signal,
}: PedidoDeBusqueda): Promise<Resultado<FilaDeCotizacion[]>> {
  if (cancelada(signal)) {
    return ok([])
  }
  const { data, error } = await createClient()
    .rpc('buscador_cotizaciones', { p_texto: texto, p_tamano: POR_SECCION })
    .abortSignal(signal)
  return respuesta(ESQUEMAS_DEL_BUSCADOR.cotizacion, data, error)
}

// La lectura de cada sección, para pedir sólo las de `seccionesQueBuscan()`.
export const BUSCAR_POR_SECCION: {
  [T in TipoDelBuscador]: (pedido: PedidoDeBusqueda) => Promise<Resultado<FilaPorTipo[T][]>>
} = {
  lead: buscarLeads,
  vehiculo: buscarVehiculos,
  cotizacion: buscarCotizaciones,
}
