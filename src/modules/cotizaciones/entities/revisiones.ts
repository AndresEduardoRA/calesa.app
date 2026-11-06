// Las revisiones de una cotización guardada (4.15-3b): lo que dejó cada guardado, de la más nueva a la más vieja, con quién lo hizo. La base (`cotizacion_revisiones`) ya
// recorta cada diff a lo que quien mira ve; acá sólo se lee con Zod. Todo lo que se busca por el id de un nodo es un `Map`: un id como «constructor» es legal.
import { z } from 'zod'
import { diaSiguiente, inicioDelDia } from '@/shared/lib/fechas'

export type EtiquetasDeRevisiones = {
  nodos: ReadonlyMap<string, string>
  grupos: ReadonlyMap<string, string>
}

export type RevisionDeLaCotizacion = {
  // El id de la revisión (un `bigint` de la base): es también el cursor de la página siguiente.
  id: number
  usuarioId: string | null
  creadoEn: string
  // El nombre del autor; nulo si no lo cargó o si no hay autor (`usuarioId` nulo).
  autor: string | null
  // El diff por columna (`{ de, a }`), ya recortado por la base: su forma la lee `cambiosDeLaRevision()`.
  diff: Readonly<Record<string, unknown>>
}

export type PaginaDeRevisiones = {
  revisiones: RevisionDeLaCotizacion[]
  // El cursor de la página siguiente (el id de la última de ésta); nulo si no hay más.
  siguiente: number | null
  etiquetas: EtiquetasDeRevisiones
}

const esquema = z.object({
  revisiones: z.array(
    z.object({
      id: z.number(),
      usuario_id: z.guid().nullable(),
      creado_en: z.string().min(1),
      autor: z.object({ id: z.guid(), nombre: z.string().nullable() }).nullable(),
      diff: z.record(z.string(), z.unknown()),
    }),
  ),
  hay_mas: z.boolean(),
  siguiente: z.number().nullable(),
  etiquetas: z.object({
    nodos: z.record(z.string(), z.string()),
    grupos: z.record(z.string(), z.string()),
  }),
})

// La respuesta de la base en la forma que usa el panel, o nulo si no es lo que promete: una fila suelta no sirve, porque el cursor no sabría por dónde seguir.
export function revisionesDesde(crudo: unknown): PaginaDeRevisiones | null {
  const leida = esquema.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const r = leida.data
  return {
    revisiones: r.revisiones.map((fila) => ({
      id: fila.id,
      usuarioId: fila.usuario_id,
      creadoEn: fila.creado_en,
      autor: fila.autor?.nombre ?? null,
      diff: fila.diff,
    })),
    siguiente: r.hay_mas ? r.siguiente : null,
    etiquetas: {
      nodos: new Map(Object.entries(r.etiquetas.nodos)),
      grupos: new Map(Object.entries(r.etiquetas.grupos)),
    },
  }
}

// Cómo se nombra a quien guardó: sin usuario (un guardado del sistema), «Sin autor»; con usuario y sin nombre cargado, «Sin nombre».
export function autorDeLaRevision(revision: RevisionDeLaCotizacion): string {
  if (revision.usuarioId === null) {
    return 'Sin autor'
  }
  return revision.autor ?? 'Sin nombre'
}

// El borde de «Ir a una fecha»: todo lo de ese día (en la zona de la empresa) y lo anterior, como el instante EXCLUSIVO `p_hasta` de `cotizacion_revisiones()` = el inicio del día
// siguiente. Nulo si `dia` no es un `YYYY-MM-DD` que exista. Las tres líneas son las de `cursorDeUnaFecha()` (leads) a propósito: subirlas a `shared/lib` sería otro paso.
export function hastaDeUnDia(dia: string, zona: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(Date.parse(`${dia}T00:00:00Z`))) {
    return null
  }
  return inicioDelDia(diaSiguiente(dia), { zona })
}
