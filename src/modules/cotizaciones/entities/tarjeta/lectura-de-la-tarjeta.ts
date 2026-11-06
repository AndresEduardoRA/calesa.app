import { z } from 'zod'
import { esHex } from '@/shared/lib/color'

// Lo que devuelve `cotizacion_tarjeta(p_formula)` (4.18-1) leído con Zod, en la forma que usa la pantalla. Todo lo que se busca por el id de un nodo, un bucket o un modo es un
// `Map`: un id como «constructor» es legal y un objeto lo encontraría en su prototipo. `sin_plantilla`: el origen no tiene una plantilla publicada o no le sirve a esa versión;
// la base no dice nada más. La lectura sólo trae lo del nivel «todos»: lo que un nivel restringido ve no está aquí (K4 de `supabase/tests/cotizacion-tarjeta.sql`).

const esquemaDeUnaFila = z.object({
  nodo: z.string().min(1),
  etiqueta: z.string().min(1),
  leyenda: z.string().nullable().optional(),
})

const esquemaDeUnGrupo = z.object({
  id: z.string().min(1),
  etiqueta: z.string().min(1),
  plazo: z.string().nullable().optional(),
  tono: z.string().nullable().optional(),
  bucket: z.string().nullable().optional(),
  filas: z.array(esquemaDeUnaFila),
})

const color = z.string().refine(esHex)
const colores = z.object({ fondo: color, borde: color, tinta: color })
const esquemaDeUnTono = z.object({ clave: z.string().min(1), claro: colores, oscuro: colores })

const esquemaDeLasOpciones = z.object({
  clave: z.string().min(1),
  titulo: z.string(),
})

const nombresPorBucket = z.record(z.string(), z.string().nullable())

const esquemaListo = z.object({
  estado: z.literal('lista'),
  logo: z.boolean().nullable().optional(),
  nota: z.string().nullable().optional(),
  columnas: z.object({
    leyenda: z.boolean().optional(),
    tipo_cambio: z.boolean().optional(),
    plazo: z.boolean().optional(),
  }),
  total: z.object({
    nodo: z.string().nullable(),
    etiqueta: z.string().min(1),
    leyenda: z.string().nullable().optional(),
  }),
  secundarios: z.array(z.object({ nodo: z.string().min(1), etiqueta: z.string().min(1) })),
  grupos: z.array(esquemaDeUnGrupo),
  tipos_de_cambio: z.object({
    buckets: nombresPorBucket,
    modos: z.record(z.string(), nombresPorBucket),
  }),
  variante: z
    .object({ nodo: z.string().min(1), opciones: z.array(esquemaDeLasOpciones) })
    .nullable()
    .optional(),
  tonos: z.array(esquemaDeUnTono),
})

const esquemaDeLaLectura = z.discriminatedUnion('estado', [
  esquemaListo,
  z.object({ estado: z.literal('sin_plantilla') }),
])

export type FilaLeida = { nodo: string; etiqueta: string; leyenda: string | null }

export type GrupoLeido = {
  id: string
  etiqueta: string
  plazo: string | null
  tono: string | null
  bucket: string | null
  filas: readonly FilaLeida[]
}

export type TarjetaLista = {
  estado: 'lista'
  logo: boolean
  nota: string | null
  columnas: { leyenda: boolean; tipoDeCambio: boolean; plazo: boolean }
  total: { nodo: string | null; etiqueta: string; leyenda: string | null }
  secundarios: readonly { nodo: string; etiqueta: string }[]
  grupos: readonly GrupoLeido[]
  tiposDeCambio: {
    buckets: ReadonlyMap<string, string | null>
    modos: ReadonlyMap<string, ReadonlyMap<string, string | null>>
  }
  variante: { nodo: string; opciones: readonly { clave: string; titulo: string }[] } | null
  // Los tonos que usan los grupos, ya validados (`#rrggbb`): `<EstiloDeTonos>` los escribe.
  tonos: readonly z.infer<typeof esquemaDeUnTono>[]
}

export type LecturaDeLaTarjeta = TarjetaLista | { estado: 'sin_plantilla' }

const aMapa = (registro: Record<string, string | null>) => new Map(Object.entries(registro))

// La respuesta de la base ya en la forma que usa la pantalla, o nulo si no es lo que la base promete.
export function tarjetaDesde(crudo: unknown): LecturaDeLaTarjeta | null {
  const leida = esquemaDeLaLectura.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const t = leida.data
  if (t.estado === 'sin_plantilla') {
    return { estado: 'sin_plantilla' }
  }
  return {
    estado: 'lista',
    logo: t.logo === true,
    nota: t.nota ?? null,
    columnas: {
      leyenda: t.columnas.leyenda === true,
      tipoDeCambio: t.columnas.tipo_cambio === true,
      plazo: t.columnas.plazo === true,
    },
    total: { nodo: t.total.nodo, etiqueta: t.total.etiqueta, leyenda: t.total.leyenda ?? null },
    secundarios: t.secundarios,
    grupos: t.grupos.map((g) => ({
      id: g.id,
      etiqueta: g.etiqueta,
      plazo: g.plazo ?? null,
      tono: g.tono ?? null,
      bucket: g.bucket ?? null,
      filas: g.filas.map((f) => ({
        nodo: f.nodo,
        etiqueta: f.etiqueta,
        leyenda: f.leyenda ?? null,
      })),
    })),
    tiposDeCambio: {
      buckets: aMapa(t.tipos_de_cambio.buckets),
      modos: new Map(Object.entries(t.tipos_de_cambio.modos).map(([k, v]) => [k, aMapa(v)])),
    },
    variante: t.variante ?? null,
    tonos: t.tonos,
  }
}
