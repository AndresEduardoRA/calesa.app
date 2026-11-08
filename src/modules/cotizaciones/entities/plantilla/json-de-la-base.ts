// Lo que `validar_plantilla()` mira de un `jsonb`, contado como lo cuenta Postgres (4.19-2): el tipo (`jsonb_typeof`), los bytes del texto (`octet_length(x::text)`,
// el tope de 32 KB), los caracteres (`char_length`: code points, nunca unidades UTF-16), `btrim` (sólo espacios, no lo que quita `.trim()`) y el orden de
// `collate "C"` (por code point, igual que los bytes UTF-8: nunca `localeCompare` ni el `sort()` por defecto, que compara unidades UTF-16).

export type TipoJsonb = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

// `null` de JS es el `null` de JSON; `undefined` es una clave ausente (SQL nulo): `null` aquí.
export function tipoJsonb(v: unknown): TipoJsonb | null {
  if (v === undefined) return null
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  const t = typeof v
  return t === 'object' || t === 'string' || t === 'number' || t === 'boolean' ? t : null
}

export const esObjetoJsonb = (v: unknown): v is Readonly<Record<string, unknown>> =>
  tipoJsonb(v) === 'object'

// La forma de un id en la base (`^[a-z][a-z0-9_]{0,40}$`). En JS `$` sin `m` es el final del texto, como en Postgres.
export const ES_ID = /^[a-z][a-z0-9_]{0,40}$/

export const caracteres = (s: string): number => [...s].length

export const btrim = (s: string): string => s.replace(/^ +| +$/g, '')

export function compararComoC(a: string, b: string): number {
  const x = [...a]
  const y = [...b]
  const n = Math.min(x.length, y.length)
  for (let i = 0; i < n; i++) {
    const d = (x[i]?.codePointAt(0) ?? 0) - (y[i]?.codePointAt(0) ?? 0)
    if (d !== 0) return d
  }
  return x.length - y.length
}

export const clavesEnOrdenC = (o: Readonly<Record<string, unknown>> | undefined): string[] =>
  o === undefined ? [] : Object.keys(o).sort(compararComoC)

// El texto que da `jsonb::text`: `", "` entre elementos y entre pares, `": "` entre clave y valor, `{}` y `[]` sin espacio, y los textos escapados como en
// JSON (`JSON.stringify` escapa lo mismo que Postgres: `\"`, `\\`, `\b\f\n\r\t` y el resto de `< 0x20` como `\u00xx`; U+2028 y U+007F van tal cual). El
// orden de las claves no cambia la cuenta. Un número va como lo escribe JS (la base guarda su texto: `1.50`); en una plantilla un número siempre es `forma`.
// Recibe un valor ya normalizado como JSON (`JSON.parse`): sin `undefined`, funciones ni ciclos.
function textoJsonb(v: unknown): string {
  if (Array.isArray(v)) return v.length === 0 ? '[]' : `[${v.map(textoJsonb).join(', ')}]`
  if (esObjetoJsonb(v)) {
    const pares = Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${textoJsonb(x)}`)
    return pares.length === 0 ? '{}' : `{${pares.join(', ')}}`
  }
  return JSON.stringify(v)
}

const codificador = new TextEncoder()

export const bytesComoJsonb = (v: unknown): number => codificador.encode(textoJsonb(v)).length
