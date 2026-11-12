// ¿El texto parece un teléfono? (7.13-2, D4). Puro. La búsqueda nunca es por teléfono (sería un oráculo de lo que la cartera ajena tiene cargado): si lo
// parece, la paleta no le pide nada a la sección de leads y dice «No se busca por teléfono». Un `#` delante es un número de lead y no un teléfono.
const SOLO_DIGITOS_Y_SEPARADORES = /^[\d\s+\-.()]+$/
const DIGITOS_DE_UN_TELEFONO = 7

export function pareceTelefono(texto: string): boolean {
  const recortado = texto.trim()
  if (!SOLO_DIGITOS_Y_SEPARADORES.test(recortado)) {
    return false
  }
  return recortado.replace(/\D/g, '').length >= DIGITOS_DE_UN_TELEFONO
}
