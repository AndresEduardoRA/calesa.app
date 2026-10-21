// El contexto de «Nuevo lead»: lo que el drawer lee de la base en un viaje (`lead_alta_contexto()`), cómo se lee (Zod) y con qué origen
// arranca. Nada de esto sabe de React ni de Supabase.
import { z } from 'zod'
import type { DatosDeLaEmpresa } from './campo'
import { CLASES_DE_TIPO, type ClaseDeTipoDeLead } from './tipo-de-lead'

// --- Lo que el drawer necesita de la base, en un viaje --------------------------------------------

export type OrigenDeLead = { id: string; clave: string; nombre: string }

// Lo que el alta sabe de un origen: su id y su nombre. La clave y el icono no viajan: el alta dibuja `<select>` y no los usa (la
// importación toma las claves de `leads_catalogos()`, `entities/importacion/contexto.ts`).
export type OrigenDelAlta = { id: string; nombre: string }

// Un tipo de lead que el alta ofrece: sólo los activos. La clase es lo que el sistema entiende; el nombre, lo que se lee.
export type TipoDeLeadEnAlta = {
  id: string
  nombre: string
  clase: ClaseDeTipoDeLead
}

// Un tipo de seguimiento que se ofrece al anotar: sólo los activos. La clave y el icono no se usan en un `<select>`.
export type TipoDeSeguimiento = { id: string; nombre: string }

// Hasta cuántos de cada catálogo lee el alta (el mismo tope de escribir: lo pone la base y la respuesta lo dice).
export type TopesDelAlta = { origenes: number; tipos: number; tiposDeSeguimiento: number }

export type ContextoDeAlta = {
  // El código de país de la empresa (`+` y 1 a 3 dígitos); sin él, el teléfono se pide con «+».
  telefonoCc: string | null
  // Sólo los activos, en su orden (a lo sumo `topes.origenes`).
  origenes: OrigenDelAlta[]
  // Sólo los activos, en su orden, y el que el alta propone (el primero activo de la clase prospecto: lo calcula la base).
  tipos: TipoDeLeadEnAlta[]
  tipoPorDefectoId: string | null
  tiposDeSeguimiento: TipoDeSeguimiento[]
  // El origen que esta persona usó la última vez, si sigue activo.
  ultimoOrigenId: string | null
  // El origen «por defecto» de la empresa (siempre activo): lo que se propone a quien no tiene un último origen activo.
  origenPorDefectoId: string | null
  topes: TopesDelAlta
  empresa: DatosDeLaEmpresa
}

const esquemaContexto = z.object({
  telefono_cc: z.string().nullable(),
  origenes: z.array(z.object({ id: z.guid(), nombre: z.string() })),
  tipos: z.array(z.object({ id: z.guid(), nombre: z.string(), clase: z.enum(CLASES_DE_TIPO) })),
  tipo_por_defecto_id: z.guid().nullable(),
  tipos_seguimiento: z.array(z.object({ id: z.guid(), nombre: z.string() })),
  ultimo_origen_id: z.guid().nullable(),
  origen_por_defecto_id: z.guid().nullable(),
  topes: z.object({
    origenes: z.number().int().positive(),
    tipos: z.number().int().positive(),
    tipos_seguimiento: z.number().int().positive(),
  }),
  empresa: z.object({ ciudad: z.string().nullable(), pais: z.string().nullable() }),
})

// El `jsonb` de `lead_alta_contexto()`.
export function contextoDeAltaDesde(crudo: unknown): ContextoDeAlta {
  const c = esquemaContexto.parse(crudo)
  return {
    telefonoCc: c.telefono_cc,
    origenes: c.origenes,
    tipos: c.tipos,
    tipoPorDefectoId: c.tipo_por_defecto_id,
    tiposDeSeguimiento: c.tipos_seguimiento.map((t) => ({ ...t })),
    ultimoOrigenId: c.ultimo_origen_id,
    origenPorDefectoId: c.origen_por_defecto_id,
    topes: {
      origenes: c.topes.origenes,
      tipos: c.topes.tipos,
      tiposDeSeguimiento: c.topes.tipos_seguimiento,
    },
    empresa: c.empresa,
  }
}

// El origen con que arranca un alta (o una importación): el último que usó la persona, mientras esté entre los activos; si no, el
// «por defecto» de la empresa; si tampoco, el primero activo, como siempre; sin ninguno activo, nada. Lo que la base entrega ya viene
// activo; mirar que esté en la lista cubre el que se apagó entre la lectura y hoy.
export function origenInicial(
  contexto: Pick<ContextoDeAlta, 'origenes' | 'ultimoOrigenId' | 'origenPorDefectoId'>,
): string | null {
  const ofrecido = (id: string | null) =>
    id !== null && contexto.origenes.some((origen) => origen.id === id) ? id : null
  return (
    ofrecido(contexto.ultimoOrigenId) ??
    ofrecido(contexto.origenPorDefectoId) ??
    contexto.origenes[0]?.id ??
    null
  )
}
