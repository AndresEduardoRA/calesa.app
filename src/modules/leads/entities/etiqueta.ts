// Las etiquetas de una persona: privadas (nadie más las ve, ni compartiendo el lead), hasta 50,
// con un nombre de 1 a 30 que no se repite sin importar mayúsculas y un color de una paleta
// cerrada guardado como clave. Las reglas son el espejo de `etiqueta_crear|guardar` (la base
// decide; esto deja decirlo junto al campo antes de enviar).
import { TOPE_DEL_CONTEO, cantidadAcotada } from '@/shared/lib/conteo'
import { z } from 'zod'

// La paleta, en su orden. Espejo de `_etiquetas_paleta()` y del check `etiquetas_color_paleta`
// (un test compara los tres) y de los tokens `--etiqueta-<clave>` de `design/tokens.css`.
export const CLAVES_DE_COLOR = [
  'gris',
  'rojo',
  'naranja',
  'ambar',
  'verde',
  'turquesa',
  'azul',
  'violeta',
] as const
export type ColorDeEtiqueta = (typeof CLAVES_DE_COLOR)[number]

// Cómo se nombra cada color en la pantalla (el selector de color lo dice con texto).
export const NOMBRE_DEL_COLOR: Record<ColorDeEtiqueta, string> = {
  gris: 'Gris',
  rojo: 'Rojo',
  naranja: 'Naranja',
  ambar: 'Ámbar',
  verde: 'Verde',
  turquesa: 'Turquesa',
  azul: 'Azul',
  violeta: 'Violeta',
}

// «Gestionar etiquetas» en la URL (`?panel=etiquetas`), en la ficha y en el listado.
export const PANEL_ETIQUETAS = 'etiquetas'

export const LARGO_MAXIMO_DE_ETIQUETA = 30
export const MAXIMO_DE_ETIQUETAS = 50
export const MAXIMO_DE_ETIQUETAS_POR_LEAD = 20

export type Etiqueta = {
  id: string
  nombre: string
  color: ColorDeEtiqueta
  // La versión: renombrar, recolorear y eliminar la mandan.
  actualizadoEn: string
}

// Con a cuántos de los leads que quien mira ve está puesta («Gestionar» y el aviso al eliminar).
export type EtiquetaConUso = Etiqueta & { leads: number }

// Un color que la pantalla no conoce (una base más nueva) se dibuja gris: el nombre sigue.
const color = z.enum(CLAVES_DE_COLOR).catch('gris')

const esquemaEtiqueta = z.object({
  id: z.guid(),
  nombre: z.string().min(1),
  color,
  actualizado_en: z.string().min(1),
})

const esquemaConUso = esquemaEtiqueta.extend({ leads: z.number().int().nonnegative() })

function desdeFila(f: z.infer<typeof esquemaEtiqueta>): Etiqueta {
  return { id: f.id, nombre: f.nombre, color: f.color, actualizadoEn: f.actualizado_en }
}

// Una etiqueta como la entregan la tabla y las RPC. Lo que no cumple la forma es `null`.
export function etiquetaDesde(crudo: unknown): Etiqueta | null {
  const leida = esquemaEtiqueta.safeParse(crudo)
  return leida.success ? desdeFila(leida.data) : null
}

// Una lista: lo que no cumple la forma se descarta (no tumba la pantalla).
export function etiquetasDesde(crudo: unknown): Etiqueta[] {
  return Array.isArray(crudo)
    ? crudo.flatMap((una) => {
        const leida = etiquetaDesde(una)
        return leida ? [leida] : []
      })
    : []
}

export function etiquetasConUsoDesde(crudo: unknown): EtiquetaConUso[] {
  return Array.isArray(crudo)
    ? crudo.flatMap((una) => {
        const leida = esquemaConUso.safeParse(una)
        return leida.success ? [{ ...desdeFila(leida.data), leads: leida.data.leads }] : []
      })
    : []
}

// Por nombre, como las lee una persona («Ámbar» junto a «Azul»).
export function ordenarEtiquetas<T extends Etiqueta>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
}

// Las etiquetas de un lead (ids, como los entrega la vista), con su nombre y color, ordenadas. Un
// id que la lista no tiene (borrada en otra pestaña) no se dibuja.
export function etiquetasDelLead(ids: readonly string[], todas: readonly Etiqueta[]): Etiqueta[] {
  const puestas = new Set(ids)
  return ordenarEtiquetas(todas.filter((una) => puestas.has(una.id)))
}

