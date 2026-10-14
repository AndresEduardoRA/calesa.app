// La subasta de un vehículo tal como la guarda la base: la fecha y el estado (columnas), cuándo se
// consultó por última vez y, del bruto, sólo lo que la ficha muestra. El bruto entero lo lee el
// servidor (el refresco lo compara con lo nuevo) y nunca llega a un Client Component.
import { z } from 'zod'
import { esEstadoDeSubasta, numeroEnRuta, type EstadoDeSubasta } from './subasta'
import { fotosQueFaltan, type FotoDeSubasta } from './subasta-fotos'

export type SubastaDeVehiculo = {
  subastaEn: string | null
  subastaFinEn: string | null
  estado: EstadoDeSubasta | null
  // ISO. La última vez que se consultó a apibara; null = el vehículo no vino de ahí.
  sincronizadoEn: string | null
  pujaActual: number | null
  compraInmediata: number | null
  precioDeVenta: number | null
  // De dónde se bajó cada foto que el vehículo ya tiene (las que vinieron de apibara).
  fotosRegistradas: string[]
  // La respuesta guardada. Sólo para el servidor.
  raw: Record<string, unknown> | null
}

export const COLUMNAS_DE_SUBASTA =
  'subasta_en, subasta_fin_en, estado_subasta, apibara_sync_en, apibara_raw, vehiculos_imagenes(origen_url)'

const esquemaFila = z.object({
  subasta_en: z.string().nullable(),
  subasta_fin_en: z.string().nullable(),
  estado_subasta: z.string().nullable(),
  apibara_sync_en: z.string().nullable(),
  // Un bruto ilegible no tumba la ficha: se muestra sin él.
  apibara_raw: z.record(z.string(), z.unknown()).nullable().catch(null),
  vehiculos_imagenes: z.array(z.object({ origen_url: z.string().nullable() })).catch([]),
})

export function subastaDesdeFila(fila: unknown): SubastaDeVehiculo {
  const f = esquemaFila.parse(fila)
  const { apibara_raw: raw } = f
  return {
    subastaEn: f.subasta_en,
    subastaFinEn: f.subasta_fin_en,
    estado: esEstadoDeSubasta(f.estado_subasta) ? f.estado_subasta : null,
    sincronizadoEn: f.apibara_sync_en,
    pujaActual: raw ? numeroEnRuta(raw, 'pricing.current_bid_usd') : null,
    compraInmediata: raw ? numeroEnRuta(raw, 'pricing.buy_now_usd') : null,
    precioDeVenta: raw ? numeroEnRuta(raw, 'pricing.sale_price_usd') : null,
    fotosRegistradas: f.vehiculos_imagenes.flatMap((foto) =>
      foto.origen_url === null ? [] : [foto.origen_url],
    ),
    raw,
  }
}

// Las fotos de la respuesta guardada que el vehículo todavía no tiene (por su dirección de origen).
export function fotosPorTraerDe(subasta: SubastaDeVehiculo | null): FotoDeSubasta[] {
  return subasta?.raw ? fotosQueFaltan(subasta.raw, subasta.fotosRegistradas) : []
}
