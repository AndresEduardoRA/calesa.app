// La papelera de cotizaciones, lo que se lee (4.24-2): lo que se envía sale del listado y se puede restaurar hasta que se purga. Un envío es un
// lote (`lotes_papelera`), de 1 a 200, y el lote es lo que se restaura o se purga. Las reglas las aplica la base (`cotizaciones_papelera_*`); acá se
// lee lo que responde `cotizaciones_papelera_listar()` y `cotizaciones_papelera_lote()` y se lo pone en palabras. Nada de React ni de Supabase.
import { z } from 'zod'
import type { ETIQUETA_DE_CLASE } from '../historial-del-vehiculo'

export type CotizacionEnPapelera = {
  id: string
  numero: number
  // El título que dio quien la hizo o, sin él, «Cotización #n» (lo arma la base).
  titulo: string
  clase: keyof typeof ETIQUETA_DE_CLASE
  // Su origen; el nombre lo pone la página con los orígenes que ya leyó. Nulo si la fila no lo trae.
  origenId: string | null
  creadoEn: string
}

export type LoteDeCotizaciones = {
  id: string
  // La versión del lote: restaurar la manda.
  actualizadoEn: string
  creadoEn: string
  // Quién lo envió; null si esa persona ya no tiene nombre que mostrar.
  creadoPorNombre: string | null
  esMio: boolean
  // Cuándo lo purga el job si nadie lo restaura: `creado_en + papelera_dias`.
  purgaEl: string
  // Cuántas se enviaron y cuántas siguen en la papelera (exacto: un lote tiene a lo sumo 200).
  enviados: number
  enPapelera: number
  // Las que se ven: las primeras `PRIMEROS_DEL_LOTE` en la lista, o el lote entero tras «Mostrar los N».
  cotizaciones: CotizacionEnPapelera[]
}

const esquemaLotes = z.array(
  z.object({
    id: z.guid(),
    actualizado_en: z.string(),
    creado_en: z.string(),
    creado_por_nombre: z.string().nullable(),
    es_mio: z.boolean(),
    purga_el: z.string(),
    enviados: z.number().int().nonnegative(),
    en_papelera: z.number().int().nonnegative(),
    cotizaciones: z
      .array(
        z.object({
          id: z.guid(),
          numero: z.number().int(),
          titulo: z.string(),
          clase: z.enum(['preventa', 'final']),
          origen_id: z.guid().nullable(),
          creado_en: z.string(),
        }),
      )
      .nullable(),
  }),
)

type LoteCrudo = z.infer<typeof esquemaLotes>[number]

// La respuesta de `cotizaciones_papelera_listar()`: los lotes que todavía tienen algo adentro, del más nuevo al más viejo. Una forma rota es
// null (no una papelera vacía).
export function lotesDesde(crudo: unknown): LoteDeCotizaciones[] | null {
  const leidos = esquemaLotes.safeParse(crudo)
  return leidos.success ? leidos.data.map(deLoteCrudo) : null
}

// La de `cotizaciones_papelera_lote()`: el lote entero, o null si ya no está (se purgó o se restauró) o la forma vino rota.
export function loteDesde(crudo: unknown): LoteDeCotizaciones | null {
  if (crudo === null) {
    return null
  }
  const leido = esquemaLotes.safeParse([crudo])
  return leido.success && leido.data[0] ? deLoteCrudo(leido.data[0]) : null
}

// Cuántas del lote todavía no se ven (las que trae «Mostrar los N»).
export function faltanPorMostrar(
  lote: Pick<LoteDeCotizaciones, 'enPapelera' | 'cotizaciones'>,
): number {
  return Math.max(0, lote.enPapelera - lote.cotizaciones.length)
}

function deLoteCrudo(lote: LoteCrudo): LoteDeCotizaciones {
  return {
    id: lote.id,
    actualizadoEn: lote.actualizado_en,
    creadoEn: lote.creado_en,
    creadoPorNombre: lote.creado_por_nombre,
    esMio: lote.es_mio,
    purgaEl: lote.purga_el,
    enviados: lote.enviados,
    enPapelera: lote.en_papelera,
    cotizaciones: (lote.cotizaciones ?? []).map((c) => ({
      id: c.id,
      numero: c.numero,
      titulo: c.titulo,
      clase: c.clase,
      origenId: c.origen_id,
      creadoEn: c.creado_en,
    })),
  }
}