// Sin acentos ni mayúsculas: «ambar» encuentra «Ámbar».
function plano(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()
}

// Las que contienen lo que se tipea en el selector, en el orden en que vienen.
export function filtrarEtiquetas<T extends Etiqueta>(lista: readonly T[], texto: string): T[] {
  const buscado = plano(texto)
  return buscado === '' ? [...lista] : lista.filter((una) => plano(una.nombre).includes(buscado))
}

export type MotivoDeEtiqueta = 'vacio' | 'largo' | 'repetido' | 'tope'

export const TEXTO_DEL_MOTIVO: Record<MotivoDeEtiqueta, string> = {
  vacio: 'Escribe un nombre.',
  largo: `El nombre de una etiqueta lleva hasta ${LARGO_MAXIMO_DE_ETIQUETA} caracteres.`,
  repetido: 'Ya tienes una etiqueta con ese nombre.',
  tope: `Puedes tener hasta ${MAXIMO_DE_ETIQUETAS} etiquetas. Elimina una para crear otra.`,
}

// La que ya tiene ese nombre, sin importar mayúsculas ni espacios de más.
export function etiquetaConNombre(
  nombre: string,
  lista: readonly Etiqueta[],
  exceptoId: string | null = null,
): Etiqueta | null {
  const buscado = nombre.trim().toLocaleLowerCase('es')
  return (
    lista.find((una) => una.id !== exceptoId && una.nombre.toLocaleLowerCase('es') === buscado) ??
    null
  )
}

// El nombre listo para enviar, o el motivo por el que la base lo rechazaría. Al renombrar se
// pasa la etiqueta (`exceptoId`): cambiarle sólo las mayúsculas a la misma vale, y no cuenta el tope.
export function validarNombreDeEtiqueta(
  crudo: string,
  lista: readonly Etiqueta[],
  exceptoId: string | null = null,
): { ok: true; nombre: string } | { ok: false; motivo: MotivoDeEtiqueta } {
  const nombre = crudo.trim()
  if (nombre.length === 0) {
    return { ok: false, motivo: 'vacio' }
  }
  if (nombre.length > LARGO_MAXIMO_DE_ETIQUETA) {
    return { ok: false, motivo: 'largo' }
  }
  if (etiquetaConNombre(nombre, lista, exceptoId)) {
    return { ok: false, motivo: 'repetido' }
  }
  if (exceptoId === null && lista.length >= MAXIMO_DE_ETIQUETAS) {
    return { ok: false, motivo: 'tope' }
  }
  return { ok: true, nombre }
}

// El color que tomaría una etiqueta nueva sin elegirlo: el menos usado, y entre los empatados el
// primero de la paleta. Espejo de `etiqueta_crear()`.
export function colorSugerido(lista: readonly Etiqueta[]): ColorDeEtiqueta {
  const usos = new Map<ColorDeEtiqueta, number>(CLAVES_DE_COLOR.map((clave) => [clave, 0]))
  for (const una of lista) {
    usos.set(una.color, (usos.get(una.color) ?? 0) + 1)
  }
  let mejor: ColorDeEtiqueta = CLAVES_DE_COLOR[0]
  for (const clave of CLAVES_DE_COLOR) {
    if ((usos.get(clave) ?? 0) < (usos.get(mejor) ?? 0)) {
      mejor = clave
    }
  }
  return mejor
}

// La lista con una etiqueta en su lugar (nueva, renombrada o recoloreada), o sin ella.
export function conEtiqueta<T extends Etiqueta>(lista: readonly T[], una: T): T[] {
  return lista.some((x) => x.id === una.id)
    ? lista.map((x) => (x.id === una.id ? una : x))
    : [...lista, una]
}

export function sinEtiqueta<T extends Etiqueta>(lista: readonly T[], id: string): T[] {
  return lista.filter((una) => una.id !== id)
}

// Qué dice la confirmación de eliminar: sin leads no se pide (se ofrece «Deshacer»).
export function textoDeEliminar(etiqueta: EtiquetaConUso, locale?: string): string {
  return `Se quita de ${usoDeEtiqueta(etiqueta, locale)}. No se puede deshacer.`
}

// A cuántos leads está puesta: la base cuenta hasta `TOPE_DEL_CONTEO + 1` (nunca el total exacto).
export function usoDeEtiqueta(etiqueta: EtiquetaConUso, locale?: string): string {
  return cantidadAcotada(
    etiqueta.leads,
    TOPE_DEL_CONTEO,
    { singular: 'lead', plural: 'leads' },
    { locale },
  )
}
