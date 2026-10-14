// De un texto a una clave interna: sin acentos, en minúsculas, con guion bajo y empezando con una
// letra (los CHECK de las claves). Las claves no cambian: los datos se guardan con ellas.
const ACENTOS = /\p{M}/gu

export type EstiloDeClave = {
  // Se antepone cuando lo que queda no empieza con una letra («3 puertas» → `o_3_puertas`).
  prefijo: string
  // Si no queda nada con sentido (al menos 2 caracteres).
  vacio: string
}

export function claveDeTexto(texto: string, largoMaximo: number, estilo: EstiloDeClave): string {
  const limpia = texto
    .normalize('NFD')
    .replace(ACENTOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const conLetra = /^[a-z]/.test(limpia) ? limpia : `${estilo.prefijo}${limpia}`
  const recortada = conLetra.slice(0, largoMaximo).replace(/_+$/, '')
  return recortada.length >= 2 ? recortada : estilo.vacio
}

// La clave de un campo nuevo sale de su etiqueta; si choca con una reservada o con otro campo se le
// agrega un sufijo.
export function claveDeCampo(
  etiqueta: string,
  existentes: readonly string[],
  reservadas: readonly string[],
  estilo: EstiloDeClave,
): string {
  const base = claveDeTexto(etiqueta, 36, estilo)
  const tomadas = new Set([...existentes, ...reservadas])
  if (!tomadas.has(base)) {
    return base
  }
  for (let n = 2; n < 100; n += 1) {
    const candidata = `${base}_${n}`
    if (!tomadas.has(candidata)) {
      return candidata
    }
  }
  return `${base}_${Date.now() % 100000}`
}
