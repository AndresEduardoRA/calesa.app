import { z } from 'zod'
import { conteoAcotado, type ConteoAcotado } from '@/shared/lib/conteo'
import { TOPE_DE_ITEMS_DE_LA_HOJA } from '../nucleo/item'
import { estadoDelProyecto, type EstadoDelProyecto } from './estado'

// El resumen de repuestos de un vehículo (8.09-4, C2 y C3): el proyecto vivo del vehículo y cuántos ítems lleva por fase. Puro: `infra/proyectos/resumen.ts` lo lee y
// `<ResumenRepuestos>` lo dibuja. Lee como mucho `TOPE_DE_ITEMS_DE_LA_HOJA + 1` ítems: el conteo nunca es un total exacto.

export type ProyectoDeVehiculo = {
  id: string
  numero: number
  // ISO; nulo = abierto.
  cerradoEn: string | null
  actualizadoEn: string
}

export const COLUMNAS_DE_PROYECTO_DE_VEHICULO = 'id, numero, cerrado_en, actualizado_en'
export const COLUMNAS_DE_ITEM_DEL_RESUMEN =
  'id, en_stock_desde, fase:fases(id, nombre, color, es_final, orden)'

const esquemaDeProyecto = z.object({
  id: z.guid(),
  numero: z.number().int().positive(),
  cerrado_en: z.string().nullable(),
  actualizado_en: z.string(),
})

/** La fila de `repuestos_proyectos`; nulo si no tiene la forma esperada. */
export function proyectoDeVehiculoDesde(dato: unknown): ProyectoDeVehiculo | null {
  const leido = esquemaDeProyecto.safeParse(dato)
  return leido.success
    ? {
        id: leido.data.id,
        numero: leido.data.numero,
        cerradoEn: leido.data.cerrado_en,
        actualizadoEn: leido.data.actualizado_en,
      }
    : null
}

export type ItemDelResumen = {
  enStock: boolean
  fase: { id: string; nombre: string; color: string; esFinal: boolean; orden: number } | null
}

const esquemaDeItem = z.object({
  id: z.guid(),
  en_stock_desde: z.string().nullable(),
  fase: z
    .object({
      id: z.guid(),
      nombre: z.string(),
      color: z.string(),
      es_final: z.boolean(),
      orden: z.number(),
    })
    .nullable(),
})

/** Los ítems que leyó el resumen; nulo si alguno no tiene la forma esperada. */
export function itemsDelResumenDesde(dato: unknown): ItemDelResumen[] | null {
  const leido = z.array(esquemaDeItem).safeParse(dato)
  if (!leido.success) {
    return null
  }
  return leido.data.map((f) => ({
    enStock: f.en_stock_desde !== null,
    fase:
      f.fase === null
        ? null
        : {
            id: f.fase.id,
            nombre: f.fase.nombre,
            color: f.fase.color,
            esFinal: f.fase.es_final,
            orden: f.fase.orden,
          },
  }))
}

export type GrupoDelResumen = {
  // Nulo: los ítems sin fase.
  faseId: string | null
  nombre: string
  color: string | null
  n: number
}

export const NOMBRE_SIN_FASE = 'Sin fase'

export type ResumenDeItems = {
  grupos: GrupoDelResumen[]
  total: ConteoAcotado
  estado: EstadoDelProyecto
}

/**
 * Agrupa por fase (en el orden de la fase, «Sin fase» al final) lo leído con `tope + 1` filas. El 201 sólo dice «hay más»: no se cuenta en ningún grupo.
 * El estado sale de `estadoDelProyecto` (pendiente: sin stock y sin fase final).
 */
export function resumirItems(
  leidos: readonly ItemDelResumen[],
  cerradoEn: string | null,
  tope: number = TOPE_DE_ITEMS_DE_LA_HOJA,
): ResumenDeItems {
  const total = conteoAcotado(leidos.length, tope)
  const contados = leidos.slice(0, tope)
  const porFase = new Map<string | null, GrupoDelResumen & { orden: number }>()
  for (const item of contados) {
    const clave = item.fase?.id ?? null
    const grupo = porFase.get(clave)
    if (grupo) {
      grupo.n += 1
    } else {
      porFase.set(clave, {
        faseId: clave,
        nombre: item.fase?.nombre ?? NOMBRE_SIN_FASE,
        color: item.fase?.color ?? null,
        n: 1,
        orden: item.fase?.orden ?? Number.POSITIVE_INFINITY,
      })
    }
  }
  const grupos = [...porFase.values()]
    .sort((a, b) =>
      a.orden === b.orden ? a.nombre.localeCompare(b.nombre, 'es') : a.orden - b.orden,
    )
    .map(({ faseId, nombre, color, n }) => ({ faseId, nombre, color, n }))
  const pendientes = contados.filter((i) => !i.enStock && !(i.fase?.esFinal ?? false)).length
  return {
    grupos,
    total,
    estado: estadoDelProyecto({ cerradoEn, items: contados.length, pendientes }),
  }
}

export type OfertaDelResumen = 'abrir' | 'crear' | 'ninguna'

/** Con proyecto, abrirlo; sin él, crearlo sólo con `repuestos.editar` (si no, nada que ofrecer). */
export function ofertaDelResumen({
  proyecto,
  puedeCrear,
}: {
  proyecto: ProyectoDeVehiculo | null
  puedeCrear: boolean
}): OfertaDelResumen {
  if (proyecto !== null) {
    return 'abrir'
  }
  return puedeCrear ? 'crear' : 'ninguna'
}
