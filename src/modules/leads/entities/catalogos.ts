import { z } from 'zod'
import type { OrigenConEstado } from './ficha'
import { CLASES_DE_TIPO, NOMBRE_DE_CLASE, type ClaseDeTipoDeLead } from './tipo-de-lead'

// Los catálogos con los que se nombra a un lead —su origen y su tipo—: de la base, también los apagados (un lead puede conservar
// uno desactivado y hay que seguir nombrándolo). Los entrega `leads_catalogos()` en un solo pedido: el listado, la ficha y la
// exportación lo leen sin sumar uno por catálogo. Ningún texto de la interfaz nombra un tipo: el nombre sale de la fila.

export type TipoDeLeadEnCatalogo = {
  id: string
  clave: string
  nombre: string
  // Lo único fijo: lo que el sistema entiende (prospecto o cliente), nunca el nombre ni la clave.
  clase: ClaseDeTipoDeLead
  // Una clave del catálogo de iconos, o nada (una que no se conoce se dibuja neutra).
  icono?: string | null
  activo: boolean
}

export type CatalogosDeLead = {
  origenes: OrigenConEstado[]
  tipos: TipoDeLeadEnCatalogo[]
}

const esquema = z.object({
  origenes: z.array(
    z.object({
      id: z.guid(),
      clave: z.string(),
      nombre: z.string(),
      icono: z.string().nullable(),
      activo: z.boolean(),
    }),
  ),
  tipos: z.array(
    z.object({
      id: z.guid(),
      clave: z.string(),
      nombre: z.string(),
      clase: z.enum(CLASES_DE_TIPO),
      icono: z.string().nullable(),
      activo: z.boolean(),
    }),
  ),
})

// El `jsonb` de `leads_catalogos()`; una forma rota es nula.
export function catalogosDeLeadDesde(crudo: unknown): CatalogosDeLead | null {
  const leido = esquema.safeParse(crudo)
  return leido.success ? leido.data : null
}

export function tipoDelCatalogo(
  tipos: readonly TipoDeLeadEnCatalogo[],
  id: string | null | undefined,
): TipoDeLeadEnCatalogo | null {
  return tipos.find((tipo) => tipo.id === id) ?? null
}

// El nombre con que se nombra el tipo de un lead; nulo si ya no está en el catálogo (no debería: la FK es `restrict`).
export function nombreDelTipo(
  tipos: readonly TipoDeLeadEnCatalogo[],
  id: string | null | undefined,
): string | null {
  return tipoDelCatalogo(tipos, id)?.nombre ?? null
}

// Lo que se dice del tipo apagado que un lead conserva.
export const SUFIJO_DE_INACTIVO = '(inactivo)'

// Los tipos que se ofrecen al elegir uno (el alta, la ficha): los activos, en el orden de la configuración, y —si el lead ya
// tiene uno apagado— ése, marcado, para poder conservarlo.
export function tiposOfrecidos(
  tipos: readonly TipoDeLeadEnCatalogo[],
  tipoActual: string | null,
): { id: string; nombre: string; activo: boolean }[] {
  return tipos
    .filter((tipo) => tipo.activo || tipo.id === tipoActual)
    .map(({ id, nombre, activo }) => ({ id, nombre, activo }))
}

// Las opciones del filtro del listado: primero los activos, en el orden de la configuración, y después los desactivados marcados
// «(inactivo)» (hay leads que todavía los tienen, y se filtran igual). El valor es la clave —la que lleva la URL, `?tipo=`—.
export function opcionesDeTipo(
  tipos: readonly TipoDeLeadEnCatalogo[],
): { valor: string; etiqueta: string }[] {
  const activos = tipos.filter((tipo) => tipo.activo)
  const apagados = tipos.filter((tipo) => !tipo.activo)
  return [
    ...activos.map((tipo) => ({ valor: tipo.clave, etiqueta: tipo.nombre })),
    ...apagados.map((tipo) => ({
      valor: tipo.clave,
      etiqueta: `${tipo.nombre} ${SUFIJO_DE_INACTIVO}`,
    })),
  ]
}

// De las claves de la URL a los ids que filtra la base. Una clave que ya no está (un enlace viejo) no suma nada.
export function idsDeLasClaves(
  tipos: readonly TipoDeLeadEnCatalogo[],
  claves: readonly string[],
): string[] {
  const buscadas = new Set(claves)
  return tipos.filter((tipo) => buscadas.has(tipo.clave)).map((tipo) => tipo.id)
}

// Cómo se dice la clase de un tipo junto a su nombre (la insignia de la lista de configuración).
export const nombreDeLaClase = (clase: ClaseDeTipoDeLead): string => NOMBRE_DE_CLASE[clase]

// Las claves de icono que las filas de una lista usan (el origen y el tipo de cada una), sin repetir ni contar las que no tienen: lo que monta el
// símbolo compartido del listado (`<SimbolosDeIconos>`).
export function iconosEnUso(
  filas: readonly { origenId: string | null; tipoLeadId: string | null }[],
  origenes: readonly { id: string; icono?: string | null }[],
  tipos: readonly { id: string; icono?: string | null }[],
): string[] {
  const claves = new Set<string>()
  const origenPorId = new Map(origenes.map((o) => [o.id, o.icono]))
  const tipoPorId = new Map(tipos.map((t) => [t.id, t.icono]))
  for (const fila of filas) {
    for (const icono of [
      origenPorId.get(fila.origenId ?? ''),
      tipoPorId.get(fila.tipoLeadId ?? ''),
    ]) {
      if (icono !== null && icono !== undefined && icono.trim() !== '') {
        claves.add(icono)
      }
    }
  }
  return [...claves]
}
