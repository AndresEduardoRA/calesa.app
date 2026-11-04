// Qué dejó una revisión, dicho en una línea (4.15-3b): los nodos que cambiaron (sus etiquetas), las columnas que se nombran y, si el nivel de quien mira lo deja ver, el total.
// Puro: el diff ya llega recortado por la base, así que lo que un nivel esconde no está acá y no se puede delatar. Ningún texto de la base se dibuja, salvo las etiquetas
// del diseño que quien mira ya ve.
import type { RevisionDeLaCotizacion } from './revisiones'

// Cuántos cambios se ven por revisión; el resto va como «y N más».
export const CAMBIOS_A_LA_VISTA = 3

export type CambiosDeLaRevision = {
  // Los primeros cambios, ya con su texto.
  vistos: string[]
  // Cuántos más hay en esta fila (un largo de lo que ya llegó, no un conteo de la base).
  masN: number
  total: { de: number; a: number } | null
  // Ni un cambio que nombrar ni un total: sólo cambió lo que quien mira no ve.
  sinCambios: boolean
}

const objeto = (valor: unknown): Record<string, unknown> | null =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null

// Las claves de `diff[columna].de` y `.a`.
function nodosDe(diff: Readonly<Record<string, unknown>>, columna: string): string[] {
  const lados = objeto(diff[columna])
  return ['de', 'a'].flatMap((lado) => Object.keys(objeto(lados?.[lado]) ?? {}))
}

const lado = (diff: Readonly<Record<string, unknown>>, columna: string) =>
  objeto(diff[columna])?.['a']

// Las columnas que se nombran, en este orden. `total_base`, `formula_id`, `estado`, `plantilla_id`, `moneda_mostrar` y lo demás no.
const COLUMNAS: readonly [string, (a: unknown) => string | null][] = [
  [
    'clase',
    (a) => (a === 'final' ? 'Pasó a final' : a === 'preventa' ? 'Volvió a preventa' : null),
  ],
  ['modo_tc', () => 'Cambió el modo de tipo de cambio'],
  [
    'ver_total_bs',
    (a) => (a === true ? 'Encendió «Ver total Bs»' : a === false ? 'Apagó «Ver total Bs»' : null),
  ],
  ['vehiculo_id', () => 'Cambió el vehículo'],
  ['lead_id', () => 'Cambió el cliente'],
  ['titulo', () => 'Cambió el título'],
  ['notas', () => 'Cambió las notas'],
  ['tipos_cambio', () => 'Cambió un tipo de cambio'],
  [
    'eliminado_en',
    (a) => (a === null || a === undefined ? 'Volvió de la papelera' : 'Fue a la papelera'),
  ],
]

function totalDe(diff: Readonly<Record<string, unknown>>): CambiosDeLaRevision['total'] {
  const totales = objeto(diff['totales'])
  const de = objeto(totales?.['de'])?.['usd']
  const a = objeto(totales?.['a'])?.['usd']
  return typeof de === 'number' && typeof a === 'number' ? { de, a } : null
}

export function cambiosDeLaRevision(
  diff: RevisionDeLaCotizacion['diff'],
  etiquetas: ReadonlyMap<string, string>,
): CambiosDeLaRevision {
  const nodos = [...new Set([...nodosDe(diff, 'valores'), ...nodosDe(diff, 'fuentes')])]
    .map((id) => etiquetas.get(id) ?? id)
    .sort((x, y) => x.localeCompare(y, 'es'))
    .map((etiqueta) => `Cambió «${etiqueta}»`)
  const columnas = COLUMNAS.flatMap(([columna, texto]) =>
    columna in diff ? [texto(lado(diff, columna))] : [],
  ).filter((texto) => texto !== null)
  const todos = [...nodos, ...columnas]
  const total = totalDe(diff)
  return {
    vistos: todos.slice(0, CAMBIOS_A_LA_VISTA),
    masN: Math.max(0, todos.length - CAMBIOS_A_LA_VISTA),
    total,
    sinCambios: todos.length === 0 && total === null,
  }
}
