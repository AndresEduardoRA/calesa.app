// La forma de la plantilla de la tarjeta, espejo de `_plantilla_forma()` (20261106185900_plantilla_validar.sql:10-79; 4.19-2), en su orden: el primer rechazo
// manda y su `donde` es el de la base. Se valida lo que viaja: la entrada pasa por JSON (una propiedad `undefined` es una clave ausente; lo que no es JSON, como
// un nulo de SQL). Las claves de un objeto se leen con `Object.hasOwn`/`Object.keys`, nunca con `in` ni `obj[k]` sobre una ausente: `constructor` y `__proto__`
// son claves posibles.
import { rechazoDePlantilla, type RechazoDePlantilla } from './motivos-de-plantilla'
import {
  btrim,
  bytesComoJsonb,
  caracteres,
  compararComoC,
  ES_ID,
  esObjetoJsonb,
} from './json-de-la-base'

export type GrupoDePlantilla = { readonly grupo: string; readonly tono?: string }

// Las claves de `etiquetas` y `leyendas` son ids de nodo: se leen con `Object.hasOwn`.
export type Plantilla = {
  readonly grupos: readonly GrupoDePlantilla[]
  readonly etiquetas?: Readonly<Record<string, string>>
  readonly leyendas?: Readonly<Record<string, string>>
  readonly total: { readonly etiqueta: string; readonly leyenda?: string }
  readonly nota?: string
  readonly logo: boolean
  readonly columnas: {
    readonly leyenda: boolean
    readonly plazo: boolean
    readonly tipo_cambio: boolean
  }
}

export type ResultadoDeForma =
  { ok: true; plantilla: Plantilla } | { ok: false; error: RechazoDePlantilla }

type Objeto = Readonly<Record<string, unknown>>

const TOPE_EN_BYTES = 32768
const MAXIMO_DE_GRUPOS = 20
const MAXIMO_DE_CLAVES = 200
const CLAVES_DE_LA_RAIZ = new Set([
  'grupos',
  'etiquetas',
  'leyendas',
  'total',
  'nota',
  'logo',
  'columnas',
])
const COLUMNAS = ['leyenda', 'plazo', 'tipo_cambio']
// Etiquetas: de 1 a 60 caracteres (sin contar los espacios de los bordes para el mínimo); leyendas: de 0 a 160 (vacía = sin leyenda).
const DICCIONARIOS = [
  { nombre: 'etiquetas', minimo: 1, maximo: 60 },
  { nombre: 'leyendas', minimo: 0, maximo: 160 },
] as const

const forma = (donde: string) => rechazoDePlantilla('forma', donde)
const campo = (o: Objeto, k: string): unknown => (Object.hasOwn(o, k) ? o[k] : undefined)
const esId = (v: unknown) => typeof v === 'string' && ES_ID.test(v)
const textoEntre = (v: unknown, minimo: number, maximo: number) =>
  typeof v === 'string' && caracteres(btrim(v)) >= minimo && caracteres(v) <= maximo

// `JSON.stringify` lanza con un ciclo o un `BigInt` y da `undefined` con `undefined` o una función: los dos son lo que la base recibe como nulo.
function normalizar(entrada: unknown): unknown {
  try {
    const texto = JSON.stringify(entrada) as string | undefined
    return texto === undefined ? undefined : JSON.parse(texto)
  } catch {
    return undefined
  }
}

function revisarGrupos(grupos: unknown): RechazoDePlantilla | null {
  if (!Array.isArray(grupos) || grupos.length > MAXIMO_DE_GRUPOS) return forma('grupos')
  for (const [i, g] of grupos.entries()) {
    if (!esObjetoJsonb(g) || Object.keys(g).some((k) => k !== 'grupo' && k !== 'tono'))
      return forma(`grupos[${i}]`)
    if (!esId(campo(g, 'grupo'))) return forma(`grupos[${i}].grupo`)
    // Un `tono` presente (aunque sea `null`) tiene que ser un id: la base mira `?`, no el valor.
    if (Object.hasOwn(g, 'tono') && !esId(g['tono'])) return forma(`grupos[${i}].tono`)
  }
  return null
}

// Clave por clave en orden C, la forma de la clave y su texto juntos: `{"b": "", "c_Z": "x"}` da `etiquetas.b`.
function revisarDiccionarios(raiz: Objeto): RechazoDePlantilla | null {
  for (const { nombre, minimo, maximo } of DICCIONARIOS) {
    if (!Object.hasOwn(raiz, nombre)) continue
    const d = raiz[nombre]
    if (!esObjetoJsonb(d) || Object.keys(d).length > MAXIMO_DE_CLAVES) return forma(nombre)
    for (const k of Object.keys(d).sort(compararComoC)) {
      if (!ES_ID.test(k)) return forma(nombre)
      if (!textoEntre(d[k], minimo, maximo)) return forma(`${nombre}.${k}`)
    }
  }
  return null
}

function revisarTotal(total: unknown): RechazoDePlantilla | null {
  if (!esObjetoJsonb(total) || Object.keys(total).some((k) => k !== 'etiqueta' && k !== 'leyenda'))
    return forma('total')
  if (!textoEntre(campo(total, 'etiqueta'), 1, 40)) return forma('total.etiqueta')
  if (Object.hasOwn(total, 'leyenda') && !textoEntre(total['leyenda'], 0, 160))
    return forma('total.leyenda')
  return null
}

// Las tres columnas, exactamente, y booleanas.
function revisarColumnas(columnas: unknown): RechazoDePlantilla | null {
  if (!esObjetoJsonb(columnas)) return forma('columnas')
  const claves = Object.keys(columnas).sort(compararComoC)
  const exactas = claves.length === COLUMNAS.length && claves.every((k, i) => k === COLUMNAS[i])
  if (!exactas || Object.values(columnas).some((v) => typeof v !== 'boolean'))
    return forma('columnas')
  return null
}

function revisar(v: unknown): RechazoDePlantilla | null {
  if (!esObjetoJsonb(v) || bytesComoJsonb(v) > TOPE_EN_BYTES) return forma('definicion')
  const [deMas] = Object.keys(v)
    .filter((k) => !CLAVES_DE_LA_RAIZ.has(k))
    .sort(compararComoC)
  if (deMas !== undefined) return forma(deMas)
  const rechazo =
    revisarGrupos(campo(v, 'grupos')) ?? revisarDiccionarios(v) ?? revisarTotal(campo(v, 'total'))
  if (rechazo !== null) return rechazo
  if (Object.hasOwn(v, 'nota') && !textoEntre(v['nota'], 0, 300)) return forma('nota')
  if (typeof campo(v, 'logo') !== 'boolean') return forma('logo')
  return revisarColumnas(campo(v, 'columnas'))
}

export function formaDePlantilla(entrada: unknown): ResultadoDeForma {
  const v = normalizar(entrada)
  const error = revisar(v)
  // Lo que pasó `revisar()` tiene la forma de `Plantilla` (lo prueban F1–F15 y el juego).
  return error === null ? { ok: true, plantilla: v as Plantilla } : { ok: false, error }
}
