// El texto que la base no puede leer, atajado antes de llamarla (4.19-3a). Un `\u0000` y un surrogate suelto (medio emoji) son válidos en JS pero no en un `jsonb` ni en un
// `text` de Postgres: la base los rechaza al leer el JSON con un 22P02 o 22P05 técnico, que la persona no entiende. Se recorre con una pila y no con recursión: un pedido
// hostil con 100.000 niveles no revienta la pila, y un tope de profundidad protege el `JSON.stringify` (recursivo) que hace supabase-js después.

export type MotivoDeTextoDeLaBase = 'nulo' | 'surrogate' | 'profundo' | 'no_json'

// `donde` es la ruta en la notación de la base (`grupos[2].tono`, `etiquetas.flete`; la raíz, `definicion`). Nunca lleva el texto malo: el de una clave mala es la ruta del
// objeto que la tiene.
export type ProblemaDeTextoDeLaBase = {
  readonly donde: string
  readonly motivo: MotivoDeTextoDeLaBase
}

// La forma de la plantilla llega a 3 niveles (`definicion.etiquetas.<id>`); 8 deja holgura y corta lo hostil.
export const PROFUNDIDAD_MAXIMA = 8
const RAIZ = 'definicion'

// Un surrogate alto sin su bajo, o un bajo sin su alto.
const SURROGATE_SUELTO = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

function problemaDeUnaCadena(s: string): MotivoDeTextoDeLaBase | null {
  if (s.includes('\u0000')) return 'nulo'
  return SURROGATE_SUELTO.test(s) ? 'surrogate' : null
}

type Pendiente = { readonly valor: unknown; readonly ruta: string; readonly nivel: number }

const hijoDeObjeto = (ruta: string, clave: string) => (ruta === '' ? clave : `${ruta}.${clave}`)
const dondeDe = (ruta: string) => (ruta === '' ? RAIZ : ruta)

// `undefined` dentro de un objeto es una clave ausente y en un arreglo un `null`, como lo deja `JSON.stringify`; un `bigint`, una función, un símbolo o un número que no
// es finito no son JSON.
function problemaDeUnEscalar(v: unknown): MotivoDeTextoDeLaBase | null | 'sigue' {
  if (v === undefined || v === null || typeof v === 'boolean') return null
  if (typeof v === 'string') return problemaDeUnaCadena(v)
  if (typeof v === 'number') return Number.isFinite(v) ? null : 'no_json'
  return typeof v === 'object' ? 'sigue' : 'no_json'
}

// El primer problema en orden (profundidad primero, hijos en su orden), o nulo si todo se puede guardar.
export function revisarTextoParaLaBase(valor: unknown): ProblemaDeTextoDeLaBase | null {
  const pila: Pendiente[] = [{ valor, ruta: '', nivel: 0 }]
  for (let hecho = pila.pop(); hecho !== undefined; hecho = pila.pop()) {
    const { valor: v, ruta, nivel } = hecho
    const escalar = problemaDeUnEscalar(v)
    if (escalar !== 'sigue') {
      if (escalar !== null) return { donde: dondeDe(ruta), motivo: escalar }
      continue
    }
    if (nivel + 1 > PROFUNDIDAD_MAXIMA) return { donde: dondeDe(ruta), motivo: 'profundo' }
    const hijos = Array.isArray(v)
      ? v.map((x, i): [string, unknown] => [`${ruta}[${i}]`, x])
      : Object.entries(v as Record<string, unknown>).map(([k, x]): [string, unknown] => [
          hijoDeObjeto(ruta, k),
          x,
        ])
    if (!Array.isArray(v)) {
      const mala = Object.keys(v as object).find((k) => problemaDeUnaCadena(k) !== null)
      if (mala !== undefined) {
        return { donde: dondeDe(ruta), motivo: problemaDeUnaCadena(mala) ?? 'nulo' }
      }
    }
    for (let i = hijos.length - 1; i >= 0; i--) {
      const hijo = hijos[i]
      if (hijo !== undefined) pila.push({ valor: hijo[1], ruta: hijo[0], nivel: nivel + 1 })
    }
  }
  return null
}

export function mensajeDeTextoDeLaBase({ donde, motivo }: ProblemaDeTextoDeLaBase): string {
  if (motivo === 'no_json') return `Hay un valor que no se puede guardar en «${donde}».`
  if (motivo === 'profundo') return `Hay un valor demasiado anidado en «${donde}».`
  return `Hay un carácter que no se puede guardar en «${donde}».`
}
