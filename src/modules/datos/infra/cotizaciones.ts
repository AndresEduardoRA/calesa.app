import 'server-only'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import {
  FILAS_POR_PEDIDO,
  IDS_POR_CONSULTA_DE_NOMBRES,
  type FilaDeCotizacionAExportar,
  type LectorDeExportacion,
} from '../entities/exportacion'
import type { ClienteDelFlujo } from './cliente-del-flujo'
import { contarHasta, enElRango, siguienteDe } from './paginas'

// Las cotizaciones para «exportar todo» (9.05-2c), de la tabla `cotizaciones` con el cliente del flujo (la sesión de quien exporta, token fijo).
// Sin origen, por `cotizaciones_listado_idx` (`creado_en desc, id desc`, parcial sin papelera); con origen, por `cotizaciones_origen_creado_idx`
// (`origen_id, creado_en desc, id desc`). La papelera la cortan las policies («fuera de la papelera» y «leer»); el `eliminado_en is null` explícito
// ata el índice parcial sin depender de que el planificador lo deduzca de la policy. La RLS de quien exporta decide las filas; con «propios», una
// pasada. No es `cotizaciones_listado()`: es plpgsql (PostgREST no le empuja el rango ni el límite) y corta en 100. Medido en
// `supabase/tests/medir-datos-exportar-cotizaciones.sql`. Las columnas van escritas (nunca `*`): sólo las que tienen `grant select`.

const COLUMNAS =
  'id, numero, origen_id, lead_id, vehiculo_id, clase, estado, titulo, total_base, creado_en, actualizado_en'

type FilaCruda = {
  id: string
  numero: number
  origen_id: string
  lead_id: string | null
  vehiculo_id: string | null
  clase: FilaDeCotizacionAExportar['clase']
  estado: FilaDeCotizacionAExportar['estado']
  titulo: string | null
  total_base: number
  creado_en: string
  actualizado_en: string
}

function filaDeCotizacionAExportar(fila: FilaCruda): FilaDeCotizacionAExportar {
  return {
    id: fila.id,
    numero: fila.numero,
    origenId: fila.origen_id,
    leadId: fila.lead_id,
    vehiculoId: fila.vehiculo_id,
    clase: fila.clase,
    estado: fila.estado,
    titulo: fila.titulo,
    // Tal como lo entrega la base (`numeric(18,2)`): sin redondear ni convertir.
    totalBase: fila.total_base,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  }
}

export function lectorDeCotizaciones(
  cliente: ClienteDelFlujo,
  origenId: string | null,
): LectorDeExportacion<FilaDeCotizacionAExportar> {
  // Con origen, sólo los suyos (por `cotizaciones_origen_creado_idx`); sin él, todas las que se ven.
  const delOrigen = <Consulta extends { eq: (columna: 'origen_id', valor: string) => Consulta }>(
    consulta: Consulta,
  ): Consulta => (origenId === null ? consulta : consulta.eq('origen_id', origenId))
  return {
    contar: (rango, tope) =>
      contarHasta(
        (cursor) =>
          enElRango(
            delOrigen(
              cliente.from('cotizaciones').select('id, creado_en').is('eliminado_en', null),
            ),
            rango,
            cursor,
          ).limit(FILAS_POR_PEDIDO),
        tope,
      ),
    async pagina(rango, cursor) {
      const { data, error } = await enElRango(
        delOrigen(cliente.from('cotizaciones').select(COLUMNAS).is('eliminado_en', null)),
        rango,
        cursor,
      ).limit(FILAS_POR_PEDIDO)
      if (error) {
        return { ok: false, error: errorDePostgrest(error) }
      }
      return ok({ filas: data.map(filaDeCotizacionAExportar), siguiente: siguienteDe(data) })
    },
  }
}

// El nombre de cada cliente por id, de una página (≤ `FILAS_POR_PEDIDO` ids, un pedido): `leads_vista_por_ids` es invocadora y se inlinea, así
// que la RLS de `leads` decide qué filas llegan. Sólo el nombre: ningún teléfono ni campo privado.
export async function clientesDeCotizaciones(
  cliente: ClienteDelFlujo,
  ids: readonly string[],
): Promise<Resultado<ReadonlyMap<string, string>>> {
  if (ids.length === 0) {
    return ok(new Map())
  }
  const { data, error } = await cliente
    .rpc('leads_vista_por_ids', { p_leads: [...ids] })
    .select('id, nombre')
    .limit(ids.length)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(
    new Map(data.flatMap((lead) => (lead.id === null ? [] : [[lead.id, lead.nombre ?? '']]))),
  )
}

// El título de cada vehículo por id, de a `IDS_POR_CONSULTA_DE_NOMBRES` (un GET por trozo, por `vehiculos_pkey`), sin papelera y bajo
// «vehiculos: leer». El primer error corta.
export async function titulosDeVehiculos(
  cliente: ClienteDelFlujo,
  ids: readonly string[],
): Promise<Resultado<ReadonlyMap<string, string>>> {
  const titulos = new Map<string, string>()
  for (let desde = 0; desde < ids.length; desde += IDS_POR_CONSULTA_DE_NOMBRES) {
    const trozo = ids.slice(desde, desde + IDS_POR_CONSULTA_DE_NOMBRES)
    const { data, error } = await cliente
      .from('vehiculos')
      .select('id, titulo')
      .in('id', trozo)
      .is('eliminado_en', null)
      .limit(trozo.length)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    for (const vehiculo of data) {
      titulos.set(vehiculo.id, vehiculo.titulo)
    }
  }
  return ok(titulos)
}
