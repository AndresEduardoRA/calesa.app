// Las menciones de un mensaje (7.10-1): un token `#[<tipo>:<uuid>]` en el cuerpo, el mismo que valida `mensaje_enviar` en la base. Aquí sólo se
// lee: partir el cuerpo en texto y menciones, y sacar las referencias únicas. Puro, sin I/O.
export const CLASES_DE_MENCION = ['usuario', 'vehiculo', 'lead', 'cotizacion'] as const
export type ClaseDeMencion = (typeof CLASES_DE_MENCION)[number]

// La base rechaza más de 20 menciones por mensaje; al leer se ignora el resto.
export const MAXIMO_DE_MENCIONES = 20

export type Referencia = { clase: ClaseDeMencion; id: string }

export type Trozo =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'mencion'; clase: ClaseDeMencion; id: string; token: string }

// El mismo patrón que `mensaje_enviar` (sin distinguir mayúsculas en el uuid).
const PATRON = new RegExp(
  `#\\[(${CLASES_DE_MENCION.join('|')}):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\]`,
  'g',
)

// `<clase>:<id>`: la clave con la que se guarda lo resuelto de una referencia.
export function claveDeReferencia(r: Referencia): string {
  return `${r.clase}:${r.id}`
}

// El cuerpo en orden, sin perder ni repetir un carácter: lo que no es un token válido queda como texto (`#` suelto, `#[x]`, un tipo
// desconocido, un uuid mal formado). El id de una mención va en minúsculas, como lo guarda la base.
export function partirCuerpo(cuerpo: string): Trozo[] {
  const trozos: Trozo[] = []
  let desde = 0
  for (const m of cuerpo.matchAll(PATRON)) {
    const clase = m[1] as ClaseDeMencion
    const id = (m[2] ?? '').toLowerCase()
    if (m.index > desde) {
      trozos.push({ tipo: 'texto', texto: cuerpo.slice(desde, m.index) })
    }
    trozos.push({ tipo: 'mencion', clase, id, token: m[0] })
    desde = m.index + m[0].length
  }
  if (desde < cuerpo.length) {
    trozos.push({ tipo: 'texto', texto: cuerpo.slice(desde) })
  }
  return trozos
}

// Las referencias únicas por `(clase, id)`, en orden de aparición y hasta el máximo.
export function mencionesDelCuerpo(cuerpo: string): Referencia[] {
  const vistas = new Set<string>()
  const referencias: Referencia[] = []
  for (const trozo of partirCuerpo(cuerpo)) {
    if (trozo.tipo !== 'mencion') {
      continue
    }
    const referencia = { clase: trozo.clase, id: trozo.id }
    const clave = claveDeReferencia(referencia)
    if (!vistas.has(clave)) {
      vistas.add(clave)
      referencias.push(referencia)
    }
    if (referencias.length === MAXIMO_DE_MENCIONES) {
      break
    }
  }
  return referencias
}

// `?mencion=<clase>:<guid>` de la URL: nula si no es una referencia legible.
export function referenciaDeUrl(valor: string | null): Referencia | null {
  if (valor === null) {
    return null
  }
  const trozos = partirCuerpo(`#[${valor}]`)
  const unico = trozos.length === 1 ? trozos[0] : undefined
  return unico?.tipo === 'mencion' ? { clase: unico.clase, id: unico.id } : null
}
