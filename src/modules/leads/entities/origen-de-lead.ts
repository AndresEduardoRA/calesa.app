import { z } from 'zod'

// El origen del lead (de dónde llegó), configurable en Configuración › Leads › Orígenes. Distinto de
// los orígenes de vehículos (`modules/origenes`). Estas reglas son espejo de `origen_lead_*()` y
// `_origen_lead_nombre()` (`…20261019000700_origenes_lead_configurables.sql`): la base las vuelve a
// decir, con estos mismos textos, si algo llega de otro lado.

export const TOPE_DE_ORIGENES_DE_LEAD = 100
export const LARGO_MAXIMO_DE_ORIGEN = 40

export const PANEL_NUEVO_ORIGEN = 'nuevo-origen'
export const PANEL_EDITAR_ORIGEN = 'editar-origen'
// El id del origen que se edita, en la URL: `?panel=editar-origen&origen=<id>`.
export const CLAVE_DE_ORIGEN = 'origen'

export type OrigenDeLeadConUso = {
  id: string
  clave: string
  nombre: string
  activo: boolean
  orden: number
  // La versión: editar, ordenar y eliminar la mandan.
  actualizadoEn: string
  // Algún lead lo usa (también en la papelera): entonces no se elimina, sólo se desactiva.
  conLeads: boolean
}

const filaDeOrigen = z.object({
  id: z.guid(),
  clave: z.string(),
  nombre: z.string(),
  activo: z.boolean(),
  orden: z.number(),
  actualizado_en: z.string().min(1),
  con_leads: z.boolean(),
})

export function listaDeOrigenesDesde(crudo: unknown): OrigenDeLeadConUso[] | null {
  const lista = z.array(filaDeOrigen).safeParse(crudo)
  if (!lista.success) {
    return null
  }
  return lista.data.map((fila) => ({
    id: fila.id,
    clave: fila.clave,
    nombre: fila.nombre,
    activo: fila.activo,
    orden: fila.orden,
    actualizadoEn: fila.actualizado_en,
    conLeads: fila.con_leads,
  }))
}

// Lo que responden las cuatro escrituras: la lista entera (a lo sumo 100) con las versiones nuevas.
export type RespuestaDeOrigenes = {
  // El origen que se creó, guardó o movió (nulo al eliminar).
  id: string | null
  // Repetir un pedido que ya estaba hecho: crear con el mismo id, o guardar lo que ya estaba guardado.
  repetido: boolean
  origenes: OrigenDeLeadConUso[]
}

const respuestaCruda = z.object({
  id: z.guid().optional(),
  repetido: z.boolean().optional(),
  sin_cambios: z.boolean().optional(),
  origenes: z.unknown(),
})

export function respuestaDeOrigenesDesde(crudo: unknown): RespuestaDeOrigenes | null {
  const respuesta = respuestaCruda.safeParse(crudo)
  if (!respuesta.success) {
    return null
  }
  const origenes = listaDeOrigenesDesde(respuesta.data.origenes)
  if (!origenes) {
    return null
  }
  return {
    id: respuesta.data.id ?? null,
    repetido: respuesta.data.repetido === true || respuesta.data.sin_cambios === true,
    origenes,
  }
}

// El nombre como lo guarda la base: sin espacios de más.
export function normalizarNombreDeOrigen(texto: string): string {
  return texto.replace(/\s+/gu, ' ').trim()
}

export const CLAVE_DEL_NOMBRE = 'nombre'

type Nombre = { ok: true; nombre: string } | { ok: false; motivo: string }

// `propio` es el origen que se está editando: su nombre no cuenta como repetido consigo mismo.
export function validarNombreDeOrigen(
  texto: string,
  origenes: readonly OrigenDeLeadConUso[],
  propio: string | null,
): Nombre {
  const nombre = normalizarNombreDeOrigen(texto)
  if (nombre === '') {
    return { ok: false, motivo: 'Escribe el nombre del origen.' }
  }
  if ([...nombre].length > LARGO_MAXIMO_DE_ORIGEN) {
    return {
      ok: false,
      motivo: `El nombre del origen admite hasta ${LARGO_MAXIMO_DE_ORIGEN} caracteres.`,
    }
  }
  const buscado = nombre.toLowerCase()
  if (origenes.some((origen) => origen.id !== propio && origen.nombre.toLowerCase() === buscado)) {
    return { ok: false, motivo: `Ya hay un origen «${nombre}».` }
  }
  return { ok: true, nombre }
}

