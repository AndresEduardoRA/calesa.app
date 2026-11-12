// Las menciones de un mensaje: un token `#[<tipo>:<uuid>]` en el cuerpo, el mismo que valida `mensaje_enviar` en la base. Se lee (7.10-1: partir el
// cuerpo en texto y menciones, sacar las referencias únicas) y se arma (7.10-2: de lo que se escribe en el redactor, `#Nombre`, al token). Puro, sin I/O.
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

// Lo que se ofrece en el selector: la referencia, su etiqueta (con el `#`, tal como queda en el campo) y un detalle para distinguir.
export type OpcionDeMencion = Referencia & { etiqueta: string; detalle: string | null }
// Lo ya elegido en el campo: la etiqueta con la que se escribió, para volverla token al enviar.
export type MencionElegida = Referencia & { etiqueta: string }

const LARGO_DE_ETIQUETA = 60
const CONSULTA = new RegExp(`(^|\\s)#([^\\s#[\\]]{0,${LARGO_DE_ETIQUETA}})$`, 'u')

// La consulta del `#` que se está escribiendo: sólo mira lo que hay antes del cursor. Abre con un `#` al inicio o tras un blanco, seguido
// de una palabra sola (D10); `texto` es lo escrito sin el `#`, e `inicio` dónde está el `#`.
export function consultaAbierta(
  texto: string,
  cursor: number,
): { inicio: number; texto: string } | null {
  const m = CONSULTA.exec(texto.slice(0, cursor))
  if (m === null) {
    return null
  }
  return { inicio: m.index + (m[1] ?? '').length, texto: m[2] ?? '' }
}

// `#` y el nombre con los blancos colapsados, recortado y cortado en 60; vacío usa la alternativa («Lead 124»).
export function etiquetaDeMencion(nombre: string, alternativa: string): string {
  const limpio = nombre.replace(/\s+/gu, ' ').trim().slice(0, LARGO_DE_ETIQUETA).trim()
  return `#${limpio === '' ? alternativa : limpio}`
}

// Dos referencias distintas con la misma etiqueta se distinguen con « (2)», « (3)»… sólo en el campo; el cuerpo guarda el token (D11).
export function etiquetaLibre(
  etiqueta: string,
  referencia: Referencia,
  elegidas: readonly MencionElegida[],
): string {
  const clave = claveDeReferencia(referencia)
  const propia = elegidas.find((e) => claveDeReferencia(e) === clave)
  if (propia !== undefined) {
    return propia.etiqueta
  }
  const usadas = new Set(elegidas.map((e) => e.etiqueta))
  let candidata = etiqueta
  for (let n = 2; usadas.has(candidata); n += 1) {
    candidata = `${etiqueta} (${n})`
  }
  return candidata
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

// Del texto del campo al cuerpo que se envía: cada etiqueta elegida e intacta pasa a `#[clase:id]` (la más larga primero; el `#` debe empezar
// el texto o seguir a un blanco y no puede seguirle una letra o un número). Una etiqueta que la persona editó queda como texto y no menciona.
// `menciones` sale del cuerpo final, así un token pegado a mano también cuenta y el conjunto coincide con el de la base; `demasiadas`: más de 20.
export function aCuerpoConTokens(
  texto: string,
  elegidas: readonly MencionElegida[],
): { cuerpo: string; menciones: Referencia[]; demasiadas: boolean } {
  let cuerpo = texto
  if (elegidas.length > 0) {
    const porEtiqueta = new Map(elegidas.map((e) => [e.etiqueta, e]))
    const etiquetas = [...porEtiqueta.keys()].sort((a, b) => b.length - a.length)
    const patron = new RegExp(
      `(?<!\\S)(?:${etiquetas.map(escapar).join('|')})(?![\\p{L}\\p{N}])`,
      'gu',
    )
    cuerpo = texto.replace(patron, (hallada) => {
      const e = porEtiqueta.get(hallada)
      return e === undefined ? hallada : `#[${e.clase}:${e.id.toLowerCase()}]`
    })
  }
  const unicas = new Map<string, Referencia>()
  for (const trozo of partirCuerpo(cuerpo)) {
    if (trozo.tipo === 'mencion') {
      unicas.set(claveDeReferencia(trozo), { clase: trozo.clase, id: trozo.id })
    }
  }
  return {
    cuerpo,
    menciones: [...unicas.values()],
    demasiadas: unicas.size > MAXIMO_DE_MENCIONES,
  }
}
