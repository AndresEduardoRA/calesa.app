// El mínimo que pide una búsqueda libre para buscar por nombre (5a-8). Es un dato del esquema y no una función: el esquema cruza del
// servidor al navegador. Quien busca con menos no recorre nada: un término sin un tramo de letras o dígitos seguidos no tiene qué buscar
// en un índice de trigramas y la base lo resolvería caminando la cartera entera de quien busca (`docs/PLAN.md`, 5a-8).
export type MinimoDeBusqueda = {
  // Cuántas letras o dígitos seguidos tiene que tener lo escrito.
  letras: number
  // Un número (hasta 15 dígitos) vale con menos: se busca como número, no como nombre.
  numerosLibres: boolean
  // La línea que se ve junto al campo mientras lo escrito no alcanza.
  aviso: string
}

const NUMERO = /^\d{1,15}$/

// ¿Lo escrito alcanza para buscar? Espejo de `_leads_candidatos_indexable()` (`[[:alnum:]]{3}`): letras y dígitos decimales de cualquier alfabeto,
// seguidos (no `²` ni `½`: tampoco cuentan para la base). Un «#» delante no cuenta. Vacío no alcanza (no hay nada que buscar).
export function cumpleElMinimo(texto: string, minimo: MinimoDeBusqueda): boolean {
  const limpio = texto.trim().replace(/^#/, '').trim()
  if (limpio === '') {
    return false
  }
  if (minimo.numerosLibres && NUMERO.test(limpio)) {
    return true
  }
  return new RegExp(`[\\p{L}\\p{Nd}]{${String(minimo.letras)}}`, 'u').test(limpio)
}
