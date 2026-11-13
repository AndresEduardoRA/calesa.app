// La actividad que devuelve la base (9.01-1): la página de `actividad_listar` (cabecera y hasta 5 campos que cambiaron, nunca un valor) y el
// diff de `actividad_diff` (sólo las claves que cambiaron y que quien mira puede ver). La base ya recorta; acá sólo se lee con Zod.
import { z } from 'zod'

export type FilaDeActividad = {
  // El id de la fila (un `bigint`): es también el cursor de la página siguiente.
  id: number
  accion: string
  tabla: string
  registroId: string | null
  actorId: string | null
  actorNombre: string | null
  creadoEn: string
  // Falso: quien mira no ve esa fila (otra cartera, otra unidad); se dice que hubo un cambio, nunca qué.
  visible: boolean
  campos: string[]
  masCampos: boolean
}

export type PaginaDeActividad = {
  filas: FilaDeActividad[]
  hayMas: boolean
}

export type CambioCrudo = { antes: unknown; despues: unknown }

export type DiffDeActividad =
  | { id: number; visible: false }
  | {
      id: number
      visible: true
      accion: string
      tabla: string
      registroId: string | null
      actorId: string | null
      actorNombre: string | null
      creadoEn: string
      cambios: Readonly<Record<string, CambioCrudo>>
      // La moneda de cada lado y el origen de un vehículo, de la foto del cambio (9.01-4); nulos si la base no los da.
      monedaAntes: string | null
      monedaDespues: string | null
      origenId: string | null
    }

export const CLAVE_DE_CAMBIO = 'cambio'

// `?cambio=` es el id de una fila (`bigint`): sólo dígitos, entero seguro y positivo; cualquier otra cosa es nulo (el drawer dice «sin acceso»).
export function idDelCambio(texto: string | null): number | null {
  if (texto === null || !/^\d+$/.test(texto)) {
    return null
  }
  const n = Number(texto)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

const esquemaDeFila = z.object({
  id: z.number(),
  accion: z.string(),
  tabla: z.string(),
  registro_id: z.string().nullable(),
  actor_id: z.guid().nullable(),
  actor_nombre: z.string().nullable(),
  creado_en: z.string().min(1),
  visible: z.boolean(),
  campos: z.array(z.string()),
  mas_campos: z.boolean(),
})

const esquemaDePagina = z.object({ hay_mas: z.boolean(), filas: z.array(esquemaDeFila) })

const esquemaDeDiff = z.union([
  z.object({
    id: z.number(),
    visible: z.literal(true),
    accion: z.string(),
    tabla: z.string(),
    registro_id: z.string().nullable(),
    actor_id: z.guid().nullable(),
    actor_nombre: z.string().nullable(),
    creado_en: z.string().min(1),
    cambios: z.record(z.string(), z.object({ antes: z.unknown(), despues: z.unknown() })),
    moneda_antes: z.string().nullish(),
    moneda_despues: z.string().nullish(),
    origen_id: z.guid().nullish(),
  }),
  z.object({ id: z.number(), visible: z.literal(false) }),
])

// La página en la forma que usa la pantalla, o nulo si no es lo que promete. Una fila sin acceso sale sin campos aunque lleguen.
export function paginaDesde(crudo: unknown): PaginaDeActividad | null {
  const leida = esquemaDePagina.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  return {
    hayMas: leida.data.hay_mas,
    filas: leida.data.filas.map((f) => ({
      id: f.id,
      accion: f.accion,
      tabla: f.tabla,
      registroId: f.registro_id,
      actorId: f.actor_id,
      actorNombre: f.actor_nombre,
      creadoEn: f.creado_en,
      visible: f.visible,
      campos: f.visible ? f.campos : [],
      masCampos: f.visible && f.mas_campos,
    })),
  }
}

export function diffDesde(crudo: unknown): DiffDeActividad | null {
  const leido = esquemaDeDiff.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const d = leido.data
  if (!d.visible) {
    return { id: d.id, visible: false }
  }
  return {
    id: d.id,
    visible: true,
    accion: d.accion,
    tabla: d.tabla,
    registroId: d.registro_id,
    actorId: d.actor_id,
    actorNombre: d.actor_nombre,
    creadoEn: d.creado_en,
    cambios: d.cambios,
    monedaAntes: d.moneda_antes ?? null,
    monedaDespues: d.moneda_despues ?? null,
    origenId: d.origen_id ?? null,
  }
}