export function alTopeDeOrigenes(origenes: readonly OrigenDeLeadConUso[]): boolean {
  return origenes.length >= TOPE_DE_ORIGENES_DE_LEAD
}

export const TEXTO_DEL_TOPE = `Llegaste al máximo de ${TOPE_DE_ORIGENES_DE_LEAD} orígenes. Elimina uno sin leads o desactiva los que no uses.`

export function motivoParaNoEliminar(origen: OrigenDeLeadConUso): string | null {
  return origen.conLeads
    ? `«${origen.nombre}» ya tiene leads: no se elimina. Desactívalo para que no se ofrezca a los nuevos.`
    : null
}

export function sinOrigenesActivos(origenes: readonly OrigenDeLeadConUso[]): boolean {
  return !origenes.some((origen) => origen.activo)
}

export const TEXTO_SIN_ORIGENES_ACTIVOS =
  'Ningún origen está activo: el alta guarda los leads sin origen y el campo sale apagado.'

export type Direccion = 'subir' | 'bajar'

// A dónde va un origen al subirlo o bajarlo un lugar, dicho como la base lo recibe: «después de X»
// (nulo = primero). Nulo si ya está en el extremo. La lista va en el orden en que se ve.
export function destinoDeOrigen(
  origenes: readonly OrigenDeLeadConUso[],
  id: string,
  direccion: Direccion,
): { despuesDe: string | null } | null {
  const lugar = origenes.findIndex((origen) => origen.id === id)
  if (lugar < 0) {
    return null
  }
  if (direccion === 'subir') {
    return lugar === 0 ? null : { despuesDe: origenes[lugar - 2]?.id ?? null }
  }
  const siguiente = origenes[lugar + 1]
  return siguiente ? { despuesDe: siguiente.id } : null
}

// «Web» quedó en el lugar 2 de 12: lo que anuncia el lector de pantalla al mover.
export function textoDelLugar(origenes: readonly OrigenDeLeadConUso[], id: string): string {
  const lugar = origenes.findIndex((origen) => origen.id === id)
  const origen = origenes[lugar]
  return origen ? `«${origen.nombre}» quedó en el lugar ${lugar + 1} de ${origenes.length}.` : ''
}

// Por qué `?panel=editar-origen&origen=<id>` no abre: el id no está (lo eliminó otra persona, o se
// escribió a mano).
export function motivoDeUrlDeOrigen(
  origenes: readonly OrigenDeLeadConUso[],
  id: string | null,
): string | null {
  if (id === null) {
    return 'Ese origen ya no existe.'
  }
  return origenes.some((origen) => origen.id === id) ? null : 'Ese origen ya no existe.'
}

export function origenPorId(
  origenes: readonly OrigenDeLeadConUso[],
  id: string | null,
): OrigenDeLeadConUso | null {
  return origenes.find((origen) => origen.id === id) ?? null
}

// Una firma de lo que trae la página: si cambia, la lista local se vuelve a sembrar.
export function firmaDeOrigenes(origenes: readonly OrigenDeLeadConUso[]): string {
  return origenes
    .map((o) => `${o.id}:${o.actualizadoEn}:${o.orden}:${o.activo ? 1 : 0}:${o.conLeads ? 1 : 0}`)
    .join('|')
}

// Por qué el modal de la URL no abre (nulo = abre): «Nuevo origen» en el tope de 100, o un origen que
// no está. Se mira una vez, al llegar.
export function motivoParaNoAbrir(
  origenes: readonly OrigenDeLeadConUso[],
  modo: 'nuevo' | 'editar' | null,
  id: string | null,
): string | null {
  if (modo === 'nuevo') {
    return alTopeDeOrigenes(origenes) ? TEXTO_DEL_TOPE : null
  }
  return modo === 'editar' ? motivoDeUrlDeOrigen(origenes, id) : null
}
