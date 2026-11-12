// Lo que el hueco «Transporte» de la unidad lee desde el navegador, con la sesión de quien mira (6.08-2): su fila de `transportes` (la RLS de lectura sigue), el flujo activo de su origen,
// la oferta de ese flujo (`flujo_oferta`, `security invoker`) y los catálogos de puertos y navieras para nombrar lo ofrecido y lo ya guardado. Cinco pedidos, en paralelo salvo la oferta
// (que necesita el flujo), sin nada por fila. Índices: `transportes_vehiculo_id_key` (una fila por vehículo), `flujos` por origen y ámbito; `puertos_pkey` y `navieras_pkey` son tablas de
// decenas de filas (`.limit(201)`).
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { Unidad } from '../../entities/nucleo/unidad'
import {
  elementosDesde,
  ofertaDesde,
  type ElementoDeOferta,
  type OfertaDeTransporte,
} from '../../entities/transporte/oferta'
import { transporteDesde, type Transporte } from '../../entities/transporte/transporte'

export const NO_SE_CARGO_EL_TRANSPORTE = 'No se pudo cargar el transporte.'

const TOPE_DEL_CATALOGO = 200
const COLUMNAS_DE_TRANSPORTE =
  'id, naviera_id, puerto_origen_id, puerto_destino_id, contenedor, booking, zarpe_el, eta_el, arribo_el, notas, actualizado_en'

export type TransporteDeLaUnidad = {
  // Nulo = la unidad todavía no tiene transporte cargado.
  transporte: Transporte | null
  // Nula si el origen no tiene un flujo activo para esta unidad (no se ofrece nada: se ofrece todo lo activo).
  oferta: OfertaDeTransporte | null
  navieras: ElementoDeOferta[]
  puertos: ElementoDeOferta[]
}

type UnidadLeida = Pick<Unidad, 'tipo' | 'id' | 'origenId'>

async function leerLoDeLaUnidad(unidad: UnidadLeida) {
  const supabase = createClient()
  return Promise.all([
    supabase
      .from('transportes')
      .select(COLUMNAS_DE_TRANSPORTE)
      .eq('vehiculo_id', unidad.id)
      .limit(1),
    supabase
      .from('flujos')
      .select('id')
      .eq('origen_id', unidad.origenId)
      .eq('ambito', unidad.tipo === 'vehiculo' ? 'vehiculos' : 'repuestos')
      .eq('activo', true)
      .limit(1),
    supabase
      .from('puertos')
      .select('id, nombre, activo')
      .order('nombre')
      .limit(TOPE_DEL_CATALOGO + 1),
    supabase
      .from('navieras')
      .select('id, nombre, activo')
      .order('nombre')
      .limit(TOPE_DEL_CATALOGO + 1),
  ])
}

// Sin flujo activo no hay oferta (se ofrece todo lo activo); con él, `flujo_oferta` (`security invoker`: la lee cualquier cuenta con sesión).
async function leerLaOferta(
  flujoId: string | undefined,
): Promise<Resultado<OfertaDeTransporte | null>> {
  if (!flujoId) {
    return ok(null)
  }
  const leida = await createClient().rpc('flujo_oferta', { p_flujo: flujoId })
  if (leida.error) {
    return { ok: false, error: errorDePostgrest(leida.error) }
  }
  const oferta = ofertaDesde(leida.data)
  return oferta ? ok(oferta) : fallo('inesperado', NO_SE_CARGO_EL_TRANSPORTE)
}

export async function leerTransporteDeLaUnidad(
  unidad: UnidadLeida,
): Promise<Resultado<TransporteDeLaUnidad>> {
  const [fila, flujos, puertos, navieras] = await leerLoDeLaUnidad(unidad)
  const conError = [fila, flujos, puertos, navieras].find((lectura) => lectura.error)
  if (conError?.error) {
    return { ok: false, error: errorDePostgrest(conError.error) }
  }
  const fila0 = fila.data?.[0]
  const transporte = fila0 === undefined ? null : transporteDesde(fila0)
  const listaDePuertos = elementosDesde(puertos.data)
  const listaDeNavieras = elementosDesde(navieras.data)
  if ((fila0 !== undefined && transporte === null) || !listaDePuertos || !listaDeNavieras) {
    return fallo('inesperado', NO_SE_CARGO_EL_TRANSPORTE)
  }
  const oferta = await leerLaOferta(flujos.data?.[0]?.id)
  if (!oferta.ok) {
    return oferta
  }
  return ok({
    transporte,
    oferta: oferta.data,
    puertos: cortarAlTope(listaDePuertos, TOPE_DEL_CATALOGO).filas,
    navieras: cortarAlTope(listaDeNavieras, TOPE_DEL_CATALOGO).filas,
  })
}
